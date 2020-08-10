/*
 * Copyright (C) 2020 Maker Ecosystem Growth Holdings, INC.
 */

import { isEqual } from 'lodash';
import { curry } from 'ramda';
import * as React from 'react';
import { BehaviorSubject, combineLatest, interval, Observable, of } from 'rxjs';
import { distinctUntilChanged, filter, first, flatMap, map, mergeMap, shareReplay, switchMap } from 'rxjs/operators';
import { trackingEvents } from './analytics/analytics';
import {
  Balances,
  createAllowances$,
  createBalances$,
  createCombinedBalances,
  createDustLimits$,
  createProxyAllowances$,
  createTokenBalances$,
  createWalletApprove,
  createWalletDisapprove,
} from './balances/balances';
import { createBalancesView$ } from './balances/mtBalancesView';
import { createTaxExport$ } from './balances/taxExporter';
import { calls$, readCalls$ } from './blockchain/calls/calls';
import {
  account$,
  allowance$,
  context$,
  daiPriceUsd$,
  etherBalance$,
  etherPriceUsd$,
  gasPrice$,
  initializedAccount$,
  onEveryBlock$,
  tokenPricesInUSD$,
} from './blockchain/network';
import { user$ } from './blockchain/user';
import { loadOrderbook$, Orderbook } from './exchange/orderbook/orderbook';
import {
  createTradingPair$,
  currentTradingPair$,
  loadablifyPlusTradingPair,
  memoizeTradingPair,
} from './exchange/tradingPair/tradingPair';

import { BigNumber } from 'bignumber.js';
import { transactions$, TxState } from './blockchain/transactions';
import {
  createAllTrades$,
  createTradesBrowser$,
  loadAllTrades,
  loadPriceDaysAgo,
  loadVolumeForThePastDay,
} from './exchange/allTrades/allTrades';
import { createDepthChartWithLoading$ } from './exchange/depthChart/DepthChartWithLoading';
import {
  createCurrentPrice$,
  createDailyVolume$,
  createMarketDetails$,
  createYesterdayPrice$,
  createYesterdayPriceChange$,
} from './exchange/exchange';
import { createMyClosedTrades$ } from './exchange/myTrades/closedTrades';
import { createMyCurrentTrades$, createMyTrades$, createMyTradesKind$ } from './exchange/myTrades/myTrades';
import { aggregateMyOpenTradesFor$, createMyOpenTrades$ } from './exchange/myTrades/openTrades';
import { createFormController$, OfferFormState } from './exchange/offerMake/offerMake';
import { createOrderbookForView } from './exchange/orderbook/OrderbookView';
import { createOrderbookPanel$ } from './exchange/OrderbookPanel';
import { GroupMode, loadAggregatedTrades, PriceChartDataPoint } from './exchange/priceChart/pricechart';
import { createPriceChartLoadable$ } from './exchange/priceChart/PriceChartWithLoading';
import { createFormController$ as createInstantFormController$ } from './instant/instantForm';
import { createExchangeMigration$, createMigrationOps$ } from './migration/migration';
import { createMigrationForm$, MigrationFormKind } from './migration/migrationForm';

import { createMTMyPositionView$ } from './marginTrading/positions/MTMyPositionView';
import { createMTSimpleOrderForm$, createRiskComplianceProbe$ } from './marginTrading/simple/mtOrderForm';
import { createMTProxyApprove, MTAccount, MTAccountState } from './marginTrading/state/mtAccount';
import { createMta$ } from './marginTrading/state/mtAggregate';
import { CreateMTFundForm$, createMTTransferForm$ } from './marginTrading/transfer/mtTransferForm';
import { createTransactionNotifier$ } from './transactionNotifier/transactionNotifier';
import { pluginDevModeHelpers } from './utils/devModeHelpers';
import { LoadableWithTradingPair, loadablifyLight } from './utils/loadable';
import { zero } from './utils/zero';
import { createWrapUnwrapForm$ } from './wrapUnwrap/wrapUnwrapForm';

const { REACT_APP_LT_ENABLED } = process.env;

export function setupAppContext() {
  const balances$ = createBalances$(context$, initializedAccount$, onEveryBlock$).pipe(shareReplay(1));

  const proxyAddress$ = onEveryBlock$.pipe(
    switchMap(() => calls$.pipe(flatMap((calls) => calls.proxyAddress()))),
    distinctUntilChanged(isEqual),
  );

  const loadOrderbook = memoizeTradingPair(curry(loadOrderbook$)(context$, onEveryBlock$));

  const mta$ =
    REACT_APP_LT_ENABLED === '1'
      ? createMta$(context$, initializedAccount$, onEveryBlock$, readCalls$, loadOrderbook)
      : of({
          state: MTAccountState.notSetup,
          marginableAssets: [],
          totalAssetValue: zero,
          totalDebt: zero,
          totalAvailableDebt: zero,
          proxy: null,
          daiAllowance: false,
        });

  const mtBalances$ = createCombinedBalances(
    etherBalance$,
    balances$,
    createAllowances$(context$, initializedAccount$, onEveryBlock$),
    mta$,
    transactions$,
    onEveryBlock$,
    tokenPricesInUSD$,
  );

  const wethBalance$ = createTokenBalances$(context$, initializedAccount$, onEveryBlock$, 'WETH');

  const saiBalance$ = createTokenBalances$(context$, initializedAccount$, onEveryBlock$, 'SAI');

  const currentOrderbook$ = currentTradingPair$.pipe(switchMap((pair) => loadOrderbook(pair)));

  const createMTFundForm$: CreateMTFundForm$ = curry(createMTTransferForm$)(
    mta$,
    gasPrice$,
    etherPriceUsd$,
    balances$,
    currentOrderbook$,
    calls$,
    readCalls$,
  );

  const approveMTProxy = createMTProxyApprove(gasPrice$, calls$);
  const wrapUnwrapForm$ = curry(createWrapUnwrapForm$)(gasPrice$, etherPriceUsd$, etherBalance$, wethBalance$, calls$);
  const approveWallet$ = createWalletApprove(calls$, gasPrice$);
  const disapproveWallet$ = createWalletDisapprove(calls$, gasPrice$);
  const mtLoadingBalances$ = loadablifyLight(createBalancesView$(initializedAccount$, mtBalances$, daiPriceUsd$));

  const walletView$ = loadablifyLight(mtBalances$);

  const balancesWithEth$ = combineLatest(balances$, etherBalance$).pipe(
    // @ts-ignore
    map(([balances, etherBalance]) => ({
      ...balances,
      ETH: etherBalance,
    })),
  );

  const marketDetails$ = createMarketDetails$(
    memoizeTradingPair(curry(loadPriceDaysAgo)(0, context$, onEveryBlock$)),
    memoizeTradingPair(curry(loadPriceDaysAgo)(1, context$, onEveryBlock$)),
    onEveryBlock$,
  );

  const { mtOrderFormLoadable$, mtMyPositionPanel$ } = mtSimpleOrderForm(
    mta$,
    currentOrderbook$,
    createMTFundForm$,
    approveMTProxy,
  );

  const tradeHistory = memoizeTradingPair(curry(loadAllTrades)(context$, onEveryBlock$));

  const currentTradeHistory$ = currentTradingPair$.pipe(switchMap(tradeHistory));

  const lastDayVolume$ = currentTradingPair$.pipe(
    switchMap(memoizeTradingPair(curry(loadVolumeForThePastDay)(context$, onEveryBlock$))),
  );

  const lastDayPriceHistory$ = currentTradingPair$.pipe(
    switchMap(memoizeTradingPair(curry(loadPriceDaysAgo)(1, context$, onEveryBlock$))),
  );

  const currentTradesBrowser$ = loadablifyPlusTradingPair(
    currentTradingPair$,
    curry(createTradesBrowser$)(context$, tradeHistory),
  );

  const allTrades$ = createAllTrades$(currentTradesBrowser$, context$);

  const groupMode$: BehaviorSubject<GroupMode> = new BehaviorSubject<GroupMode>('byHour');

  const dataSources: {
    [key in GroupMode]: Observable<LoadableWithTradingPair<PriceChartDataPoint[]>>;
  } = {
    byMonth: loadablifyPlusTradingPair(
      currentTradingPair$,
      memoizeTradingPair(curry(loadAggregatedTrades)(38, 'month', context$, onEveryBlock$.pipe(first()))),
    ),
    byWeek: loadablifyPlusTradingPair(
      currentTradingPair$,
      memoizeTradingPair(curry(loadAggregatedTrades)(38, 'week', context$, onEveryBlock$.pipe(first()))),
    ),
    byDay: loadablifyPlusTradingPair(
      currentTradingPair$,
      memoizeTradingPair(curry(loadAggregatedTrades)(38, 'day', context$, onEveryBlock$.pipe(first()))),
    ),
    byHour: loadablifyPlusTradingPair(
      currentTradingPair$,
      memoizeTradingPair(curry(loadAggregatedTrades)(38, 'hour', context$, onEveryBlock$)),
    ),
  };
  const priceChartLoadable$ = createPriceChartLoadable$(groupMode$, dataSources);

  const { offerMakeLoadable$, orderbookForView$, orderbookPanel$, depthChartWithLoading$ } = offerMake(
    currentOrderbook$,
    balances$,
  );

  const myTradesKind$ = createMyTradesKind$();
  const myOpenTrades$ = loadablifyPlusTradingPair(
    currentTradingPair$,
    memoizeTradingPair(curry(createMyOpenTrades$)(currentOrderbook$, account$, transactions$)),
  );

  const myClosedTrades$ = loadablifyPlusTradingPair(
    currentTradingPair$,
    memoizeTradingPair(curry(createMyClosedTrades$)(account$, context$)),
  );

  const myCurrentTrades$ = createMyCurrentTrades$(myTradesKind$, myOpenTrades$, myClosedTrades$);
  const myTrades$ = createMyTrades$(myTradesKind$, myCurrentTrades$, calls$, context$, gasPrice$, currentTradingPair$);

  const currentPrice$ = createCurrentPrice$(currentTradeHistory$);
  const yesterdayPrice$ = createYesterdayPrice$(lastDayPriceHistory$);
  const yesterdayPriceChange$ = createYesterdayPriceChange$(currentPrice$, yesterdayPrice$);
  const dailyVolume$ = createDailyVolume$(lastDayVolume$);

  const tradingPairView$ = createTradingPair$(
    currentTradingPair$,
    currentPrice$,
    yesterdayPriceChange$,
    dailyVolume$,
    marketDetails$,
  );

  const transactionNotifier$ = createTransactionNotifier$(transactions$, interval(5 * 1000), context$);

  const transactionsLog: string[] = [];
  combineLatest(transactionNotifier$, context$)
    .pipe(
      mergeMap(([transactionsNotifier, network]) => {
        return of([transactionsNotifier.transactions, network.name]);
      }),
    )
    .subscribe(([transactions, network]) => {
      (transactions as TxState[]).forEach((tx) => {
        const tx_identify = `${tx.account}${tx.networkId}${tx.status}${tx.txNo}`;
        if (!transactionsLog.includes(tx_identify)) {
          transactionsLog.push(tx_identify);
          trackingEvents.txNotification(tx.status, network as string);
        }
      });
    });

  const instantForm$ = createInstantFormController$({
    gasPrice$,
    calls$,
    readCalls$,
    etherPriceUsd$,
    etherBalance$,
    proxyAddress$,
    user$,
    context$,
    balances$: balancesWithEth$,
    dustLimits$: createDustLimits$(context$),
    allowances$: createProxyAllowances$(
      context$,
      initializedAccount$,
      proxyAddress$.pipe(filter((address) => !!address)),
      onEveryBlock$,
    ),
  });

  const instant$ = loadablifyLight(instantForm$);

  const exportTax$ = createTaxExport$(context$, initializedAccount$);

  const sai2DAIOps$ = curry(createMigrationOps$)(
    'SAI',
    createProxyAllowances$(context$, initializedAccount$, proxyAddress$, onEveryBlock$),
    proxyAddress$,
  );

  const sai2DAIMigration$ = (amount: BigNumber) => createExchangeMigration$(proxyAddress$, calls$, sai2DAIOps$(amount));

  const sai2DAIMigrationForm$ = loadablifyLight(
    createMigrationForm$(
      context$,
      saiBalance$,
      MigrationFormKind.sai2dai,
      sai2DAIMigration$,
      calls$,
      aggregateMyOpenTradesFor$('SAI', account$, transactions$, loadOrderbook),
    ),
  );

  pluginDevModeHelpers(context$, calls$, readCalls$, initializedAccount$, onEveryBlock$, mta$);

  return {
    offerMakeLoadable$,
    orderbookForView$,
    orderbookPanel$,
    depthChartWithLoading$,
    createMTFundForm$,
    wrapUnwrapForm$,
    approveWallet$,
    disapproveWallet$,
    approveMTProxy,
    allTrades$,
    myTrades$,
    instant$,
    transactionNotifier$,
    mtOrderFormLoadable$,
    mtMyPositionPanel$,
    mta$,
    mtLoadingBalances$,
    walletView$,
    sai2DAIMigrationForm$,
    tradingPairView$,
    priceChartLoadable$,
    exportTax$,
    context$,
  };
}

function mtSimpleOrderForm(
  mta$: Observable<MTAccount>,
  orderbook$: Observable<Orderbook>,
  createMTFundForm$: CreateMTFundForm$,
  approveMTProxy: (args: { token: string; proxyAddress: string }) => Observable<TxState>,
) {
  const mtOrderForm$ = currentTradingPair$.pipe(
    switchMap((tradingPair) =>
      createMTSimpleOrderForm$(
        {
          gasPrice$,
          etherPriceUsd$,
          orderbook$,
          mta$,
          calls$,
          readCalls$,
          account$,
          riskComplianceCheck$: createRiskComplianceProbe$(mta$),
          dustLimits$: createDustLimits$(context$),
        },
        tradingPair,
      ),
    ),
    shareReplay(1),
  );

  const mtOrderFormLoadable$ = currentTradingPair$.pipe(
    switchMap((tradingPair) =>
      loadablifyLight(mtOrderForm$).pipe(
        map((mtOrderFormLoadablified) => ({
          tradingPair,
          ...mtOrderFormLoadablified,
        })),
      ),
    ),
  );

  const mtMyPositionPanel$ = createMTMyPositionView$(
    mtOrderFormLoadable$,
    createMTFundForm$,
    calls$,
    daiPriceUsd$,
    approveMTProxy,
  );

  return {
    mtOrderFormLoadable$,
    mtMyPositionPanel$,
  };
}

function offerMake(orderbook$: Observable<Orderbook>, balances$: Observable<Balances>) {
  const offerMake$: Observable<OfferFormState> = currentTradingPair$.pipe(
    switchMap((tp) =>
      createFormController$(
        {
          gasPrice$,
          allowance$,
          calls$,
          etherPriceUsd$,
          orderbook$,
          balances$,
          user$,
          dustLimits$: createDustLimits$(context$),
        },
        tp,
      ),
    ),
    shareReplay(1),
  );

  const offerMakeLoadable$ = loadablifyLight(offerMake$);

  const [kindChange, orderbookPanel$] = createOrderbookPanel$();

  const depthChartWithLoading$ = createDepthChartWithLoading$(offerMake$, orderbook$, kindChange);

  const orderbookForView$ = createOrderbookForView(orderbook$, offerMake$, kindChange);

  return {
    offerMakeLoadable$,
    orderbookForView$,
    orderbookPanel$,
    depthChartWithLoading$,
  };
}

export type AppContext = ReturnType<typeof setupAppContext>;

export const theAppContext = React.createContext<AppContext>((undefined as any) as AppContext);
