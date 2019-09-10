import { BigNumber } from 'bignumber.js';

import { findLastIndex } from 'lodash';
import { Offer } from '../../exchange/orderbook/orderbook';
import { minusOne, one, zero } from '../../utils/zero';
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

export function realPurchasingPowerMarginable(
  ma: MarginableAsset,
  sellOffers: Offer[]
): BigNumber {
  Object.assign(window, { ma });
  let amount = ma.balance; // TODO: rename totalAmount -> currentAmount
  const referencePrice = ma.referencePrice;
  let debt = ma.debt;
  let purchasingPower = zero;
  let collRatio = amount.times(ma.referencePrice).div(debt);
  let availableDebt = amount.times(referencePrice).div(ma.safeCollRatio).minus(debt);
  let cash = ma.dai;

  if (cash.gt(zero)) {
    const [bought, cashLeft, offersLeft] = eat(cash, sellOffers);
    sellOffers = offersLeft;
    amount = amount.plus(bought);
    purchasingPower = purchasingPower.plus(cash).minus(cashLeft);
    availableDebt = amount.times(referencePrice).div(ma.safeCollRatio).minus(debt);
  }

  let isSafe = debt.gt(zero) ? collRatio.gt(ma.safeCollRatio) : true;

  cash = availableDebt;
  while (isSafe && cash.gt(zero) && sellOffers.length > 0) {
    const [bought, cashLeft, offersLeft] = eat(cash, sellOffers);
    sellOffers = offersLeft;
    amount = amount.plus(bought);
    purchasingPower = purchasingPower.plus(cash).minus(cashLeft);

    // safety condition:
    // amount * referencePrice / (debt + availableDebt) >= safeCollRatio
    // ergo:
    // availableDebt = amount * referencePrice / safeCollRatio - debt

    debt = debt.plus(cash.minus(cashLeft));
    availableDebt = amount.times(referencePrice).div(ma.safeCollRatio).minus(debt);
    collRatio = amount.times(referencePrice).div(debt);
    cash = availableDebt;

    isSafe = debt.gt(zero) ? collRatio.gt(ma.safeCollRatio) : true;
    if (cash.lt(new BigNumber(0.001))) {
      isSafe = false;
    }

    // console.log(
    //   amount.toString(),
    //   cash.toString(),
    //   collRatio.toString(),
    //   sellOffers.length
    // );
  }

  return purchasingPower;
}
// export function realPurchasingPowerMarginable(
//   ma: MarginableAsset,
//   initialCash: BigNumber,
//   sellOffers: Offer[]
// ): BigNumber {
//
//   const referencePrice = ma.referencePrice;
//
//   console.log('PURCHASPOW START CALC --------------------------------------------');
//   console.log('PURCHASPOW ma', ma);
//   console.log('PURCHASPOW initial cash', initialCash.toString());
//   console.log('PURCHASPOW debt', ma.debt.toString());
//   let amount = ma.balance || zero; // TODO: rename totalAmount -> currentAmount
//   let debt = ma.debt;
//   let purchasingPower = zero;
//   let collRatio = amount.times(ma.referencePrice).div(debt);
//   let cash = ma.balanceInCash.plus(ma.dai);
//   let dai = ma.dai;
//   console.log('PURCHASPOW  dai', ma.dai.toString());
//   console.log('PURCHASPOW init cash', initialCash.toString());
//   console.log('PURCHASPOW collRatio', collRatio!.toString());
//   console.log('PURCHASPOW safeCollRatio', ma.safeCollRatio!.toString());
//
//   let isSafe = debt.gt(zero) ? collRatio.gt(ma.safeCollRatio) : true;
//   while (isSafe && cash.gt(zero) && sellOffers.length > 0) {
//   // why cash should be > 0?
//   // let isSafe = debt.gt(zero) ? collRatio.gt(ma.safeCollRatio) : true;
//   //
//   // if (cash.isEqualTo(zero)) {
//   //   return purchasingPower;
//   // }
//
//   // console.log('PURCHASPOW @@@ isSafe', isSafe);
//   // while (isSafe && sellOffers.length > 0) {
//     const [bought, cashLeft, offersLeft] = eat(cash, sellOffers);
//     sellOffers = offersLeft;
//     console.log('PURCHASPOW bought', bought.toString());
//     console.log('PURCHASPOW cashLeft', cashLeft.toString());
//     amount = amount.plus(bought);
//     purchasingPower = purchasingPower.plus(cash).minus(cashLeft);
//
//     // safety condition:
//     // amount * referencePrice / (debt + availableDebt) >= safeCollRatio
//     // ergo:
//     // availableDebt = amount * referencePrice / safeCollRatio - debt
//
//     const availableDebt = amount.times(referencePrice).div(ma.safeCollRatio).minus(debt);
//
//     collRatio = amount.times(referencePrice).div(debt);
//
//     // if (dai.gt(zero)) {
//     //   dai = zero;
//     // } else {
//     debt = debt.plus(availableDebt);
//     // }
//
//     console.log('PURCHASPOW dai CALC', debt.toString(), dai.toString());
//
//     console.log('PURCHASPOW iter debt', debt.toString());
//     console.log('PURCHASPOW iter collRatio', collRatio.toString());
//     isSafe = debt.gt(zero) ? collRatio.gt(ma.safeCollRatio) : true;
//
//     console.log('PURCHASPOW availableDebt', availableDebt.toString());
//     cash = availableDebt;
//
//     console.log('PURCHASPOW isSafe after', isSafe);
//     console.log(
//       amount.toString(),
//       cash.toString(),
//       collRatio.toString(),
//       sellOffers.length
//     );
//
//   }
//
//   return purchasingPower;
// }

function calculateMTHistoryEvents(
  rawHistory: RawMTHistoryEvent[],
  ma: MarginableAssetCore
): MTHistoryEvent[] {

  let balance = zero;
  let cash = zero;
  let liquidationPrice = zero;
  let debt = zero;
  let equity = zero;
  let equityCash = zero;

  const events = rawHistory.map(h => {
    // console.log('calc history balance', balance.toString());
    // console.log('calc history cash', cash.toString());
    // console.log('calc history', h);
    let event = { ...h, dAmount: zero, dDAIAmount: zero };
    if (h.kind === MTHistoryEventKind.adjust) {
      event = { ...h, displayName: '--adjust--', dAmount: h.dgem, dDAIAmount: h.ddai };
    }
    if (h.kind === MTHistoryEventKind.fundDai) {
      cash = cash.plus(h.amount);
      equityCash = equityCash.plus(h.amount);
      event = { ...h, displayName: 'Deposit', dDAIAmount: h.amount };
    }
    if (h.kind === MTHistoryEventKind.fundGem) {
      balance = balance.plus(h.amount);
      equity = equity.plus(h.amount);
      event = { ...h, displayName: 'Deposit', dAmount: h.amount };
    }
    if (h.kind === MTHistoryEventKind.drawGem) {
      balance = balance.minus(h.amount);
      equity = equity.minus(h.amount);
      event = { ...h, displayName: 'Withdraw', dAmount: h.amount };
    }
    if (h.kind === MTHistoryEventKind.drawDai) {
      cash = cash.minus(h.amount);
      equityCash = equityCash.minus(h.amount);
      event = { ...h, displayName: 'Withdraw', dAmount: h.amount };
    }
    if (h.kind === MTHistoryEventKind.buyLev) {
      const priceDai = h.payAmount.div(h.amount);
      balance = balance.plus(h.amount);
      cash = cash.minus(h.payAmount);
      event = { ...h, priceDai, displayName: 'Buy', dAmount: h.amount, dDAIAmount: h.payAmount };
    }
    if (h.kind === MTHistoryEventKind.sellLev) {
      const priceDai = h.payAmount.div(h.amount);
      balance = balance.minus(h.amount);
      cash = cash.plus(h.payAmount);
      event = { ...h, priceDai, displayName: 'Sell', dAmount: h.amount, dDAIAmount: h.payAmount };
    }

    const prevDebt = debt;
    debt = cash.lt(zero) ? cash.times(minusOne) : zero;
    const debtDelta = prevDebt.minus(debt).times(minusOne);
    if (!debtDelta.isEqualTo(zero)) {
      event = { ...event, debtDelta };
    }

    // console.log('calc history equity', equity.toString());
    // console.log('calc history equityCash', equityCash.toString());

    const prevLiquidationPrice = liquidationPrice;
    liquidationPrice = ma.minCollRatio.times(debt).div(balance);
    if (!liquidationPrice.isEqualTo(prevLiquidationPrice)) {
      const liquidationPriceDelta = prevLiquidationPrice.minus(liquidationPrice).times(minusOne);
      event = { ...event, liquidationPriceDelta };
    }

    return event;
  });

  return events;
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
  const currentCollRatio = ma.debt.gt(0) ? balanceInCash.dividedBy(ma.debt) : undefined;
  const maxSafeLeverage = one.div(one.minus(one.div(ma.safeCollRatio)));
  const maxDebt = balanceInCash.div(ma.safeCollRatio);
  const availableDebt = BigNumber.max(zero, maxDebt.minus(ma.debt));

  const cash = balanceInCash.plus(ma.dai);
  const liquidationPrice = ma.minCollRatio.times(ma.debt).div(ma.balance);

  const history = calculateMTHistoryEvents(ma.rawHistory, ma);

  const safe = currentCollRatio !== undefined ?
    currentCollRatio.gte(ma.safeCollRatio) : true;

  const biteLastIndex =
    findLastIndex(history, e => e.kind === MTHistoryEventKind.bite);

  const dentLastIndex =
    findLastIndex(history, e => e.kind === MTHistoryEventKind.dent);

  const liquidationInProgress = biteLastIndex >= 0 && biteLastIndex > dentLastIndex;

  // console.log('LEVERAGE ma.balance', ma.balance.toString());
  // console.log('LEVERAGE ma.referencePrice', ma.referencePrice.toString());
  // console.log('LEVERAGE ma.debt', ma.debt.toString());
  const leverage = ma.balance.times(ma.referencePrice)
    .div(ma.balance.times(ma.referencePrice).minus(ma.debt));

  return {
    ...ma,
    availableActions,
    balanceInCash,
    cash,
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
