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
  NonMarginableAsset,
  NonMarginableAssetCore,
  UserActionKind
} from './mtAccount';
import { MTHistoryEventKind } from './mtHistory';

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

export function realPurchasingPowerMarginable(
  ma: MarginableAsset,
  cashAvailable: BigNumber,
  sellOffers: Offer[]
): BigNumber {
  console.log('cashAvailable', cashAvailable.toString(), one.div(ma.safeCollRatio).toString());
  cashAvailable = cashAvailable.times(one.div(one.minus(one.div(ma.safeCollRatio))));
  const [, cashLeft] = eat(cashAvailable, sellOffers);
  return cashAvailable.minus(cashLeft);
}

// export function calculateRealPurchasingPower(
//   safeCollRatio: BigNumber,
//   referencePrice: BigNumber,
//   cashAvailable: BigNumber,
//   sellOffers: Offer[]
// ): BigNumber {
//   let purchasingPower = zero;
//   while (cashAvailable.gt(zero) && sellOffers.length > 0) {
//     const [bought, cashLeft, offersLeft] = eat(cashAvailable, sellOffers);
//     purchasingPower = purchasingPower.plus(cashAvailable).minus(cashLeft);
//     cashAvailable = bought.times(referencePrice).div(safeCollRatio);
//     sellOffers = offersLeft;
//   }
//   return purchasingPower;
// }

export function calculateMarginable(
  ma: MarginableAssetCore,
  totalAvailableCash: BigNumber = zero,
  cash: BigNumber = zero
  // sellOffers: Offer[] = []
): MarginableAsset {

  const availableActions = marginableAvailableActions(ma);
  const balanceInCash = ma.balance.times(ma.referencePrice);
  const lockedBalance = BigNumber.min(
    ma.balance,
    ma.debt.div(ma.referencePrice).times(ma.safeCollRatio)
  );
  const availableBalance = BigNumber.max(zero, ma.balance.minus(lockedBalance));

  const currentCollRatio = ma.debt.gt(0) ? balanceInCash.dividedBy(ma.debt) : undefined;
  const maxSafeLeverage = one.div(one.minus(one.div(ma.safeCollRatio)));
  const maxDebt = balanceInCash.div(ma.safeCollRatio);
  const availableDebt = BigNumber.max(zero, maxDebt.minus(ma.debt));

  const liquidationPrice = ma.minCollRatio.times(ma.debt).div(ma.balance);

  const purchasingPower = totalAvailableCash.times(maxSafeLeverage);
  const lonelyPurchasingPower = cash.plus(availableDebt.times(maxSafeLeverage));

  const safe = currentCollRatio !== undefined ?
    currentCollRatio.gte(ma.safeCollRatio) : true;

  const biteLastIndex =
    findLastIndex(ma.history, e => e.kind === MTHistoryEventKind.bite);

  const dentLastIndex =
    findLastIndex(ma.history, e => e.kind === MTHistoryEventKind.dent);

  const liquidationInProgress = biteLastIndex >= 0 && biteLastIndex > dentLastIndex;

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
    purchasingPower,
    lonelyPurchasingPower,
    maxSafeLeverage,
    liquidationPrice,
    lockedBalance,
    availableBalance,
    safe,
    liquidationInProgress,
  };
}

function calculateNonMarginable(
  asset: NonMarginableAssetCore,
  totalAvailableCash: BigNumber = zero,
  cash: BigNumber = zero
) : NonMarginableAsset {

  const availableActions = assetCoreAvailableActions(asset);
  const balanceInCash = asset.balance.times(asset.referencePrice);
  const purchasingPower = totalAvailableCash;
  const lonelyPurchasingPower = cash;
  return {
    ...asset,
    availableActions,
    balanceInCash,
    purchasingPower,
    lonelyPurchasingPower
  };
}

export function calculateMTAccount(
  proxy: any,
  cashCore: CashAssetCore,
  masCore: MarginableAssetCore[],
  nmasCore: NonMarginableAssetCore[]
): MTAccountSetup {

  // cashCore = { ...cashCore, balance: new BigNumber('10000') };
  //
  const totalDebt = masCore.reduce((debt, ma) => debt.plus(ma.debt), zero);

  const totalAvailableCash = masCore.reduce(
    (total, ma) =>
      BigNumber.max(zero, ma.balance
      .times(ma.referencePrice)
      .div(ma.safeCollRatio)
      .minus(ma.debt))
      .plus(total),
    zero
  ).plus(cashCore.balance);

  const marginableAssets = masCore.map(
    ma => calculateMarginable(ma, totalAvailableCash, cashCore.balance)
  );

  const totalAvailableDebt =
    marginableAssets.reduce((debt, ma) => debt.plus(ma.availableDebt), zero);

  const nonMarginableAssets = nmasCore.map(
    nma => calculateNonMarginable(nma, totalAvailableCash, cashCore.balance)
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
