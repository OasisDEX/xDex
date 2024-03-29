/*
 * Copyright (C) 2020 Maker Ecosystem Growth Holdings, INC.
 */

import { BigNumber } from 'bignumber.js';
import { findLastIndex } from 'lodash';
import moment from 'moment';
import { Dictionary } from 'ramda';
import { nullAddress } from '../../blockchain/utils';
import { Offer, OfferType, Orderbook } from '../../exchange/orderbook/orderbook';
import { minusOne, one, zero } from '../../utils/zero';
import { buy, sellAll } from '../plan/planUtils';
import {
  MarginableAsset,
  MarginableAssetCore,
  MTAccount,
  MTAccountState,
  mtBitable,
  MTHistoryEvent,
  MTHistoryEventKind,
  MTLiquidationEvent,
  UserActionKind,
} from './mtAccount';
import { RawMTHistoryEvent } from './mtHistory';

const SAFE_COLL_RATIO_SELL = 1.65;

function marginableAvailableActions(asset: MarginableAssetCore) {
  const availableActions: UserActionKind[] = [];

  if (asset.allowance) {
    availableActions.push(UserActionKind.fund);
  }

  if (asset.balance.gt(zero)) {
    availableActions.push(UserActionKind.draw);
  }

  return availableActions;
}

export type PurchasingPower = [boolean, BigNumber];

export function realPurchasingPowerMarginable(ma: MarginableAssetCore, offers: Offer[]): PurchasingPower {
  let amount = ma.balance;
  let debt = ma.debt;
  let purchasingPower = zero;
  let cash = ma.dai;
  let first = true;
  const dust = ma.minDebt;
  while ((cash.gt(0.01) || first) && offers.length > 0) {
    const [bought, cashLeft, offersLeft] = buy(cash, offers, OfferType.buy);
    offers = offersLeft;
    amount = amount.plus(bought);
    purchasingPower = purchasingPower.plus(cash).minus(cashLeft);

    // safety condition:
    // amount * referencePrice / (debt + availableDebt) >= safeCollRatio
    // ergo:
    // availableDebt = amount * referencePrice / safeCollRatio - debt
    let availableDebt = amount.times(ma.referencePrice).div(ma.safeCollRatio).minus(debt);
    if (first && debt.eq(zero) && availableDebt.lte(dust)) {
      availableDebt = amount.times(ma.referencePrice).div(ma.minCollRatio).minus(debt);
      if (availableDebt.lte(dust)) {
        return [true, purchasingPower];
      }
    }
    debt = debt.plus(availableDebt);
    cash = availableDebt;
    first = false;
  }
  return [false, purchasingPower];
}

export function sellable(ma: MarginableAsset, offers: Offer[], amount: BigNumber): [boolean, any, BigNumber, string?] {
  let { balance, debt, dai } = ma;
  const { minCollRatio, referencePrice } = ma;
  let i = 0;
  const maxI = 10;
  const log: any = [];

  const dust = ma.minDebt;

  if (ma.debt.eq(zero)) {
    const sellResult = sellAll(BigNumber.min(balance, amount), offers);
    return [true, log, sellResult[0]];
  }

  if (amount.gt(balance)) {
    return [false, log, amount, 'Balance too low'];
  }

  while (amount.gt(zero) && i < maxI) {
    // payback dai debt with cash, take care of dust limit
    // debt - dDebt >= dust || debt - dDebt === 0
    const dDebt = dai.gte(debt) ? debt : BigNumber.min(dai, debt.minus(dust));

    if (dDebt.eq(zero) && dai.gt(zero)) {
      return [false, log, amount, "Can't jump over dust"];
    }

    debt = debt.minus(dDebt);
    dai = dai.minus(dDebt);

    // take out max coll
    // (balance - dBalance) * referencePrice / debt = minCollRatio
    // dBalance = balance - minCollRatio * debt / referencePrice;

    const dBalance = balance.minus(minCollRatio.times(debt).div(referencePrice));

    if (dBalance.lte(zero)) {
      return [false, log, amount, "Can't free collateral"];
    }

    // sell coll, increase sold and cash
    const [dSold, dDai, newOffers] = sellAll(BigNumber.min(dBalance, amount), offers);
    offers = newOffers;

    balance = balance.minus(dSold);
    log.push({ dSold, dDai, debt, balance });
    amount = amount.minus(dSold);
    dai = dai.plus(dDai);
    i += 1;
  }

  // console.log(JSON.stringify(log, null, ' '));

  if (amount.eq(zero) && i < maxI) {
    return [true, log, amount];
  }
  return [false, log, amount, 'Too many iterations'];
}

export function maxSellable(ma: MarginableAsset, offers: Offer[]) {
  let min = zero;
  let max = ma.balance;
  let r = max;
  const prec = new BigNumber('0.001').div(ma.referencePrice);
  while (max.minus(min).gt(prec)) {
    if (sellable(ma, offers, r)[0]) {
      min = r;
    } else {
      max = r;
    }
    r = max.plus(min).div(2);
  }

  const result = sellable(ma, offers, max)[0] ? max : min;

  // round to the nearest
  const rounded = BigNumber.min(ma.balance, new BigNumber(result.times(ma.referencePrice)).div(ma.referencePrice));

  return sellable(ma, offers, rounded)[0] ? rounded : result;
}

function findAuctionBite(rawHistory: RawMTHistoryEvent[], auctionId: number) {
  return rawHistory.filter((h: any) => {
    return h.kind === MTHistoryEventKind.bite && h.id === auctionId;
  })[0] as MTLiquidationEvent;
}

function findAuctionWinningLot(rawHistory: RawMTHistoryEvent[], auctionId: number) {
  let lot: BigNumber | undefined;
  rawHistory.forEach((h: any) => {
    if (h.id === auctionId && h.kind === MTHistoryEventKind.dent) {
      lot = h.lot;
    }
  });
  if (!lot) {
    rawHistory.forEach((h: any) => {
      if (h.id === auctionId && h.kind === MTHistoryEventKind.tend) {
        lot = h.lot;
      }
    });
  }

  return lot;
}

export function calculateMTHistoryEvents(rawHistory: RawMTHistoryEvent[], ma: MarginableAssetCore): MTHistoryEvent[] {
  let balance = zero;
  let cash = zero;
  let liquidationPrice = zero;
  let debt = zero;
  let equity = zero;

  const events = rawHistory.map((h) => {
    let event = { ...h, dAmount: zero, dDAIAmount: zero };
    if (h.kind === MTHistoryEventKind.adjust) {
      event = { ...h, token: ma.name, dAmount: h.dgem, dDAIAmount: h.ddai };
    }
    if (h.kind === MTHistoryEventKind.fundDai) {
      cash = cash.plus(h.amount);
      event = { ...h, token: ma.name, dDAIAmount: h.amount };
    }
    if (h.kind === MTHistoryEventKind.fundGem) {
      balance = balance.plus(h.amount);
      event = { ...h, token: ma.name, dAmount: h.amount };
    }
    if (h.kind === MTHistoryEventKind.drawGem) {
      balance = balance.minus(h.amount);
      event = { ...h, token: ma.name, dAmount: h.amount };
    }
    if (h.kind === MTHistoryEventKind.drawDai) {
      cash = cash.minus(h.amount);
      event = { ...h, token: ma.name, dDAIAmount: h.amount };
    }
    if (h.kind === MTHistoryEventKind.buy) {
      const priceDai = h.payAmount.div(h.amount);
      balance = balance.plus(h.amount);
      cash = cash.minus(h.payAmount);
      event = { ...h, priceDai, token: ma.name, dAmount: h.amount, dDAIAmount: h.payAmount };
    }
    if (h.kind === MTHistoryEventKind.sell) {
      const priceDai = h.payAmount.div(h.amount);
      balance = balance.minus(h.amount);
      cash = cash.plus(h.payAmount);
      event = { ...h, priceDai, token: ma.name, dAmount: h.amount, dDAIAmount: h.payAmount };
    }
    if (h.kind === MTHistoryEventKind.bite) {
      balance = balance.minus(h.ink);
      cash = cash.plus(h.tab);
    }
    if (h.kind === MTHistoryEventKind.dent) {
      const bite: MTLiquidationEvent = findAuctionBite(rawHistory, h.id);
      // @ts-ignore
      event = { ...h, token: ma.name, redeemable: bite.ink.minus(h.lot) };
    }

    if (h.kind === MTHistoryEventKind.deal) {
      const lot: BigNumber | undefined = findAuctionWinningLot(rawHistory, h.id);
      // @ts-ignore
      event = { ...h, token: ma.name, dAmount: lot };
    }

    if (h.kind === MTHistoryEventKind.redeem) {
      balance = balance.plus(h.amount);
      event = { ...h, token: ma.name, dAmount: h.amount };
    }
    if (h.kind === MTHistoryEventKind.bite) {
      event = { ...h, token: ma.name, dAmount: h.ink, dDAIAmount: h.tab };
    }

    const prevDebt = debt;
    debt = cash.lt(zero) ? cash.times(minusOne) : zero;

    if (h.kind === MTHistoryEventKind.fundDai) {
      const debtDelta = prevDebt.gt(h.amount) ? h.amount : prevDebt.gt(zero) ? prevDebt.minus(debt) : zero;

      if (debtDelta.gt(zero)) {
        event = { ...event, debtDelta };
      }
    } else if (h.kind === MTHistoryEventKind.bite) {
      const debtDelta = h.tab ? h.tab.times(minusOne) : zero;

      if (!debtDelta.eq(zero)) {
        event = { ...event, debtDelta };
      }
    } else {
      const debtDelta = prevDebt.minus(debt).times(minusOne);
      if (!debtDelta.isEqualTo(zero)) {
        event = { ...event, debtDelta };
      }
    }

    const prevLiquidationPrice = liquidationPrice;

    liquidationPrice = debt.gt(zero) && balance.gt(zero) ? ma.minCollRatio.times(debt).div(balance) : zero;
    event = { ...event, liquidationPrice };
    if (prevLiquidationPrice.gte(zero) && !liquidationPrice.isEqualTo(prevLiquidationPrice)) {
      const liquidationPriceDelta = prevLiquidationPrice.minus(liquidationPrice).times(minusOne);
      event = { ...event, liquidationPriceDelta };
    }

    equity = h.price && h.price.gt(zero) ? balance.times(h.price).plus(cash) : zero;

    return { ...event, balance, equity, daiBalance: cash };
  });

  return events;
}

function calculateMidpointPrice(ob: Orderbook) {
  if (ob.sell[0] && ob.buy[0] && ob.sell[0].price.gt(zero) && ob.buy[0].price.gt(zero)) {
    return ob.sell[0].price.plus(ob.buy[0].price).div(2);
  }
  return undefined;
}

export function calculateMarginable(ma: MarginableAssetCore, orderbook: Orderbook): MarginableAsset {
  const { debt, dai, balance } = ma;
  const [, purchasingPower] = realPurchasingPowerMarginable(ma, orderbook.sell);
  const midpointPrice = calculateMidpointPrice(orderbook);
  const equity =
    midpointPrice && midpointPrice.gt(zero) ? balance.times(midpointPrice).minus(debt).plus(dai) : undefined;
  const availableActions = marginableAvailableActions(ma);
  const balanceInCash = balance.times(ma.referencePrice);
  const balanceInDai = midpointPrice ? balance.times(midpointPrice) : undefined;
  const lockedBalance = BigNumber.min(balance, debt.div(ma.referencePrice).times(ma.safeCollRatio));
  const availableBalance = BigNumber.max(zero, balance.minus(lockedBalance));
  const currentCollRatio = debt.gt(0) ? balanceInCash.dividedBy(debt) : undefined;
  const maxSafeMultiply = one.div(one.minus(one.div(ma.safeCollRatio)));
  const maxDebt = balanceInCash.div(ma.safeCollRatio);
  const availableDebt = BigNumber.max(zero, maxDebt.minus(debt));

  const cash = balanceInCash.plus(dai);

  const liquidationPrice = debt.gt(zero) && balance.gt(zero) ? ma.minCollRatio.times(debt).div(balance) : zero;

  const FullHistory = calculateMTHistoryEvents(ma.rawHistory, ma);

  const hiddenEvents = [
    MTHistoryEventKind.adjust,
    MTHistoryEventKind.dent,
    MTHistoryEventKind.tend,
    MTHistoryEventKind.kick,
  ];

  const history = FullHistory.filter((h) => !hiddenEvents.includes(h.kind)).reverse();

  const safe = currentCollRatio !== undefined ? currentCollRatio.gte(ma.safeCollRatio) : true;

  const biteLastIndex = findLastIndex(history, (e) => e.kind === MTHistoryEventKind.bite);

  const dentLastIndex = findLastIndex(history, (e) => e.kind === MTHistoryEventKind.dent);

  const liquidationInProgress = biteLastIndex >= 0 && biteLastIndex > dentLastIndex;

  const multiple = ma.balance.times(ma.referencePrice).div(ma.balance.times(ma.referencePrice).minus(ma.debt));

  let runningAuctions = 0;
  ma.rawHistory.forEach((h) => {
    if (h.kind === MTHistoryEventKind.bite) {
      runningAuctions += 1;
    }
    if (h.kind === MTHistoryEventKind.deal) {
      runningAuctions -= 1;
    }
  });

  let amountBeingLiquidated = zero;
  ma.rawHistory.forEach((h) => {
    if (h.kind === MTHistoryEventKind.bite) {
      amountBeingLiquidated = amountBeingLiquidated.plus(h.ink);
    }
  });

  const ONE_HOUR = 60 * 60;
  const nowTs = Math.round(Date.now() / 1000);
  const lastUpdateTs = ma.zzz.toNumber();
  const priceUpdateDelta = (lastUpdateTs as number) + ONE_HOUR - nowTs;
  const nextPriceUpdateDelta = moment.utc(priceUpdateDelta * 1000).format('mm:ss');

  let bitable = mtBitable.no;
  if (ma.osmPriceNext && ma.osmPriceNext.lte(liquidationPrice)) {
    bitable = mtBitable.imminent;
  }

  if (ma.referencePrice.lte(liquidationPrice)) {
    bitable = mtBitable.yes;
  }

  if (priceUpdateDelta <= 0 && ma.osmPriceNext && ma.osmPriceNext.lte(liquidationPrice)) {
    bitable = mtBitable.yes;
  }

  let priceDropWarning = false;
  if (
    ma.osmPriceNext &&
    ma.osmPriceNext.gt(liquidationPrice) &&
    ma.referencePrice.gt(liquidationPrice) &&
    midpointPrice &&
    midpointPrice.gt(zero) &&
    midpointPrice.lt(liquidationPrice)
  ) {
    priceDropWarning = true;
  }

  const fee = ma.fee.times(100);
  const liquidationPenalty = ma.liquidationPenalty.gt(zero) ? ma.liquidationPenalty.minus(1).times(100) : zero;
  const isSafeCollRatio = !(currentCollRatio && currentCollRatio.lt(SAFE_COLL_RATIO_SELL));
  const markPrice = ma.osmPriceNext ? ma.osmPriceNext : zero;

  return {
    ...ma,
    availableActions,
    balanceInCash,
    balanceInDai,
    midpointPrice,
    cash,
    maxDebt,
    availableDebt,
    currentCollRatio,
    maxSafeMultiply,
    liquidationPrice,
    markPrice,
    multiple,
    lockedBalance,
    availableBalance,
    safe,
    liquidationInProgress,
    history,
    bitable,
    runningAuctions,
    amountBeingLiquidated,
    nextPriceUpdateDelta,
    purchasingPower,
    equity,
    fee,
    liquidationPenalty,
    isSafeCollRatio,
    priceDropWarning,
  };
}

export function calculateMTAccount(
  proxy: any,
  masCore: MarginableAssetCore[],
  daiAllowance: boolean,
  orderbooks: Dictionary<Orderbook>,
): MTAccount {
  const totalDebt = masCore.reduce((debt, ma) => debt.plus(ma.debt), zero);
  const marginableAssets = masCore.map((ma) => calculateMarginable(ma, orderbooks[ma.name]));

  const totalAvailableDebt = marginableAssets.reduce((debt, ma) => debt.plus(ma.availableDebt), zero);
  const totalMAValue = marginableAssets.reduce((t, ma) => t.plus(ma.balanceInCash), zero);
  const totalAssetValue = totalMAValue; // .plus(totalNMAValue); // .plus(cashCore.balance);

  return {
    proxy,
    marginableAssets,
    totalAssetValue,
    totalDebt,
    totalAvailableDebt,
    daiAllowance,
    state: proxy.options.address === nullAddress ? MTAccountState.notSetup : MTAccountState.setup,
  };
}
