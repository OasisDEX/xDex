import { isEqual } from 'lodash';
import { curry } from 'ramda';
import * as React from 'react';
import { BehaviorSubject, combineLatest, interval, Observable, of } from 'rxjs';
import {
  distinctUntilChanged,
  filter,
  first,
  flatMap,
  map,
  mergeMap,
  shareReplay,
  switchMap,
} from 'rxjs/operators';
import {
  Balances,
  createAllowances$,
  createBalances$, createCombinedBalances, createDustLimits$, createProxyAllowances$,
  createTokenBalances$,
  createWalletApprove, createWalletDisapprove
} from './balances/balances';

import { MtAccountDetailsView } from './balances/mtAccountDetailsView';
import { createBalancesView$, MTBalancesView } from './balances/mtBalancesView';
import { createTaxExport$ } from './balances/taxExporter';
import { TaxExporterView } from './balances/TaxExporterView';
import { WalletView } from './balances/WalletView';
import { calls$, readCalls$ } from './blockchain/calls/calls';
import {
  account$,
  allowance$,
  context$,
  etherBalance$,
  etherPriceUsd$,
  gasPrice$,
  initializedAccount$,
  onEveryBlock$
} from './blockchain/network';
import { user$ } from './blockchain/user';
import { loadOrderbook$, Offer, Orderbook } from './exchange/orderbook/orderbook';
import {
  createTradingPair$,
  currentTradingPair$,
  loadablifyPlusTradingPair,
  memoizeTradingPair,
  TradingPair,
} from './exchange/tradingPair/tradingPair';

import { BigNumber } from 'bignumber.js';
import * as mixpanel from 'mixpanel-browser';
import { TxMetaKind } from './blockchain/calls/txMeta';
import { tradingPairs } from './blockchain/config';
import { transactions$, TxState } from './blockchain/transactions';
import {
  createAllTrades$,
  createTradesBrowser$,
  loadAllTrades,
  loadPriceDaysAgo,
  loadVolumeForThePastDay
} from './exchange/allTrades/allTrades';
import { AllTrades } from './exchange/allTrades/AllTradesView';
import {
  createDepthChartWithLoading$,
  DepthChartWithLoading,
} from './exchange/depthChart/DepthChartWithLoading';
import {
  createCurrentPrice$,
  createDailyVolume$,
  createMarketDetails$,
  createYesterdayPrice$,
  createYesterdayPriceChange$,
} from './exchange/exchange';
import { createMyClosedTrades$ } from './exchange/myTrades/closedTrades';
import {
  createMyCurrentTrades$,
  createMyTrades$,
  createMyTradesKind$,
} from './exchange/myTrades/myTrades';
import { MyTrades } from './exchange/myTrades/MyTradesView';
import { createMyOpenTrades$ } from './exchange/myTrades/openTrades';
import { createFormController$, OfferFormState } from './exchange/offerMake/offerMake';
import { OfferMakePanel } from './exchange/offerMake/OfferMakePanel';
import {
  createOrderbookForView,
  OrderbookView
} from './exchange/orderbook/OrderbookView';
import {
  createOrderbookPanel$,
  OrderbookPanel,
  OrderbookPanelProps,
  SubViewsProps
} from './exchange/OrderbookPanel';
import {
  GroupMode,
  loadAggregatedTrades,
  PriceChartDataPoint
} from './exchange/priceChart/pricechart';
import {
  createPriceChartLoadable$,
  PriceChartWithLoading
} from './exchange/priceChart/PriceChartWithLoading';
import { TradingPairView } from './exchange/tradingPair/TradingPairView';
import { createFooter$, TheFooter } from './footer/Footer';
import { Network } from './header/Network';
import { createFormController$ as createInstantFormController$ } from './instant/instantForm';
import { InstantViewPanel } from './instant/InstantViewPanel';
import {
  createExchangeMigration$,
  createMigrationOps$,
  ExchangeMigrationState
} from './migration/migration';
import {
  createMigrationForm$,
  MigrationFormKind,
  MigrationFormState
} from './migration/migrationForm';
import { MigrationButton } from './migration/MigrationFormView';

import { MTMyPositionPanel } from './marginTrading/positions/MTMyPositionPanel';
import { createMTSetupForm$, MTSetupFormState } from './marginTrading/setup/mtSetupForm';
import { MTSetupButton } from './marginTrading/setup/mtSetupFormView';
import { createMTSimpleOrderForm$ } from './marginTrading/simple/mtOrderForm';
import { MTSimpleOrderPanel } from './marginTrading/simple/mtOrderPanel';
import {
  createMTProxyApprove, findMarginableAsset, MTAccount
} from './marginTrading/state/mtAccount';
import { createMta$ } from './marginTrading/state/mtAggregate';
import { CreateMTFundForm$, createMTTransferForm$ } from './marginTrading/transfer/mtTransferForm';
import { createTransactionNotifier$ } from './transactionNotifier/transactionNotifier';
import { TransactionNotifierView } from './transactionNotifier/TransactionNotifierView';
import { connect } from './utils/connect';
import { pluginDevModeHelpers } from './utils/devModeHelpers';
import { OfferMatchType } from './utils/form';
import { inject } from './utils/inject';
import { Loadable, LoadableWithTradingPair, loadablifyLight, } from './utils/loadable';
import { ModalOpenerProps, withModal } from './utils/modal';
import { createWrapUnwrapForm$ } from './wrapUnwrap/wrapUnwrapForm';
import {createRedeem} from "./marginTrading/positions/MTMyPositionView";

export function setupAppContext() {

  pluginDevModeHelpers(context$, calls$, readCalls$, initializedAccount$, onEveryBlock$);

  const balances$ = createBalances$(context$, initializedAccount$, onEveryBlock$).pipe(
    shareReplay(1)
  );

  const proxyAddress$ = onEveryBlock$.pipe(
    switchMap(() =>
                calls$.pipe(
                  flatMap(calls => calls.proxyAddress())
                )),
    distinctUntilChanged(isEqual)
  );

  const mta$ = createMta$(context$, initializedAccount$, onEveryBlock$, readCalls$);

  const mtSetupForm$ = createMTSetupForm$(mta$, calls$, gasPrice$, etherPriceUsd$);
  const MTSetupButtonRxTx =
    withModal(
      connect<MTSetupFormState, ModalOpenerProps>(MTSetupButton, mtSetupForm$));

  const mtBalances$ = createCombinedBalances(
    etherBalance$,
    balances$,
    createAllowances$(context$, initializedAccount$, onEveryBlock$),
    mta$
  );

  const wethBalance$ = createTokenBalances$(
    context$,
    initializedAccount$,
    onEveryBlock$,
    'WETH'
  );

  const saiBalance$ = createTokenBalances$(
    context$,
    initializedAccount$,
    onEveryBlock$,
    'SAI'
  );

  const daiBalance$ = createTokenBalances$(
    context$,
    initializedAccount$,
    onEveryBlock$,
    'DAI'
  );

  const wrapUnwrapForm$ =
    curry(createWrapUnwrapForm$)(
      gasPrice$,
      etherPriceUsd$,
      etherBalance$,
      wethBalance$,
      calls$
    );

  const loadOrderbook = memoizeTradingPair(curry(loadOrderbook$)(context$, onEveryBlock$));
  const currentOrderbook$ = currentTradingPair$.pipe(
    switchMap(pair => loadOrderbook(pair))
  );

  const createMTFundForm$: CreateMTFundForm$ =
    curry(createMTTransferForm$)(mta$, gasPrice$, etherPriceUsd$, balances$,
                                 currentOrderbook$, calls$, readCalls$);

  const approveMTProxy = createMTProxyApprove(calls$);

  const approveWallet = createWalletApprove(calls$, gasPrice$);
  const disapproveWallet = createWalletDisapprove(calls$, gasPrice$);

  const MTBalancesViewRxTx =
    inject(
      // @ts-ignore
      withModal(
        // @ts-ignore
        connect(
          // @ts-ignore
          MTBalancesView,
          loadablifyLight(createBalancesView$(mtBalances$))
        )
      ),
      {
        createMTFundForm$,
        approveMTProxy,
      }
    );

  const WalletViewRxTx =
    inject(
      // @ts-ignore
      withModal(
        // @ts-ignore
        connect(
          // @ts-ignore
          WalletView, loadablifyLight(mtBalances$))
      ),
      {
        approveWallet, disapproveWallet, wrapUnwrapForm$
      }
    );

  const NetworkTxRx = connect(Network, context$);
  const TheFooterTxRx = connect(TheFooter, createFooter$(context$));

  const balancesWithEth$ = combineLatest(balances$, etherBalance$).pipe(
    map(([balances, etherBalance]) => ({ ...balances, ETH: etherBalance })),
  );

  const marketDetails$ = createMarketDetails$(
    memoizeTradingPair(curry(loadPriceDaysAgo)(0, context$, onEveryBlock$)),
    memoizeTradingPair(curry(loadPriceDaysAgo)(1, context$, onEveryBlock$)),
    onEveryBlock$,
  );

  const { MTSimpleOrderPanelRxTx, MTMyPositionPanelRxTx, MTSimpleOrderbookPanelTxRx } =
    mtSimpleOrderForm(mta$, currentOrderbook$, createMTFundForm$, approveMTProxy);

  const MTAccountDetailsRxTx = connect(MtAccountDetailsView, mta$);

  const tradeHistory = memoizeTradingPair(
    curry(loadAllTrades)(context$, onEveryBlock$)
  );

  const currentTradeHistory$ = currentTradingPair$.pipe(
    switchMap(tradeHistory),
  );

  const lastDayVolume$ = currentTradingPair$.pipe(
    switchMap(memoizeTradingPair(
      curry(loadVolumeForThePastDay)(context$, onEveryBlock$)
    )),
  );

  const lastDayPriceHistory$ = currentTradingPair$.pipe(
    switchMap(memoizeTradingPair(
      curry(loadPriceDaysAgo)(1, context$, onEveryBlock$)
    )),
  );

  const currentTradesBrowser$ = loadablifyPlusTradingPair(
    currentTradingPair$,
    curry(createTradesBrowser$)(context$, tradeHistory),
  );

  const allTrades$ = createAllTrades$(currentTradesBrowser$, context$);
  const AllTradesTxRx = connect(AllTrades, allTrades$);

  const groupMode$: BehaviorSubject<GroupMode> = new BehaviorSubject<GroupMode>('byHour');

  const dataSources: {
    [key in GroupMode]: Observable<LoadableWithTradingPair<PriceChartDataPoint[]>>
  } = {
    byMonth: loadablifyPlusTradingPair(
      currentTradingPair$,
      memoizeTradingPair(
        curry(loadAggregatedTrades)(38, 'month', context$, onEveryBlock$.pipe(first()))
      )
    ),
    byWeek: loadablifyPlusTradingPair(
      currentTradingPair$,
      memoizeTradingPair(
        curry(loadAggregatedTrades)(38, 'week', context$, onEveryBlock$.pipe(first()))
      )
    ),
    byDay: loadablifyPlusTradingPair(
      currentTradingPair$,
      memoizeTradingPair(
        curry(loadAggregatedTrades)(38, 'day', context$, onEveryBlock$.pipe(first()))
      )
    ),
    byHour: loadablifyPlusTradingPair(
      currentTradingPair$,
      memoizeTradingPair(
        curry(loadAggregatedTrades)(38, 'hour', context$, onEveryBlock$)
      )
    ),
  };
  const priceChartLoadable = createPriceChartLoadable$(groupMode$, dataSources);
  const PriceChartWithLoadingTxRx = connect(PriceChartWithLoading, priceChartLoadable);

  const { OfferMakePanelTxRx, OrderbookPanelTxRx } =
    offerMake(currentOrderbook$, balances$);

  const myTradesKind$ = createMyTradesKind$();
  const myOpenTrades$ = loadablifyPlusTradingPair(
    currentTradingPair$,
    memoizeTradingPair(curry(createMyOpenTrades$)(currentOrderbook$, account$, transactions$))
  );

  const myClosedTrades$ = loadablifyPlusTradingPair(
    currentTradingPair$,
    memoizeTradingPair(curry(createMyClosedTrades$)(account$, context$))
  );

  const myCurrentTrades$ = createMyCurrentTrades$(myTradesKind$, myOpenTrades$, myClosedTrades$);
  const myTrades$ = createMyTrades$(
    myTradesKind$,
    myCurrentTrades$,
    calls$, context$,
    gasPrice$,
    currentTradingPair$
  );
  const MyTradesTxRx = connect(MyTrades, myTrades$);

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
  const TradingPairsTxRx = connect(TradingPairView, tradingPairView$);

  const transactionNotifier$ =
    createTransactionNotifier$(transactions$, interval(5 * 1000), context$);
  const TransactionNotifierTxRx = connect(TransactionNotifierView, transactionNotifier$);

  const transactionsLog: string[] = [];
  combineLatest(transactionNotifier$, context$).pipe(
    mergeMap(([transactionsNotifier, network]) => {
      return of([transactionsNotifier.transactions, network.name]);
    })
  ).subscribe(([transactions, network]) => {
    (transactions as TxState[]).forEach(tx => {
      const tx_identify = `${tx.account}${tx.networkId}${tx.status}${tx.txNo}`;
      if (!(transactionsLog.includes(tx_identify))) {
        transactionsLog.push(tx_identify);
        mixpanel.track('notification', {
          network,
          product: 'oasis-trade',
          status: tx.status
        });
      }
    });
  });

  const instant$ = createInstantFormController$(
    {
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
        proxyAddress$.pipe(
          filter(address => !!address)
        ),
        onEveryBlock$
      ),
    }
  );

  const InstantTxRx = connect(InstantViewPanel, loadablifyLight(instant$));

  const TaxExporterTxRx = inject(TaxExporterView, {
    export: () => createTaxExport$(context$, initializedAccount$)
  });

  const aggregatedOpenOrders$ = (token: 'SAI' | 'DAI') => createMyOpenTrades$(
    combineLatest(...tradingPairs
      .filter(pair => pair.quote === token)
      .map(pair => loadOrderbook(pair))
    )
      .pipe(
        map((orderbooks) => {
          const aggregatedOrderbook = {
            buy: [] as Offer[],
            sell: [] as Offer[],
            blockNumber: 0,
          };

          return orderbooks.reduce(
            (aggregate, currentOrderbook) => {
              aggregate.buy = [...aggregate.buy, ...currentOrderbook.buy];
              aggregate.sell = [...aggregate.sell, ...currentOrderbook.sell];
              // the blockNumber is the same for all of them
              aggregate.blockNumber = currentOrderbook.blockNumber;
              return aggregate;
            },
            aggregatedOrderbook
          );
        })),
    account$,
    transactions$.pipe(
      map((transactions: TxState[]) => transactions
        .filter(tx => tx.meta.kind === TxMetaKind.cancel)),
    ),
    {} as TradingPair
  );

  const sai2DAIOps$ = curry(createMigrationOps$)(
    'SAI',
    createProxyAllowances$(
      context$,
      initializedAccount$,
      proxyAddress$,
      onEveryBlock$
    ),
    proxyAddress$,
  );

  const dai2SAIOps$ = curry(createMigrationOps$)(
    'DAI',
    createProxyAllowances$(
      context$,
      initializedAccount$,
      proxyAddress$,
      onEveryBlock$
    ),
    proxyAddress$,
  );

  const sai2DAIMigration$ = (amount: BigNumber) => createExchangeMigration$(
    proxyAddress$,
    calls$,
    sai2DAIOps$(amount),
  );

  const dai2SAIMigration$ = (amount: BigNumber) => createExchangeMigration$(
    proxyAddress$,
    calls$,
    dai2SAIOps$(amount),
  );

  const sai2DAIMigrationForm$ = createMigrationForm$(
    context$,
    saiBalance$,
    MigrationFormKind.sai2dai,
    sai2DAIMigration$,
    calls$,
    aggregatedOpenOrders$('SAI')
  );

  const dai2SAIMigrationForm$ = createMigrationForm$(
    context$,
    daiBalance$,
    MigrationFormKind.dai2sai,
    dai2SAIMigration$,
    calls$,
    aggregatedOpenOrders$('DAI')
  );

  const SAI2DAIMigrationTxRx =
    inject<{ migration$: Observable<ExchangeMigrationState> }, any>(
      withModal(
        connect<Loadable<MigrationFormState>, any>(
          MigrationButton,
          loadablifyLight<MigrationFormState>(sai2DAIMigrationForm$)
        )
      ),
      { migration$: sai2DAIMigrationForm$ }
    );

  const DAI2SAIMigrationTxRx =
    inject<{ migration$: Observable<ExchangeMigrationState> }, any>(
      withModal(
        connect<Loadable<MigrationFormState>, any>(
          MigrationButton,
          loadablifyLight<MigrationFormState>(dai2SAIMigrationForm$)
        )
      ),
      { migration$: dai2SAIMigrationForm$ }
    );

  return {
    AllTradesTxRx,
    MyTradesTxRx,
    OfferMakePanelTxRx,
    OrderbookPanelTxRx,
    InstantTxRx,
    PriceChartWithLoadingTxRx,
    TradingPairsTxRx,
    TransactionNotifierTxRx,
    NetworkTxRx,
    TheFooterTxRx,
    TaxExporterTxRx,
    MTSimpleOrderPanelRxTx,
    MTMyPositionPanelRxTx,
    MTSimpleOrderbookPanelTxRx,
    MTAccountDetailsRxTx,
    MTBalancesViewRxTx,
    WalletViewRxTx,
    MTSetupButtonRxTx,
    SAI2DAIMigrationTxRx,
    DAI2SAIMigrationTxRx,
  };
}

function mtSimpleOrderForm(
  mta$: Observable<MTAccount>,
  orderbook$: Observable<Orderbook>,
  createMTFundForm$: CreateMTFundForm$,
  approveMTProxy: (args: { token: string; proxyAddress: string }) => Observable<TxState>,
) {
  const mtOrderForm$ = currentTradingPair$.pipe(
    switchMap(tradingPair =>
                createMTSimpleOrderForm$(
                  {
                    gasPrice$,
                    etherPriceUsd$,
                    orderbook$,
                    mta$,
                    calls$,
                    readCalls$,
                    account$,
                    dustLimits$: createDustLimits$(context$),
                  },
                  tradingPair
                )
    ),
    shareReplay(1)
  );

  const mtOrderFormLoadable$ = currentTradingPair$.pipe(
    switchMap(tradingPair =>
                loadablifyLight(mtOrderForm$).pipe(
                  map(mtOrderFormLoadablified => ({
                    tradingPair,
                    ...mtOrderFormLoadablified
                  }))
                )
    )
  );

  const MTSimpleOrderPanelRxTx = connect(MTSimpleOrderPanel, mtOrderFormLoadable$);

  const redeem = createRedeem(calls$);
  const MTMyPositionPanelRxTx =
    // @ts-ignore
    withModal(
      // @ts-ignore
      connect(
        // @ts-ignore
        MTMyPositionPanel,
        mtOrderFormLoadable$.pipe(
          map((state) =>
                // @ts-ignore
                state.status === 'loaded' && state.value
                  ? {
                    status: state.status,
                    value: {
                      createMTFundForm$,
                      approveMTProxy,
                      redeem,
                      account: state.value.account,
                      mta: state.value.mta,
                      ma: findMarginableAsset(state.tradingPair.base, state.value.mta)
                    }
                  }
                  : {
                    value: state.value,
                    status: state.status,
                    error: state.error,
                  }
          )
        ),
      )
    );

  const [kindChange, orderbookPanel$] = createOrderbookPanel$();

  const orderbookForView$ = createOrderbookForView(
    orderbook$,
    of({
      change: () => {
        return;
      }
    }),
    kindChange,
  );
  const OrderbookViewTxRx = connect(OrderbookView, orderbookForView$);

  const depthChartWithLoading$ = createDepthChartWithLoading$(
    mtOrderForm$
      .pipe(
        map(f => ({ ...f, matchType: OfferMatchType.direct }))
      ),
    orderbook$,
    kindChange
  );

  const DepthChartWithLoadingTxRx = connect(DepthChartWithLoading, depthChartWithLoading$);

  const MTSimpleOrderbookPanelTxRx = connect(
    inject<OrderbookPanelProps, SubViewsProps>(
      OrderbookPanel,
      { DepthChartWithLoadingTxRx, OrderbookViewTxRx }),
    orderbookPanel$);

  return { MTSimpleOrderPanelRxTx, MTMyPositionPanelRxTx, MTSimpleOrderbookPanelTxRx };
}

function offerMake(
  orderbook$: Observable<Orderbook>,
  balances$: Observable<Balances>
) {
  const offerMake$: Observable<OfferFormState> = currentTradingPair$.pipe(
    switchMap(tp => createFormController$(
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
      tp)
    ),
    shareReplay(1)
  );

  const offerMakeLoadable$ = loadablifyLight(offerMake$);
  const OfferMakePanelTxRx = connect(OfferMakePanel, offerMakeLoadable$);

  const [kindChange, orderbookPanel$] = createOrderbookPanel$();

  const depthChartWithLoading$ = createDepthChartWithLoading$(
    offerMake$,
    orderbook$,
    kindChange
  );
  const DepthChartWithLoadingTxRx = connect(DepthChartWithLoading, depthChartWithLoading$);

  const orderbookForView$ = createOrderbookForView(
    orderbook$,
    offerMake$,
    kindChange,
  );
  const OrderbookViewTxRx = connect(OrderbookView, orderbookForView$);

  const OrderbookPanelTxRx = connect(
    inject<OrderbookPanelProps, SubViewsProps>(
      OrderbookPanel, { DepthChartWithLoadingTxRx, OrderbookViewTxRx }
    ),
    orderbookPanel$
  );

  return {
    OfferMakePanelTxRx,
    OrderbookPanelTxRx
  };
}

export type AppContext = ReturnType<typeof setupAppContext>;

export const theAppContext = React.createContext<AppContext>(undefined as any as AppContext);
