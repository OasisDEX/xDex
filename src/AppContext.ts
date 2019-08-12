import * as React from 'react';
import { BehaviorSubject, combineLatest, interval, Observable, of } from 'rxjs';
import { distinctUntilChanged, first, flatMap, map, shareReplay, switchMap } from 'rxjs/operators';

import { isEqual } from 'lodash';
import { curry } from 'ramda';
import * as balancesMT from './balances-mt/balances';
import { CDPRiskManagements } from './balances-mt/CDPRiskManagements';
import { MtAccountDetailsView } from './balances-mt/mtAccountDetailsView';
import {
  MTBalancesCreateMTFundFormProps, MTBalancesOwnProps, MTBalancesView
} from './balances-mt/mtBalancesView';
import { createMTSummary$ } from './balances-mt/mtSummary';
import { MtSummaryView } from './balances-mt/mtSummaryView';
import {
  AssetOverviewView,
  AssetsOverviewActionProps,
  AssetsOverviewExtraProps,
} from './balances-nomt/AssetOverviewView';
import * as balancesNoMT from './balances-nomt/balances';
import { createTaxExport$ } from './balances-nomt/taxExporter';
import { TaxExporterView } from './balances-nomt/TaxExporterView';
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
import {
  loadOrderbook$,
  Orderbook
} from './exchange/orderbook/orderbook';
import {
  createTradingPair$,
  currentTradingPair$,
  loadablifyPlusTradingPair,
  memoizeTradingPair,
} from './exchange/tradingPair/tradingPair';

import { transactions$ } from './blockchain/transactions';
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
import { createMTAllocateForm$ } from './marginTrading/allocate/mtOrderAllocateDebtForm';
import {
  CreateMTAllocateForm$,
  CreateMTAllocateForm$Props
} from './marginTrading/allocate/mtOrderAllocateDebtFormView';
import { ReallocateView } from './marginTrading/allocate/ReallocateView';
import { createMTOrderForm$, MTFormState } from './marginTrading/order/mtOrderForm';

import { MTOrderPanel, MTOrderPanelInner } from './marginTrading/order/mtOrderPanel';
import { MTMyPositionPanel } from './marginTrading/positions/MTMyPositionPanel';
import { createMTSetupForm$, MTSetupFormState } from './marginTrading/setup/mtSetupForm';
import { MTSetupButton } from './marginTrading/setup/mtSetupFormView';
import { createMTSimpleOrderForm$ } from './marginTrading/simple/mtOrderForm';
import { MTSimpleOrderPanel } from './marginTrading/simple/mtOrderPanel';
import { createMTProxyApprove, MTAccount } from './marginTrading/state/mtAccount';
import { createMta$ } from './marginTrading/state/mtAggregate';
import { createMTTransferForm$ } from './marginTrading/transfer/mtTransferForm';
import { createTransactionNotifier$ } from './transactionNotifier/transactionNotifier';
import { TransactionNotifierView } from './transactionNotifier/TransactionNotifierView';
import { Authorizable, authorizablify } from './utils/authorizable';
import { connect } from './utils/connect';
import { pluginDevModeHelpers } from './utils/devModeHelpers';
import { OfferMatchType } from './utils/form';
import { inject } from './utils/inject';
import { Loadable, LoadableWithTradingPair, loadablifyLight, } from './utils/loadable';
import { ModalOpenerProps, withModal } from './utils/modal';
import { createWrapUnwrapForm$ } from './wrapUnwrap/wrapUnwrapForm';

export function setupAppContext() {

  pluginDevModeHelpers(context$, calls$, initializedAccount$, onEveryBlock$);

  const balances$ = balancesNoMT.createBalances$(context$, initializedAccount$, onEveryBlock$).pipe(
    shareReplay(1)
  );

  const mta$ = createMta$(context$, initializedAccount$, onEveryBlock$, readCalls$);

  const mtSetupForm$ = createMTSetupForm$(mta$, calls$, gasPrice$, etherPriceUsd$);
  const MTSetupButtonRxTx =
    withModal(
      connect<MTSetupFormState, ModalOpenerProps>(MTSetupButton, mtSetupForm$));

  const mtBalances$ = balancesMT.createCombinedBalances(etherBalance$, balances$, mta$);

  const createMTFundForm$ =
    curry(createMTTransferForm$)(mta$, gasPrice$, etherPriceUsd$, balances$, calls$, readCalls$);

  const approveMTProxy = createMTProxyApprove(calls$);

  const theCreateMTAllocateForm$: CreateMTAllocateForm$ =
    curry(createMTAllocateForm$)(gasPrice$, etherPriceUsd$, calls$, readCalls$);

  const MTBalancesViewRxTx =
    inject(
      withModal<MTBalancesCreateMTFundFormProps, MTBalancesOwnProps>(
        connect<Loadable<balancesMT.CombinedBalances>, MTBalancesOwnProps>(
          MTBalancesView,
          loadablifyLight(mtBalances$)
        )
      ),
      { createMTFundForm$, approveMTProxy, createMTAllocateForm$: theCreateMTAllocateForm$ }
    );

  const NetworkTxRx = connect(Network, context$);
  const TheFooterTxRx = connect(TheFooter, createFooter$(context$));

  const combinedBalances$ = balancesNoMT.createCombinedBalances$(
    context$, initializedAccount$, etherBalance$,
    balances$, onEveryBlock$, etherPriceUsd$, transactions$
  ).pipe(
    shareReplay(1)
  );
  const balancesWithEth$ = combineLatest(balances$, etherBalance$).pipe(
    map(([balances, etherBalance]) => ({ ...balances, ETH: etherBalance })),
  );

  const wethBalance$ =
    balancesNoMT.createWethBalances$(context$, initializedAccount$, onEveryBlock$);

  const wrapUnwrapForm$ =
    curry(createWrapUnwrapForm$)(gasPrice$, etherPriceUsd$, etherBalance$, wethBalance$, calls$);

  const approve = balancesNoMT.createWalletApprove(calls$, gasPrice$);
  const disapprove = balancesNoMT.createWalletDisapprove(calls$, gasPrice$);

  const AssetOverviewViewRxTx =
    inject(
      withModal<AssetsOverviewActionProps, AssetsOverviewExtraProps>(
        connect<Authorizable<Loadable<balancesNoMT.CombinedBalances>>, AssetsOverviewExtraProps>(
          AssetOverviewView,
          authorizablify(() => loadablifyLight(combinedBalances$))
        )
      ),
      { approve, disapprove, wrapUnwrapForm$ }
    );

  const loadOrderbook = memoizeTradingPair(curry(loadOrderbook$)(context$, onEveryBlock$));
  const currentOrderbook$ = currentTradingPair$.pipe(
    switchMap(pair => loadOrderbook(pair))
  );
  // const currentOrderBookWithTradingPair$ = loadablifyPlusTradingPair(
  //   currentTradingPair$,
  //   loadOrderbook
  // );

  const marketDetails$ = createMarketDetails$(
    memoizeTradingPair(curry(loadPriceDaysAgo)(0, context$, onEveryBlock$)),
    memoizeTradingPair(curry(loadPriceDaysAgo)(1, context$, onEveryBlock$)),
    onEveryBlock$,
  );

  const { MTOrderPanelRxTx, MTOrderPanelInnerRxTx, MTOrderbookPanelTxRx } =
    mtOrderForm(mta$,
                theCreateMTAllocateForm$,
                currentOrderbook$,
                // currentOrderBookWithTradingPair$
    );

  const { MTSimpleOrderPanelRxTx, MTMyPositionPanelRxTx, MTSimpleOrderbookPanelTxRx } =
    mtSimpleOrderForm(mta$, currentOrderbook$);

  const MTAccountDetailsRxTx = connect(MtAccountDetailsView, mta$);

  const mtSummary$ = createMTSummary$(mta$);
  const MtSummaryViewRxTx = connect(MtSummaryView, mtSummary$);

  const CDPRiskManagementsRxTx =
    withModal(connect<MTAccount, ModalOpenerProps>(CDPRiskManagements, mta$));

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
    memoizeTradingPair(curry(createMyOpenTrades$)(loadOrderbook, account$, transactions$))
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

  const proxyAddress$ = onEveryBlock$.pipe(
    switchMap(() =>
      calls$.pipe(
        flatMap(calls => calls.proxyAddress())
      )),
    distinctUntilChanged(isEqual)
  );

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
      dustLimits$: balancesNoMT.createDustLimits$(context$),
      allowances$: balancesNoMT.createAllowances$(context$, initializedAccount$, onEveryBlock$),
    }
  );

  const InstantTxRx = connect(InstantViewPanel, loadablifyLight(instant$));

  const TaxExporterTxRx = inject(TaxExporterView, {
    export: () => createTaxExport$(context$, initializedAccount$)
  });

  const ReallocateViewRxTx =  inject(
    withModal<CreateMTAllocateForm$Props, ModalOpenerProps>(
      connect<Loadable<MTAccount>, ModalOpenerProps & CreateMTAllocateForm$Props>(
        ReallocateView, loadablifyLight(mta$)
      )
    ),
    { createMTAllocateForm$:  theCreateMTAllocateForm$ }
  );

  return {
    AllTradesTxRx,
    AssetOverviewViewRxTx,
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
    MTOrderbookPanelTxRx,
    MTOrderPanelRxTx,
    MTOrderPanelInnerRxTx,
    MTSetupButtonRxTx,
    MtSummaryViewRxTx,
    ReallocateViewRxTx,
    CDPRiskManagementsRxTx
  };
}

function mtOrderForm(
  mta$: Observable<MTAccount>,
  theCreateMTAllocateForm$: CreateMTAllocateForm$,
  orderbook$: Observable<Orderbook>,
  // _orderbookWithTradingPair$: Observable<LoadableWithTradingPair<Orderbook>>
) {
  const mtOrderForm$ = currentTradingPair$.pipe(
    switchMap(tradingPair =>
                createMTOrderForm$(
                  tradingPair,
                  gasPrice$,
                  etherPriceUsd$,
                  orderbook$,
                  mta$,
                  calls$,
                  balancesMT.dustLimits$,
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

  const MTOrderPanelRxTx = connect(MTOrderPanel, currentTradingPair$);

  const MTOrderPanelInnerRxTx = inject(
    withModal<CreateMTAllocateForm$Props, ModalOpenerProps>(
      connect<LoadableWithTradingPair<MTFormState>,
        ModalOpenerProps & CreateMTAllocateForm$Props>(MTOrderPanelInner, mtOrderFormLoadable$)),
    { createMTAllocateForm$: theCreateMTAllocateForm$ });

  // const pickableOrderbook$
  //   = createPickableOrderBookFromMTFormState$(orderbookWithTradingPair$, account$, mtOrderForm$);

  const [kindChange, orderbookPanel$] = createOrderbookPanel$();

  const orderbookForView$ = createOrderbookForView(
    orderbook$,
    of({ change: () => { return; } }),
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

  const MTOrderbookPanelTxRx = connect(
    inject<OrderbookPanelProps, SubViewsProps>(
      OrderbookPanel,
      { DepthChartWithLoadingTxRx, OrderbookViewTxRx }),
    orderbookPanel$);

  return { MTOrderPanelRxTx, MTOrderPanelInnerRxTx, MTOrderbookPanelTxRx };
}

function mtSimpleOrderForm(
  mta$: Observable<MTAccount>,
  orderbook$: Observable<Orderbook>,
  // orderbookWithTradingPair$: Observable<LoadableWithTradingPair<Orderbook>>
) {
  const mtOrderForm$ = currentTradingPair$.pipe(
    switchMap(tradingPair =>
      createMTSimpleOrderForm$(
        tradingPair,
        gasPrice$,
        etherPriceUsd$,
        orderbook$,
        mta$,
        calls$,
        readCalls$,
        balancesMT.dustLimits$,
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
  const MTMyPositionPanelRxTx = connect(MTMyPositionPanel, mtOrderFormLoadable$);

  // const pickableOrderbook$
  //   = createPickableOrderBookFromMTFormState$(orderbookWithTradingPair$, account$, mtOrderForm$);

  const [kindChange, orderbookPanel$] = createOrderbookPanel$();

  const orderbookForView$ = createOrderbookForView(
    orderbook$,
    of({ change: () => { return; } }),
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

// function mtSimpleOrderForm2(
//   mta$: Observable<MTAccount>,
//   // theCreateMTAllocateForm$: CreateMTAllocateForm$,
//   orderbook$: Observable<Orderbook>,
//   orderbookWithTradingPair$: Observable<LoadableWithTradingPair<Orderbook>>
// ) {
//   const mtOrderForm$ = currentTradingPair$.pipe(
//     switchMap(tradingPair =>
//                 createMTSimpleOrderForm$(
//                   tradingPair,
//                   gasPrice$,
//                   etherPriceUsd$,
//                   orderbook$,
//                   mta$,
//                   calls$,
//                   balancesMT.dustLimits$,
//                 )
//     ),
//     shareReplay(1)
//   );
//
//   const mtOrderFormLoadable$ = currentTradingPair$.pipe(
//     switchMap(tradingPair =>
//                 loadablifyLight(mtOrderForm$).pipe(
//                   map(mtOrderFormLoadablified => ({
//                     tradingPair,
//                     ...mtOrderFormLoadablified
//                   }))
//                 )
//     )
//   );
//
//   // const MTSimpleOrderPanelRxTx = connect(MTSimpleOrderPanel, currentTradingPair$);
//   const MTSimpleOrderPanelRxTx = connect(MTSimpleOrderPanel, mtOrderFormLoadable$);
//   const MTMyPositionPanelRxTx = connect(MTMyPositionPanel, mtOrderFormLoadable$);
//
//   const [zoomChange, depthChartWithLoading$] = createDepthChartWithLoading$(
//     mtOrderForm$
//     .pipe(
//       map(f => ({ ...f, matchType: OfferMatchType.direct }))
//     ),
//     orderbookWithTradingPair$,
//     currentTradingPair$
//   );
//   const DepthChartWithLoadingTxRx = connect(DepthChartWithLoading, depthChartWithLoading$);
//
//   const pickableOrderbook$ = createPickableOrderBookFromMTSimpleFormState$(
//     orderbookWithTradingPair$, account$, mtOrderForm$
//   );
//   const OrderbookViewTxRx = connect(OrderbookView, pickableOrderbook$);
//
//   const orderbookPanel$ = createOrderbookPanel$(zoomChange);
//   const MTSimpleOrderbookPanelTxRx = connect(
//     inject<OrderbookPanelProps, SubViewsProps>(
//       OrderbookPanel,
//       { DepthChartWithLoadingTxRx, OrderbookViewTxRx }),
//     orderbookPanel$);
//
//   return { MTSimpleOrderPanelRxTx, MTMyPositionPanelRxTx, MTSimpleOrderbookPanelTxRx };
// }

function offerMake(
  orderbook$: Observable<Orderbook>,
  balances$: Observable<balancesNoMT.Balances>
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
        dustLimits$: balancesNoMT.createDustLimits$(context$),
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
      OrderbookPanel,
      { DepthChartWithLoadingTxRx, OrderbookViewTxRx }),
    orderbookPanel$);

  return {
    OfferMakePanelTxRx,
    OrderbookPanelTxRx
  };
}

export type AppContext = ReturnType<typeof setupAppContext>;

export const theAppContext = React.createContext<AppContext>(undefined as any as AppContext);
