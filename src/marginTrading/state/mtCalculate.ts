import { BigNumber } from 'bignumber.js';

import { findLastIndex } from 'lodash';
import { Offer } from '../../exchange/orderbook/orderbook';
import { one, zero } from '../../utils/zero';
import { eat } from '../plan/planUtils';
import {
  CashAsset,
  CashAssetCore,
  Core, MarginableAsset,
  MarginableAssetCore,
  MTAccountSetup,
  MTAccountState, MTHistoryEvent,
  MTHistoryEventKind,
  NonMarginableAsset,
  NonMarginableAssetCore,
  UserActionKind
} from './mtAccount';
import { RawMTHistoryEvent } from './mtHistory';

function assetCoreAvailableActions(asset: Core) {
  const availableActions: UserActionKind[] = [];

  if (asset.allowance && asset.walletBalance.gt(zero)) {
    availableActions.push(UserActionKind.fund);
  }

  if (asset.balance.gt(zero)) {
    availableActions.push(UserActionKind.draw);
  }

  return availableActions;
}

function assetCashAvailableActions(_asset: CashAssetCore) {
  return [UserActionKind.fund, UserActionKind.draw];
}

function marginableAvailableActions(asset: MarginableAssetCore) {
  const availableActions: UserActionKind[] = [];

  if (asset.allowance && asset.walletBalance.gt(zero)) {
    availableActions.push(UserActionKind.fund);
  }

  if (asset.balance.gt(zero)) {
    availableActions.push(UserActionKind.draw);
  }

  return availableActions;
}

function calculateCash(cash: CashAssetCore): CashAsset {

  const availableActions = assetCashAvailableActions(cash);

  return {
    ...cash,
    availableActions,
  };
}

export function realPurchasingPowerNonMarginable(
  cashAvailable: BigNumber,
  sellOffers: Offer[]
) {
  const [, cashLeft] = eat(cashAvailable, sellOffers);
  return cashAvailable.minus(cashLeft);
}

// export function realPurchasingPowerMarginable(
//   ma: MarginableAsset,
//   cashAvailable: BigNumber,
//   sellOffers: Offer[]
// ): BigNumber {
//   console.log('cashAvailable', cashAvailable.toString(), one.div(ma.safeCollRatio).toString());
//   cashAvailable = cashAvailable.times(one.div(one.minus(one.div(ma.safeCollRatio))));
//   const [, cashLeft] = eat(cashAvailable, sellOffers);
//   return cashAvailable.minus(cashLeft);
// }

export function realPurchasingPowerMarginable(
  ma: MarginableAsset,
  initialCash: BigNumber,
  sellOffers: Offer[]
): BigNumber {
  let amount = ma.balance; // TODO: rename totalAmount -> currentAmount
  let debt = ma.debt;
  let purchasingPower = zero;
  let collRatio = amount.times(ma.referencePrice).div(debt);
  let cash = initialCash;

  // while (collRatio.gt(ma.safeCollRatio) && cash.gt(zero) && sellOffers.length > 0) {
  // why cash should be > 0?
  while (collRatio.gt(ma.safeCollRatio) && sellOffers.length > 0) {
    const [bought, cashLeft, offersLeft] = eat(cash, sellOffers);
    sellOffers = offersLeft;
    amount = amount.plus(bought);
    purchasingPower = purchasingPower.plus(cash).minus(cashLeft);

    // safety condition:
    // amount * referencePrice / (debt + availableDebt) >= safeCollRatio
    // ergo:
    // availableDebt = amount * referencePrice / safeCollRatio - debt

    const availableDebt = amount.times(ma.referencePrice).div(ma.safeCollRatio).minus(debt);

    collRatio = amount.times(ma.referencePrice).div(debt);

    debt = debt.plus(availableDebt);

    cash = availableDebt;

    console.log(
      amount.toString(),
      cash.toString(),
      collRatio.toString(),
      sellOffers.length
    );
  }

  return purchasingPower;
}

function calculateMTHistoryEvents(rawHistory: RawMTHistoryEvent[]): MTHistoryEvent[] {
  // TODO: implement
  return rawHistory.map(h => {

    console.log('calc history', h);
    if (h.kind === MTHistoryEventKind.adjust) {
      return { ...h, dAmount: h.dgem, dDAIAmount: h.ddai };
    }
    if (h.kind === MTHistoryEventKind.buyLev) {
      return { ...h, dAmount: h.amount, dDAIAmount: h.payAmount };
    }
    return { ...h, dAmount: zero, dDAIAmount: zero };
  });
}

export function calculateMarginable(
  ma: MarginableAssetCore,
): MarginableAsset {

  const availableActions = marginableAvailableActions(ma);
  const balanceInCash = ma.balance.times(ma.referencePrice);
  const lockedBalance = BigNumber.min(
    ma.balance,
    ma.debt.div(ma.referencePrice).times(ma.safeCollRatio)
  );
  const availableBalance = BigNumber.max(zero, ma.balance.minus(lockedBalance));

  console.log('ma.balance', ma.balance.toString());
  console.log('lockedBalance', lockedBalance.toString());
  console.log('ma.debt', ma.debt.toString());
  console.log('balanceInCash', balanceInCash.toString());
  const currentCollRatio = ma.debt.gt(0) ? balanceInCash.dividedBy(ma.debt) : undefined;
  const maxSafeLeverage = one.div(one.minus(one.div(ma.safeCollRatio)));
  const maxDebt = balanceInCash.div(ma.safeCollRatio);
  const availableDebt = BigNumber.max(zero, maxDebt.minus(ma.debt));

  const liquidationPrice = ma.minCollRatio.times(ma.debt).div(ma.balance);

  const history = calculateMTHistoryEvents(ma.rawHistory);

  const safe = currentCollRatio !== undefined ?
    currentCollRatio.gte(ma.safeCollRatio) : true;

  const biteLastIndex =
    findLastIndex(history, e => e.kind === MTHistoryEventKind.bite);

  const dentLastIndex =
    findLastIndex(history, e => e.kind === MTHistoryEventKind.dent);

  const liquidationInProgress = biteLastIndex >= 0 && biteLastIndex > dentLastIndex;

  const leverage = ma.balance.times(ma.referencePrice)
    .div(ma.balance.times(ma.referencePrice).minus(ma.debt));

  return {
    ...ma,
    availableActions,
    balanceInCash,
    maxDebt,
    availableDebt,
    currentCollRatio,
    maxSafeLeverage,
    liquidationPrice,
    leverage,
    lockedBalance,
    availableBalance,
    safe,
    liquidationInProgress,
    history
  };
}

function calculateNonMarginable(
  asset: NonMarginableAssetCore,
  // totalAvailableCash: BigNumber = zero,
  // cash: BigNumber = zero
) : NonMarginableAsset {

  const availableActions = assetCoreAvailableActions(asset);
  const balanceInCash = asset.balance.times(asset.referencePrice);

  return {
    ...asset,
    availableActions,
    balanceInCash,
  };
}

export function calculateMTAccount(
  proxy: any,
  cashCore: CashAssetCore,
  masCore: MarginableAssetCore[],
  nmasCore: NonMarginableAssetCore[]
): MTAccountSetup {

  const totalDebt = masCore.reduce((debt, ma) => debt.plus(ma.debt), zero);

  const marginableAssets = masCore.map(
    ma => calculateMarginable(ma)
  );

  const totalAvailableDebt =
    marginableAssets.reduce((debt, ma) => debt.plus(ma.availableDebt), zero);

  const nonMarginableAssets = nmasCore.map(
    nma => calculateNonMarginable(nma)
  );

  const totalMAValue = marginableAssets.reduce((t, ma) => t.plus(ma.balanceInCash), zero);
  const totalNMAValue = nonMarginableAssets.reduce((t, ma) => t.plus(ma.balanceInCash), zero);
  const totalAssetValue = totalMAValue.plus(totalNMAValue).plus(cashCore.balance);

  return {
    proxy,
    marginableAssets,
    nonMarginableAssets,
    totalAssetValue,
    totalDebt,
    totalAvailableDebt,
    state: MTAccountState.setup,
    cash: calculateCash(cashCore),
  };
}
