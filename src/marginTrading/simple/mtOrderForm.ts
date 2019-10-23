import { BigNumber } from 'bignumber.js';
import { curry } from 'lodash';
import { merge, Observable, of, Subject } from 'rxjs';
import { shareReplay } from 'rxjs/internal/operators';
import { first, map, scan, switchMap, takeUntil } from 'rxjs/operators';
import { DustLimits } from '../../balances-nomt/balances';
import { Calls, Calls$, ReadCalls$ } from '../../blockchain/calls/calls';
import { AssetKind, tokens } from '../../blockchain/config';
import { OfferType, Orderbook } from '../../exchange/orderbook/orderbook';
import { TradingPair } from '../../exchange/tradingPair/tradingPair';
import { combineAndMerge } from '../../utils/combineAndMerge';
import {
  AccountChange,
  AmountFieldChange,
  doGasEstimation,
  DustLimitChange,
  EtherPriceUSDChange,
  FormChangeKind,
  FormResetChange,
  GasEstimationStatus,
  GasPriceChange,
  HasGasEstimation,
  KindChange,
  MTAccountChange,
  OrderbookChange,
  progressChange,
  ProgressChange,
  ProgressStage,
  SetMaxChange,
  SlippageLimitChange, toAccountChange,
  toDustLimitChange$,
  toEtherPriceUSDChange,
  toGasPriceChange,
  toMTAccountChange,
  toOrderbookChange$, TotalFieldChange,
  transactionToX
} from '../../utils/form';
import { formatPriceDown, formatPriceUp } from '../../utils/formatters/format';
import { description, Impossible, isImpossible } from '../../utils/impossible';
import { minusOne, zero } from '../../utils/zero';
import { buy, getPriceImpact, getTotal } from '../plan/planUtils';
import {
  findAsset,
  findMarginableAsset,
  findNonMarginableAsset,
  MarginableAsset,
  MarginableAssetCore,
  MTAccount,
  MTAccountState,
  NonMarginableAsset,
  Operation
} from '../state/mtAccount';
import {
  calculateMarginable,
  realPurchasingPowerMarginable,
} from '../state/mtCalculate';
import { getBuyPlan, getSellPlan } from './mtOrderPlan';

export enum MessageKind {
  insufficientAmount = 'insufficientAmount',
  incredibleAmount = 'incredibleAmount',
  dustAmount = 'dustAmount',
  dustTotal = 'dustTotal',
  impossibleToPlan = 'impossibleToPlan',
  impossibleCalculateTotal = 'impossibleCalculateTotal',
}

export type Message = {
  kind: MessageKind.dustTotal;
  field: string;
  priority: number;
} |  {
  kind: MessageKind.insufficientAmount | MessageKind.incredibleAmount;
  field: string;
  priority: number;
  token: string;
} | {
  kind: MessageKind.dustAmount ;
  field: string;
  priority: number;
  token: string;
  amount: BigNumber;
} | {
  kind: MessageKind.impossibleToPlan | MessageKind.impossibleCalculateTotal;
  field?: string;
  priority: number;
  message: string
};

export enum ViewKind {
  settings = 'settings',
  instantTradeForm = 'instantTradeForm'
}

export interface ViewChange {
  kind: FormChangeKind.viewChange;
  value: ViewKind;
}

export interface MTSimpleFormState extends HasGasEstimation {
  baseToken: string;
  quoteToken: string;
  kind: OfferType;
  progress?: ProgressStage;
  readyToProceed?: boolean;
  amount?: BigNumber;
  price?: BigNumber;
  total?: BigNumber;
  messages: Message[];
  orderbook?: Orderbook;
  dustLimitQuote?: BigNumber;
  dustLimitBase?: BigNumber;
  mta?: MTAccount;
  realPurchasingPower?: BigNumber;
  realPurchasingPowerPost?: BigNumber;
  plan?: Operation[] | Impossible;
  collRatio?: BigNumber;
  collRatioPost?: BigNumber;
  leverage?: BigNumber;
  leveragePost?: BigNumber;
  liquidationPrice?: BigNumber;
  liquidationPricePost?: BigNumber;
  balancePost?: BigNumber;
  daiBalancePost?: BigNumber;
  fee?: BigNumber;
  slippageLimit?: BigNumber;
  priceImpact?: BigNumber;
  submit: (state: MTSimpleFormState) => void;
  change: (change: ManualChange) => void;
  view: ViewKind;
  account?: string;
  isSafePost?: boolean;
}

export type ManualChange =
  AmountFieldChange |
  TotalFieldChange |
  SetMaxChange |
  KindChange |
  SlippageLimitChange |
  ViewChange;

export type EnvironmentChange =
  GasPriceChange |
  EtherPriceUSDChange |
  OrderbookChange |
  DustLimitChange |
  MTAccountChange |
  AccountChange;

export type MTFormChange =
  ManualChange |
  EnvironmentChange |
  FormResetChange |
  ProgressChange;

function applyChange(state: MTSimpleFormState, change: MTFormChange): MTSimpleFormState {
  switch (change.kind) {
    case FormChangeKind.amountFieldChange:
      return {
        ...addTotal(change.value, state),
        gasEstimationStatus: GasEstimationStatus.unset
      };
    case FormChangeKind.totalFieldChange:
      return {
        ...addAmount(change.value, state),
        gasEstimationStatus: GasEstimationStatus.unset
      };
    case FormChangeKind.setMaxChange:
      const baseAsset = findAsset(state.baseToken, state.mta);
      switch (state.kind) {
        case OfferType.sell:
          const baseBalance = (baseAsset && baseAsset.balance) || new BigNumber(0);
          if (state.price) {
            return {
              ...state,
              amount: baseBalance,
              total: baseBalance.times(state.price),
              gasEstimationStatus: GasEstimationStatus.unset
            };
          }
          return {
            ...state,
            amount: baseBalance,
            gasEstimationStatus: GasEstimationStatus.unset
          };
        case OfferType.buy:
          const basePurchasingPower = state.realPurchasingPower || new BigNumber(0);
          if (state.price) {
            return {
              ...state,
              amount: basePurchasingPower.dividedBy(state.price),
              total: basePurchasingPower,
              gasEstimationStatus: GasEstimationStatus.unset
            };
          }
      }
      return {
        ...state,
      };
    case FormChangeKind.kindChange:
      return {
        ...state,
        kind: change.newKind,
        gasEstimationStatus: GasEstimationStatus.unset
      };
    case FormChangeKind.formResetChange:
      return {
        ...state,
        price: undefined,
        amount: undefined,
        total: undefined,
        progress: undefined
      };
    case FormChangeKind.gasPriceChange:
      return { ...state, gasPrice: change.value };
    case FormChangeKind.etherPriceUSDChange:
      return { ...state,
        etherPriceUsd: change.value,
        gasEstimationStatus: GasEstimationStatus.unset };
    case FormChangeKind.marginTradingAccountChange:
      return { ...state,
        mta: change.mta,
        gasEstimationStatus: GasEstimationStatus.unset };
    case FormChangeKind.dustLimitChange:
      return { ...state,
        dustLimitBase: change.dustLimitBase,
        dustLimitQuote: change.dustLimitQuote
      };
    case FormChangeKind.orderbookChange:
      return { ...state,
        orderbook: change.orderbook };
    case FormChangeKind.progress:
      return {
        ...state,
        progress: change.progress
      };
    case FormChangeKind.viewChange:
      return {
        ...state,
        view: change.value
      };
    case FormChangeKind.slippageLimitChange:
      return {
        ...state,
        slippageLimit: change.value
      };
    case FormChangeKind.accountChange:
      return {
        ...state,
        account: change.value
      };
  }
}

function validate(state: MTSimpleFormState): MTSimpleFormState {

  if (state.progress) {
    return state;
  }
  const messages: Message[] = [...state.messages];
  const baseAsset = findAsset(state.baseToken, state.mta) as MarginableAsset | NonMarginableAsset;
  const quoteAsset = findAsset(state.quoteToken, state.mta);
  if (
    state.price && state.amount && state.total &&
    baseAsset && quoteAsset && state.realPurchasingPower
  ) {
    const [spendAmount, spendAssetAvailBalance, spendAssetName, spendField, spendDustLimit,
      receiveAmount, receiveAssetName, receiveField] =
      state.kind === OfferType.sell ?
      [state.amount, baseAsset.balance, baseAsset.name, 'amount', state.dustLimitBase,
        state.total, quoteAsset.name, 'total'] :
      [state.total, state.realPurchasingPower, quoteAsset.name, 'total', state.dustLimitQuote,
        state.amount, baseAsset.name, 'amount'];

    if (spendAssetAvailBalance.lt(spendAmount)) {
      messages.push({
        kind: MessageKind.insufficientAmount,
        field: spendField,
        priority: 1,
        token: spendAssetName,
      });
    }
    if ((spendDustLimit || new BigNumber(0)).gt(spendAmount)) {
      messages.push({
        kind: MessageKind.dustAmount,
        field: spendField,
        priority: 2,
        token: spendAssetName,
        amount: spendDustLimit || new BigNumber(0),
      });
    }
    if (new BigNumber(tokens[spendAssetName].maxSell).lt(spendAmount)) {
      messages.push({
        kind: MessageKind.incredibleAmount,
        field: spendField,
        priority: 2,
        token: spendAssetName,
      });
    }
    if (new BigNumber(tokens[receiveAssetName].maxSell).lt(receiveAmount)) {
      messages.push({
        kind: MessageKind.incredibleAmount,
        field: receiveField,
        priority: 1,
        token: receiveAssetName,
      });
    }
    if (state.total.lte(new BigNumber(0))) {
      messages.push({
        kind: MessageKind.dustTotal,
        field: 'total',
        priority: 1,
      });
    }
  }
  return {
    ...state,
    messages,
    gasEstimationStatus: GasEstimationStatus.unset
  };
}

// function addPurchasingPower(state: MTSimpleFormState) {
//
//   const baseAsset =
//     findMarginableAsset(state.baseToken, state.mta) ||
//     findNonMarginableAsset(state.baseToken, state.mta);
//
//   if (!state.mta
//     || state.mta.state !== MTAccountState.setup
//     || !state.orderbook
//     || !baseAsset
//   ) {
//     return state;
//   }
//
//   const realPurchasingPower = baseAsset.assetKind === AssetKind.marginable ?
//     realPurchasingPowerMarginable(
//       baseAsset,
//       state.orderbook.sell)
//     :
//     realPurchasingPowerNonMarginable(
//       state.mta.cash.balance,
//       state.orderbook.sell
//     );
//
//   const realPurchasingPowerPost =
//     state.messages.length === 0 &&
//     state.total &&
//     realPurchasingPower.minus(state.total);
//
//   // TODO: seems to be wrong...
//   // let realPurchasingPowerPost;
//   // if (state.amount && state.price) {
//   //   const cashAvailable = state.amount.times(state.price);
//   //   const [, , offers] = buy(cashAvailable, state.orderbook.sell);
//   //
//   //   realPurchasingPowerPost = baseAsset.assetKind === AssetKind.marginable ?
//   //     realPurchasingPowerMarginable(
//   //       baseAsset,
//   //       offers)
//   //     :
//   //     realPurchasingPowerNonMarginable(
//   //       state.mta.cash.balance,
//   //       offers
//   //     );
//   // }
//
//   return {
//     ...state,
//     realPurchasingPower,
//     realPurchasingPowerPost,
//   };
// }

function addAmount(total: BigNumber | undefined, state: MTSimpleFormState): MTSimpleFormState {

  if (!total || !state.orderbook) {
    return {
      ...state,
      total,
      amount: undefined
    };
  }
  const [amount, left] = buy(
    total,
    state.kind === OfferType.buy ? state.orderbook.sell : state.orderbook.buy
  );

  if (left.gt(zero)) {
    const messages: Message[] =
      [
        ...state.messages,
        {
          kind: MessageKind.impossibleCalculateTotal,
          message: 'orderbook to shallow',
          priority: 1,
          field: 'total'
        }
      ];

    return {
      ...state,
      messages,
      total,
      amount: undefined
    };
  }

  return {
    ...state,
    total,
    messages: state.messages.filter(m => m.kind !== MessageKind.impossibleCalculateTotal),
    amount: amount ?
      new BigNumber(state.kind === OfferType.buy ?
        formatPriceDown(amount, state.baseToken) : formatPriceUp(amount, state.baseToken)
      ) : undefined,
  };
}

function addTotal(amount: BigNumber | undefined, state: MTSimpleFormState): MTSimpleFormState {
  if (!amount || !state.orderbook) {
    return {
      ...state,
      amount,
      total: undefined
    };
  }

  const orderbookTotal = getTotal(
    amount,
    state.kind === OfferType.buy ?
    state.orderbook.sell :
    state.orderbook.buy);

  if (isImpossible(orderbookTotal)) {
    const messages: Message[] =
      [
        ...state.messages,
        {
          kind: MessageKind.impossibleCalculateTotal,
          message: description(orderbookTotal),
          priority: 1,
          field: 'amount'
        }
      ];

    return {
      ...state,
      messages,
      amount,
      total: undefined,
    };
  }

  return {
    ...state,
    amount,
    messages: state.messages.filter(m => m.kind !== MessageKind.impossibleCalculateTotal),
    total: orderbookTotal,
  };
}

function addPrice(state: MTSimpleFormState) {
  if (!state.amount) {
    const orderbook = state.orderbook;
    return {
      ...state,
      price: orderbook && (
        state.kind === OfferType.buy && orderbook.sell.length > 0 && orderbook.sell[0].price ||
        state.kind === OfferType.sell && orderbook.buy.length > 0 && orderbook.buy[0].price
      ) || undefined
    };
  }

  if (!state.total || ! state.amount) {
    return state;
  }

  return {
    ...state,
    price: state.total.div(state.amount)
  };
}

// function addPriceImpact(state: MTSimpleFormState) {
//   if (!state.amount || !state.orderbook) {
//     return state;
//   }
//
//   const priceImpact = getPriceImpact(
//     state.amount,
//     state.kind === OfferType.buy ?
//       state.orderbook.sell :
//       state.orderbook.buy);
//
//   if (isImpossible(priceImpact)) {
//     return {
//       ...state,
//       priceImpact: undefined,
//     };
//   }
//
//   return {
//     ...state,
//     priceImpact
//   };
// }

function addPlan(state: MTSimpleFormState): MTSimpleFormState {

  const asset = findMarginableAsset(state.baseToken, state.mta);

  if (!state.mta
    || state.mta.state !== MTAccountState.setup
    || !state.orderbook
    || !asset || asset.assetKind !== AssetKind.marginable
  ) {
    return state;
  }

  const realPurchasingPower = realPurchasingPowerMarginable(
    asset,
    state.orderbook.sell);

  if (
    !state.amount ||
    !state.price ||
    !state.total ||
    state.messages.length > 0
  ) {
    return {
      ...state,
      realPurchasingPower,
      plan: undefined,
    };
  }

  const [plan, { debtDelta }] = state.kind === OfferType.buy ?
    getBuyPlan(
      state.mta,
      state.orderbook.sell,
      state.baseToken,
      state.amount,
      state.price,
      realPurchasingPower,
    ) :
    getSellPlan(
      state.mta,
      state.orderbook.buy,
      state.baseToken,
      state.amount,
      state.price,
      state.total,
    );

  const messages: Message[] =
    isImpossible(plan) ?
    [
      ...state.messages,
      {
        kind: MessageKind.impossibleToPlan,
        message: description(plan),
        priority: 1,
        field: 'amount'
      }
    ] :
      state.messages;

  if (isImpossible(plan)) {
    return {
      ...state,
      plan,
      messages,
      realPurchasingPower,
    };
  }

  const postTradeAsset = calculateMarginable(
    {
      ...asset,
      balance: asset.balance.plus(state.amount),
      debt: asset.debt.plus(debtDelta)
    } as MarginableAssetCore,
  );

  const collRatioPost = postTradeAsset.currentCollRatio;
  const liquidationPricePost = postTradeAsset.liquidationPrice;
  const isSafePost = postTradeAsset.safe;
  const leveragePost = postTradeAsset.leverage;
  const balancePost = postTradeAsset.balance;
  const daiBalancePost = postTradeAsset.debt.gt(zero) ?
    postTradeAsset.debt.times(minusOne) : postTradeAsset.dai;

  const bought = buy(state.total, state.orderbook.sell);

  const realPurchasingPowerPost = realPurchasingPowerMarginable(
      postTradeAsset,
      bought[2]);

  // const realPurchasingPowerPost =
  //   state.messages.length === 0 && state.total ?
  //   realPurchasingPower.minus(state.total) : undefined;

  const priceImpact = getPriceImpact(
    state.amount,
    state.kind === OfferType.buy ?
      state.orderbook.sell :
      state.orderbook.buy);

  return {
    ...state,
    plan,
    messages,
    realPurchasingPower,
    realPurchasingPowerPost,
    collRatioPost,
    liquidationPricePost,
    leveragePost,
    balancePost,
    daiBalancePost,
    isSafePost,
    priceImpact: isImpossible(priceImpact) ? undefined : priceImpact,
  };
}

function addPurchasingPower(state: MTSimpleFormState) {

  const baseAsset =
    findMarginableAsset(state.baseToken, state.mta) ||
    findNonMarginableAsset(state.baseToken, state.mta);

  if (!state.mta
    || state.mta.state !== MTAccountState.setup
    || !state.orderbook
    || !baseAsset || baseAsset.assetKind !== AssetKind.marginable
  ) {
    return state;
  }

  const realPurchasingPower = realPurchasingPowerMarginable(
      baseAsset,
      state.orderbook.sell);

  return {
    ...state,
    realPurchasingPower,
  };
}

function estimateGasPrice(
  theCalls$: Calls$,
  theReadCalls$: ReadCalls$,
  state: MTSimpleFormState
): Observable<MTSimpleFormState> {
  return doGasEstimation(theCalls$, theReadCalls$, state, (calls: Calls) => {
    if (
      !state.plan || isImpossible(state.plan) || state.progress ||
      !state.mta || state.mta.state === MTAccountState.notSetup
    ) {
      return undefined;
    }

    const proxy = state.mta.proxy;
    const plan = state.plan;
    const call = state.kind === OfferType.buy ?
      calls.mtBuyEstimateGas : calls.mtSellEstimateGas;

    return call({ proxy, plan });
  });
}

function freezeGasEstimation(previous: MTSimpleFormState, state: MTSimpleFormState) {
  if (state.progress) {
    return {
      ...state,
      gasEstimationStatus: previous.gasEstimationStatus,
      gasPrice: previous.gasPrice,
      gasEstimationUsd: previous.gasEstimationUsd,
      gasEstimationEth: previous.gasEstimationEth
    };
  }
  return state;
}

function prepareSubmit(
  calls$: Calls$
): [
  (state: MTSimpleFormState) => void,
  () => void, Observable<ProgressChange | FormResetChange>
  ] {

  const progressChange$ = new Subject<ProgressChange | FormResetChange>();
  const cancel$ = new Subject<void>();

  function submit(state: MTSimpleFormState) {

    const {
      mta,
      plan,
      baseToken,
      price,
      amount,
      gasEstimation,
      total
    } = state;

    if (
      !mta || mta.state === MTAccountState.notSetup ||
      !mta.proxy ||
      !amount || !price ||
      !total ||
      !plan || isImpossible(plan) || !gasEstimation
    ) {
      return;
    }

    const proxy = mta.proxy;

    const formResetChange: FormResetChange = { kind: FormChangeKind.formResetChange };

    const changes$ = merge(
      cancel$.pipe(
        map(() => progressChange(ProgressStage.canceled))
      ),
      calls$.pipe(
        first(),
        switchMap((calls) => {
          const call = state.kind === OfferType.buy ? calls.mtBuy : calls.mtSell;
          return call({
            amount,
            baseToken,
            price,
            proxy,
            plan,
            total,
            gas: Math.trunc(gasEstimation * 1.2),
          }).pipe(
            transactionToX<ProgressChange | FormResetChange>(
              progressChange(ProgressStage.waitingForApproval),
              progressChange(ProgressStage.waitingForConfirmation),
              progressChange(undefined), // (ProgressStage.fiasco),
              () => of(formResetChange) // (ProgressStage.done)
            ),
            takeUntil(cancel$)
          );
        }),
      ),
    );

    changes$.subscribe(change => progressChange$.next(change));
  }

  return [submit, cancel$.next.bind(cancel$), progressChange$];
}

function isReadyToProceed(state: MTSimpleFormState): MTSimpleFormState {

  // console.log(
  //   'readyToProceed',
  //   state.messages.length,
  //   state.plan,
  //   state.gasEstimationStatus,
  //   state.messages
  // );
  //
  if (
    state.messages.length === 0 &&
    state.plan && !isImpossible(state.plan) && state.plan.length !== 0 &&
    state.gasEstimationStatus === GasEstimationStatus.calculated
  ) {
    return  { ...state, readyToProceed: true };
  }
  return { ...state, readyToProceed: false };
}

function addPreTradeInfo(state: MTSimpleFormState): MTSimpleFormState {

  const ma = findMarginableAsset(state.baseToken, state.mta);

  const collRatio = ma && ma.currentCollRatio;
  const liquidationPrice = ma && ma.liquidationPrice;
  const leverage = ma && ma.leverage;
  const fee = ma && ma.fee;

  return {
    ...state,
    collRatio,
    liquidationPrice,
    leverage,
    fee,
  };
}

export interface MTSimpleOrderFormParams {
  gasPrice$: Observable<BigNumber>;
  etherPriceUsd$: Observable<BigNumber>;
  orderbook$: Observable<Orderbook>;
  mta$: Observable<MTAccount>;
  calls$: Calls$;
  readCalls$: ReadCalls$;
  dustLimits$: Observable<DustLimits>;
  account$: Observable<string|undefined>;
}

export function createMTSimpleOrderForm$(
  {
    gasPrice$,
    etherPriceUsd$,
    orderbook$,
    mta$,
    calls$,
    readCalls$,
    dustLimits$,
    account$,
  }: MTSimpleOrderFormParams,
  tradingPair: TradingPair
): Observable<MTSimpleFormState> {

  const manualChange$ = new Subject<ManualChange>();

  const environmentChange$ = merge(
    combineAndMerge(
      toGasPriceChange(gasPrice$),
      toEtherPriceUSDChange(etherPriceUsd$),
      toOrderbookChange$(orderbook$),
      toDustLimitChange$(dustLimits$, tradingPair.base, tradingPair.quote),
      toAccountChange(account$),
    ),
    toMTAccountChange(mta$)
  );

  const [submit, , stageChange$] = prepareSubmit(calls$);

  const initialState: MTSimpleFormState = {
    submit,
    kind: OfferType.buy,
    baseToken: tradingPair.base,
    quoteToken: tradingPair.quote,
    gasEstimationStatus: GasEstimationStatus.unset,
    messages: [],
    change: manualChange$.next.bind(manualChange$),
    view: ViewKind.instantTradeForm,
    slippageLimit: new BigNumber(0.05),
  };

  return merge(
    manualChange$,
    environmentChange$,
    stageChange$
  ).pipe(
    scan(applyChange, initialState),
    map(addPrice),
    map(addPreTradeInfo),
    map(validate),
    map(addPurchasingPower),
    map(addPlan),
    // map(calculatePostOrder),
    switchMap(curry(estimateGasPrice)(calls$, readCalls$)),
    scan(freezeGasEstimation),
    map(isReadyToProceed),
    shareReplay(1)
    // tap(state => state.plan && console.log('plan:', JSON.stringify(state.plan))),
    // ),
    // catchError(e => {
    //   console.log(e);
    //   return throwError(e);
    // })
  );
}
