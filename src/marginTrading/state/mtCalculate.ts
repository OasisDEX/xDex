import { BigNumber } from 'bignumber.js';
import { findLastIndex } from 'lodash';
import * as moment from 'moment';
import { Dictionary } from 'ramda';
import { nullAddress } from '../../blockchain/utils';
import { Offer, Orderbook } from '../../exchange/orderbook/orderbook';
import { minusOne, one, zero } from '../../utils/zero';
import { buy, sellAll } from '../plan/planUtils';
import {
  MarginableAsset,
  MarginableAssetCore,
  MTAccount,
  MTAccountState, mtBitable, MTHistoryEvent,
  MTHistoryEventKind, MTLiquidationEvent,
  UserActionKind
} from './mtAccount';
import { RawMTHistoryEvent } from './mtHistory';

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

export function realPurchasingPowerMarginable(
  ma: MarginableAssetCore,
  offers: Offer[]
): BigNumber {
  let amount = ma.balance;
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

export function sellable(
  ma: MarginableAsset,
  offers: Offer[],
  amount: BigNumber
): [boolean, any] {
  let { balance, debt, dai } = ma;
  const { minCollRatio, referencePrice } = ma;
  let i = 0;
  const maxI = 10;
  const log = [];
  while (amount.gt(zero) && i < maxI) {

    // payback dai debt with cash
    const dDebt = BigNumber.min(dai, debt);
    debt = debt.minus(dDebt);
    dai = dai.minus(dDebt);

    // take out max coll
    // (balance - dBalance) * referencePrice / debt = minCollRatio
    // dBalance = balance - minCollRatio * debt / referencePrice;

    const dBalance = balance.minus(minCollRatio.times(debt).div(referencePrice));
    if (dBalance.lte(zero)) {
      return [false, log];
    }

    // sell coll, increase sold and cash
    const [dSold, dDai, newOffers] = sellAll(dBalance, offers);
    offers = newOffers;

    log.push({ dSold, dDai });

    balance = balance.minus(dSold);
    amount = amount.minus(dSold);
    dai = dai.plus(dDai);
    i += 1;
  }

  return [amount.eq(zero) && i < maxI, log];
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
      event = { ...h, token: ma.name, redeemable: bite.ink.minus(h.lot) };
    }
    if (h.kind === MTHistoryEventKind.redeem) {
      event = { ...h, token: ma.name, redeemable: h.amount.times(minusOne), };
    }
    if (h.kind === MTHistoryEventKind.bite) {
      event = { ...h, token: ma.name, dAmount: h.ink.times(minusOne), dDAIAmount: h.tab };
    }

    const prevDebt = debt;
    debt = cash.lt(zero) ? cash.times(minusOne) : zero;

    if (h.kind === MTHistoryEventKind.fundDai) {
      const debtDelta = prevDebt.gt(h.amount) ? h.amount :
        prevDebt.gt(zero) ? prevDebt.minus(debt) : zero;

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
    liquidationPrice = ma.minCollRatio.times(debt).div(balance);

    if (prevLiquidationPrice.gt(zero) && !liquidationPrice.isEqualTo(prevLiquidationPrice)) {
      const liquidationPriceDelta = prevLiquidationPrice.minus(liquidationPrice).times(minusOne);
      event = { ...event, liquidationPriceDelta };
    }

    return event;
  });

  return events;
}

function calculateMidpointPrice(ob: Orderbook) {
  if (ob.sell[0] && ob.buy[0] && ob.sell[0].price.gt(zero) && ob.buy[0].price.gt(zero)) {
    return (ob.sell[0].price.plus(ob.buy[0].price)).div(2);
  }
  return zero;
}

export function calculateMarginable(
  ma: MarginableAssetCore,
  orderbook: Orderbook,
): MarginableAsset {
  const purchasingPower = realPurchasingPowerMarginable(ma, orderbook.sell);
  const midpointPrice = calculateMidpointPrice(orderbook);
  const equity = midpointPrice.gt(zero) ?
    ma.balance.times(midpointPrice).minus(ma.debt).plus(ma.dai) : zero;
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
  if (ma.osmPriceNext && ma.osmPriceNext.lte(liquidationPrice)) {
    bitable = mtBitable.imminent;
  }

  if (ma.referencePrice.lte(liquidationPrice)) {
    bitable = mtBitable.yes;
  }
  const runningAuctions = 2;

  let amountBeingLiquidated = zero;
  ma.rawHistory.forEach(h => {
    if (h.kind === MTHistoryEventKind.bite) {
      amountBeingLiquidated = amountBeingLiquidated.plus(h.ink);
    }
  });

  const lastPriceUpdate = moment.unix(ma.zzz.toNumber());
  const duration = moment.duration(lastPriceUpdate.add(1, 'hours').diff(moment(new Date())));
  const nextPriceUpdateDelta = moment.utc(duration.asMilliseconds()).format('HH:mm');

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
    nextPriceUpdateDelta,
    purchasingPower,
    equity
  };
}

export function calculateMTAccount(
  proxy: any,
  masCore: MarginableAssetCore[],
  daiAllowance: boolean,
  orderbooks: Dictionary<Orderbook>,
): MTAccount {

  const totalDebt = masCore.reduce((debt, ma) => debt.plus(ma.debt), zero);

  const marginableAssets = masCore.map(
    ma => calculateMarginable(ma, orderbooks[ma.name])
  );

  const totalAvailableDebt =
    marginableAssets.reduce((debt, ma) => debt.plus(ma.availableDebt), zero);

  const totalMAValue = marginableAssets.reduce((t, ma) => t.plus(ma.balanceInCash), zero);

  const totalAssetValue = totalMAValue; // .plus(totalNMAValue); // .plus(cashCore.balance);

  return {
    proxy,
    marginableAssets,
    totalAssetValue,
    totalDebt,
    totalAvailableDebt,
    daiAllowance,
    state: proxy.address === nullAddress ? MTAccountState.notSetup : MTAccountState.setup,
  };
}
