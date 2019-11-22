import { BigNumber } from 'bignumber.js';

import { findLastIndex } from 'lodash';
import { nullAddress } from '../../blockchain/utils';
import { Offer } from '../../exchange/orderbook/orderbook';
import { minusOne, one, zero } from '../../utils/zero';
import { buy } from '../plan/planUtils';
import {
  CashAsset,
  CashAssetCore,
  Core, MarginableAsset,
  MarginableAssetCore,
  MTAccount,
  MTAccountState, mtBitable, MTHistoryEvent,
  MTHistoryEventKind, MTLiquidationEvent,
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
  const [, cashLeft] = buy(cashAvailable, sellOffers);
  return cashAvailable.minus(cashLeft);
}

// export function realPurchasingPowerMarginable2(
//   ma: MarginableAsset,
//   sellOffers: Offer[]
// ): BigNumber {
//   Object.assign(window, { ma });
//   let amount = ma.balance; // TODO: rename totalAmount -> currentAmount
//   const referencePrice = ma.referencePrice;
//   let debt = ma.debt;
//   let purchasingPower = zero;
//   let collRatio = amount.times(ma.referencePrice).div(debt);
//   let availableDebt = amount.times(referencePrice).div(ma.safeCollRatio).minus(debt);
//   let cash = ma.dai;
//
//   if (cash.gt(zero)) {
//     const [bought, cashLeft, offersLeft] = buy(cash, sellOffers);
//     sellOffers = offersLeft;
//     amount = amount.plus(bought);
//     purchasingPower = purchasingPower.plus(cash).minus(cashLeft);
//     availableDebt = amount.times(referencePrice).div(ma.safeCollRatio).minus(debt);
//   }
//
//   let isSafe = debt.gt(zero) ? collRatio.gt(ma.safeCollRatio) : true;
//
//   cash = availableDebt;
//   while (isSafe && cash.gt(one) && sellOffers.length > 0) {
//     console.log(
//       purchasingPower.toString(),
//       isSafe,
//       cash.toString(),
//       sellOffers.length,
//       collRatio.toString()
//     );
//
//     const [bought, cashLeft, offersLeft] = buy(cash, sellOffers);
//     sellOffers = offersLeft;
//     amount = amount.plus(bought);
//     purchasingPower = purchasingPower.plus(cash).minus(cashLeft);
//
//     // safety condition:
//     // amount * referencePrice / (debt + availableDebt) >= safeCollRatio
//     // ergo:
//     // availableDebt = amount * referencePrice / safeCollRatio - debt
//
//     debt = debt.plus(cash.minus(cashLeft));
//     availableDebt = amount.times(referencePrice).div(ma.safeCollRatio).minus(debt);
//     collRatio = amount.times(referencePrice).div(debt);
//     cash = availableDebt;
//
//     isSafe = debt.gt(zero) ? collRatio.gt(ma.safeCollRatio) : true;
//   }
//
//   return purchasingPower;
// }

export function realPurchasingPowerMarginable(
  ma: MarginableAsset,
  offers: Offer[]
): BigNumber {
  let amount = ma.balance; // TODO: rename totalAmount -> currentAmount
  let debt = ma.debt;
  let purchasingPower = zero;
  let cash = ma.dai;
  let first = true;

  while ((cash.gt(0.01) || first) && offers.length > 0) {
    first = false;
    const [bought, cashLeft, offersLeft] = buy(cash, offers);
    offers = offersLeft;
    amount = amount.plus(bought);
    purchasingPower = purchasingPower.plus(cash).minus(cashLeft);

    // safety condition:
    // amount * referencePrice / (debt + availableDebt) >= safeCollRatio
    // ergo:
    // availableDebt = amount * referencePrice / safeCollRatio - debt

    const availableDebt = amount.times(ma.referencePrice).div(ma.safeCollRatio).minus(debt);

    debt = debt.plus(availableDebt);
    cash = availableDebt;
  }
  return purchasingPower;
}

function findAuctionBite(rawHistory: RawMTHistoryEvent[], auctionId: number) {
  return rawHistory.filter((h: any) => {
    return h.kind === MTHistoryEventKind.bite && h.id === auctionId;
  })[0] as MTLiquidationEvent;
}

export function calculateMTHistoryEvents(
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
    let event = { ...h, dAmount: zero, dDAIAmount: zero };
    if (h.kind === MTHistoryEventKind.adjust) {
      event = { ...h, token: ma.name, dAmount: h.dgem, dDAIAmount: h.ddai };
    }
    if (h.kind === MTHistoryEventKind.fundDai) {
      cash = cash.plus(h.amount);
      equityCash = equityCash.plus(h.amount);
      event = { ...h, token: ma.name, dDAIAmount: h.amount };
    }
    if (h.kind === MTHistoryEventKind.fundGem) {
      balance = balance.plus(h.amount);
      equity = equity.plus(h.amount);
      event = { ...h, token: ma.name, dAmount: h.amount };
    }
    if (h.kind === MTHistoryEventKind.drawGem) {
      balance = balance.minus(h.amount);
      equity = equity.minus(h.amount);
      event = { ...h, token: ma.name, dAmount: h.amount };
    }
    if (h.kind === MTHistoryEventKind.drawDai) {
      cash = cash.minus(h.amount);
      equityCash = equityCash.minus(h.amount);
      event = { ...h, token: ma.name, dDAIAmount: h.amount };
    }
    if (h.kind === MTHistoryEventKind.buyLev) {
      const priceDai = h.payAmount.div(h.amount);
      balance = balance.plus(h.amount);
      cash = cash.minus(h.payAmount);
      event = { ...h, priceDai, token: ma.name, dAmount: h.amount, dDAIAmount: h.payAmount };
    }
    if (h.kind === MTHistoryEventKind.sellLev) {
      const priceDai = h.payAmount.div(h.amount);
      balance = balance.minus(h.amount);
      cash = cash.plus(h.payAmount);
      event = { ...h, priceDai, token: ma.name, dAmount: h.amount, dDAIAmount: h.payAmount };
    }
    if (h.kind === MTHistoryEventKind.dent) {
      const bite: MTLiquidationEvent = findAuctionBite(rawHistory, h.id);
      // @ts-ignore
      event = { ...h, token: ma.name, redeemable: bite.lot.minus(h.lot) };
    }
    if (h.kind === MTHistoryEventKind.redeem) {
      event = { ...h, token: ma.name, redeemable: h.amount.times(-1), };
    }
    if (h.kind === MTHistoryEventKind.bite) {
      event = { ...h, token: ma.name, dAmount: h.lot, };
    }

    const prevDebt = debt;
    debt = cash.lt(zero) ? cash.times(minusOne) : zero;

    if (h.kind === MTHistoryEventKind.fundDai) {
      const debtDelta = prevDebt.gt(h.amount) ? h.amount :
        prevDebt.gt(zero) ? prevDebt.minus(debt) : zero;

      if (debtDelta.gt(zero)) {
        event = { ...event, debtDelta };
      }
    } else {
      const debtDelta = prevDebt.minus(debt).times(minusOne);
      if (!debtDelta.isEqualTo(zero)) {
        event = { ...event, debtDelta };
      }
    }

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

  const FullHistory = calculateMTHistoryEvents(ma.rawHistory, ma);

  const hiddenEvents = [
    MTHistoryEventKind.adjust,
    MTHistoryEventKind.tend,
    MTHistoryEventKind.deal,
    MTHistoryEventKind.kick,
  ];

  const history = FullHistory.filter(h => !hiddenEvents.includes(h.kind)).reverse();

  const safe = currentCollRatio !== undefined ?
    currentCollRatio.gte(ma.safeCollRatio) : true;

  const biteLastIndex =
    findLastIndex(history, e => e.kind === MTHistoryEventKind.bite);

  const dentLastIndex =
    findLastIndex(history, e => e.kind === MTHistoryEventKind.dent);

  const liquidationInProgress = biteLastIndex >= 0 && biteLastIndex > dentLastIndex;

  const leverage = ma.balance.times(ma.referencePrice)
    .div(ma.balance.times(ma.referencePrice).minus(ma.debt));

  let bitable = mtBitable.no;
  if (ma.nextPrice.lte(liquidationPrice)) {
    bitable = mtBitable.imminent;
  }

  if (ma.referencePrice.lte(liquidationPrice)) {
    bitable = mtBitable.yes;
  }
  const runningAuctions = 2;

  let amountBeingLiquidated = zero;
  ma.rawHistory.forEach(h => {
    if (h.kind === MTHistoryEventKind.bite) {
      amountBeingLiquidated = amountBeingLiquidated.plus(h.lot);
    }
  });

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
    history,
    bitable,
    runningAuctions,
    amountBeingLiquidated,
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
): MTAccount {

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
    state: proxy.address === nullAddress ? MTAccountState.notSetup : MTAccountState.setup,
    cash: calculateCash(cashCore),
  };
}
