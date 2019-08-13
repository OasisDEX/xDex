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
  MTAccountState,
  MTHistoryEventKind,
  NonMarginableAsset,
  NonMarginableAssetCore,
  UserActionKind
} from './mtAccount';

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

  const availableActions = assetCoreAvailableActions(cash);

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

  while (collRatio.gt(ma.safeCollRatio) && cash.gt(zero) && sellOffers.length > 0) {
    const [bought, cashLeft, offersLeft] = eat(cash, sellOffers);
    sellOffers = offersLeft;
    amount = amount.plus(bought);
    purchasingPower = purchasingPower.plus(cash).minus(cashLeft);

    // safety condition:
    // amount * referencePrice / (debt + availableDebt) >= safeCollRatio
    // ergo:
    // availableDebt = amount * referencePrice / safeCollRatio - debt

    const availableDebt = amount.times(ma.referencePrice).div(ma.safeCollRatio).minus(debt);

    debt = debt.plus(availableDebt);
    collRatio = amount.times(ma.referencePrice).div(debt);

    cash = availableDebt;
  }

  return purchasingPower;
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

  console.log('ma.debt', ma.debt.toString());
  console.log('balanceInCash', balanceInCash.toString());
  const currentCollRatio = ma.debt.gt(0) ? balanceInCash.dividedBy(ma.debt) : undefined;
  const maxSafeLeverage = one.div(one.minus(one.div(ma.safeCollRatio)));
  const maxDebt = balanceInCash.div(ma.safeCollRatio);
  const availableDebt = BigNumber.max(zero, maxDebt.minus(ma.debt));

  console.log('liq price calc - min coll ratio', ma.minCollRatio);
  console.log('liq price calc - debt', ma.debt);
  console.log('liq price calc - balance', ma.balance);
  const liquidationPrice = ma.minCollRatio.times(ma.debt).div(ma.balance);

  const safe = currentCollRatio !== undefined ?
    currentCollRatio.gte(ma.safeCollRatio) : true;

  const biteLastIndex =
    findLastIndex(ma.history, e => e.kind === MTHistoryEventKind.bite);

  const dentLastIndex =
    findLastIndex(ma.history, e => e.kind === MTHistoryEventKind.dent);

  const liquidationInProgress = biteLastIndex >= 0 && biteLastIndex > dentLastIndex;

  const leverage = ma.balance.times(ma.referencePrice).div(ma.debt);
  // const realPurchasingPower = realPurchasingPowerMarginable(
  //   ma.safeCollRatio,
  //   ma.referencePrice,
  //   totalAvailableCash,
  //   sellOffers
  // );

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
