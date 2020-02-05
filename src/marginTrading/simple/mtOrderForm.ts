import { BigNumber } from 'bignumber.js';
import { curry } from 'lodash';
import { merge, Observable, of, Subject } from 'rxjs';
import { shareReplay } from 'rxjs/internal/operators';
import { first, map, scan, switchMap, takeUntil } from 'rxjs/operators';
import { DustLimits } from '../../balances/balances';
import { Calls, Calls$, ReadCalls$ } from '../../blockchain/calls/calls';
import { getToken } from '../../blockchain/config';
import { Offer, OfferType, Orderbook } from '../../exchange/orderbook/orderbook';
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
import { firstOfOrTrue } from '../../utils/operators';
import { minusOne, zero } from '../../utils/zero';
import { EditableDebt } from '../allocate/mtOrderAllocateDebtForm';
import { prepareBuyAllocationRequest } from '../plan/planBuy';
import { prepareSellAllocationRequest } from '../plan/planSell';
import { buy, getPriceImpact, getTotal } from '../plan/planUtils';
import {
  findAsset,
  findMarginableAsset,
  MarginableAsset,
  MarginableAssetCore,
  MTAccount,
  MTAccountState,
  Operation
} from '../state/mtAccount';
import {
  calculateMarginable, maxSellable,
  realPurchasingPowerMarginable, sellable,
} from '../state/mtCalculate';
// import { getBuyPlan, getSellPlan } from './mtOrderPlan';

const SAFE_COLL_RATIO_SELL = 1.65;

export enum MessageKind {
  insufficientAmount = 'insufficientAmount',
  incredibleAmount = 'incredibleAmount',
  dustAmount = 'dustAmount',
  dustTotal = 'dustTotal',
  impossibleToPlan = 'impossibleToPlan',
  impossibleCalculateTotal = 'impossibleCalculateTotal',
  minDebt = 'minDebt',
  unsellable = 'unsellable',
}

export type Message = {
  kind: MessageKind.dustTotal;
  field: string;
  priority: number;
} | {
  kind: MessageKind.insufficientAmount | MessageKind.incredibleAmount;
  field: string;
  priority: number;
  token: string;
} | {
  kind: MessageKind.dustAmount;
  field: string;
  priority: number;
  token: string;
  amount: BigNumber;
} | {
  kind: MessageKind.impossibleToPlan | MessageKind.impossibleCalculateTotal;
  field?: string;
  priority: number;
  message: string;
} | {
  kind: MessageKind.minDebt;
  field?: string;
  priority: number;
  message: string;
} | {
  kind: MessageKind.unsellable;
  field?: string;
  priority: number;
  message: string;
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
  maxAmount: BigNumber;
  price?: BigNumber;
  total?: BigNumber;
  maxTotal: BigNumber;
  messages: Message[];
  orderbook?: Orderbook;
  dustLimitQuote?: BigNumber;
  dustLimitBase?: BigNumber;
  mta?: MTAccount;
  realPurchasingPower?: BigNumber;
  realPurchasingPowerPost?: BigNumber;
  dustWarning?: boolean;
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
  isSafeCollRatio: boolean;
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
    case FormChangeKind.kindChange:
      const newState = {
        ...state,
        kind: change.newKind,
        gasEstimationStatus: GasEstimationStatus.unset
      };
      return state.amount ? addTotal(state.amount, newState) : newState;
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
    default:
      return state;
  }
}

function validate(state: MTSimpleFormState): MTSimpleFormState {

  if (state.progress) {
    return state;
  }
  const messages: Message[] = [...state.messages];
  const baseAsset = findAsset(state.baseToken, state.mta) as MarginableAsset;
  // const quoteAsset = findAsset(state.quoteToken, state.mta);
  if (
    state.amount && state.total &&
    baseAsset && state.realPurchasingPower
  ) {
    const [spendAmount, spendAssetAvailBalance, spendAssetName, spendField, spendDustLimit,
      receiveAmount, receiveAssetName, receiveField] =
      state.kind === OfferType.sell ?
      [state.amount, baseAsset.balance, baseAsset.name, 'amount', state.dustLimitBase,
        state.total, state.quoteToken, 'total'] :
      [state.total, state.realPurchasingPower, state.quoteToken, 'total', state.dustLimitQuote,
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
    if (new BigNumber(getToken(spendAssetName).maxSell).lt(spendAmount)) {
      messages.push({
        kind: MessageKind.incredibleAmount,
        field: spendField,
        priority: 2,
        token: spendAssetName,
      });
    }
    if (new BigNumber(getToken(spendAssetName).maxSell).lt(receiveAmount)) {
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

    if (state.orderbook) {
      const offers = state.kind === OfferType.buy ? state.orderbook.sell : state.orderbook.buy;
      const [isSellable, log, , reason] = sellable(
        baseAsset, offers, state.amount || baseAsset.availableBalance
      );

      const maxToSell = maxSellable(baseAsset, offers);

      console.log(JSON.stringify(log, null, '  '));

      if (
        state.kind === OfferType.sell && state.orderbook &&
        !isSellable
      ) {
        messages.push({
          kind: MessageKind.unsellable,
          field: 'total',
          priority: 1,
          message: reason ? reason + `, max to sell: ${maxToSell}. Deposit now` : ''
        });
      }
    }
  }
  return {
    ...state,
    messages,
    gasEstimationStatus: GasEstimationStatus.unset
  };
}

function addUserConfig(state: MTSimpleFormState) {
  return {
    ...state,
    slippageLimit: state.slippageLimit || new BigNumber(0.05)
  };
}

function addApr(state: MTSimpleFormState) {
  const baseAsset = findMarginableAsset(state.baseToken, state.mta);
  // todo: calculate APR from fee

  if (!state.mta
    || state.mta.state !== MTAccountState.setup
    || !state.orderbook
    || !baseAsset
  ) {
    return state;
  }

  return {
    ...state,
    apr: baseAsset.fee
  };
}

function addPurchasingPower(state: MTSimpleFormState) {

  const baseAsset = findMarginableAsset(state.baseToken, state.mta);

  if (!state.mta
    || state.mta.state !== MTAccountState.setup
    || !state.orderbook
    || !baseAsset
  ) {
    return state;
  }

  const [isDust, realPurchasingPower] =
    realPurchasingPowerMarginable(baseAsset, state.orderbook.sell);

  return {
    ...state,
    realPurchasingPower,
    dustWarning: isDust,
  };
}

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

  if (!state.total || ! state.amount || state.total.eq(zero) || state.amount.eq(zero)) {
    return state;
  }

  return {
    ...state,
    price: state.total.div(state.amount)
  };
}

function addPriceImpact(state: MTSimpleFormState) {
  if (!state.amount || !state.orderbook) {
    return state;
  }

  const priceImpact = getPriceImpact(
    state.amount,
    state.kind === OfferType.buy ?
      state.orderbook.sell :
      state.orderbook.buy);

  if (isImpossible(priceImpact)) {
    return {
      ...state,
      priceImpact: undefined,
    };
  }

  return {
    ...state,
    priceImpact
  };
}

type PlanInfo = [
  Operation[] | Impossible,
  {
    collRatioPost?: BigNumber,
    liquidationPricePost?: BigNumber,
    leveragePost?: BigNumber,
    balancePost?: BigNumber,
    daiBalancePost?: BigNumber,
    realPurchasingPowerPost?: BigNumber,
    isSafePost?: boolean
  }
  ];

function getBuyPlan(
  mta: MTAccount,
  sellOffers: Offer[],
  baseToken: string,
  amount: BigNumber,
  price: BigNumber,
  total: BigNumber,
  realPurchasingPower: BigNumber,
): PlanInfo {

  const request = prepareBuyAllocationRequest(
    mta,
    sellOffers,
    baseToken,
    amount,
    price,
    realPurchasingPower
  );

  if (isImpossible(request)) {
    return [
      request,
      {
        collRatioPost: undefined,
        liquidationPricePost: undefined,
        leveragePost: undefined,
        balancePost: undefined,
        daiBalancePost: undefined,
        realPurchasingPowerPost: undefined,
        isSafePost: undefined
      }
    ];
  }

  const asset: MarginableAsset =
    request.assets.find(ai => ai.name === baseToken) as MarginableAsset;

  // const delta = mta.cash.balance.plus(request.targetDaiBalance);
  // const delta =
  //   request.targetDaiBalance.times(minusOne).minus(mta.cash.balance.times(new BigNumber('2')));

  // const delta = BigNumber.max(
  //   zero,
  //   mta.cash.balance.minus(request.targetDaiBalance.minus(mta.cash.balance)
  //     .times(minusOne)).times(minusOne)
  // );

  const delta = BigNumber.min(request.targetDaiBalance, zero).times(minusOne);
  const postTradeAsset = calculateMarginable(
    {
      ...asset,
      urnBalance: asset.urnBalance.plus(amount),
      debt: asset.debt.plus(delta)
    } as MarginableAssetCore,
    { buy: [], sell: [], tradingPair: { base: '', quote: '' }, blockNumber: 0 } as Orderbook
  );
  const collRatioPost = postTradeAsset.currentCollRatio;
  const liquidationPricePost = postTradeAsset.liquidationPrice;
  const isSafePost = postTradeAsset.safe;
  const leveragePost = postTradeAsset.leverage;
  const balancePost = postTradeAsset.balance;
  const daiBalancePost = postTradeAsset.debt.gt(zero) ?
    postTradeAsset.debt.times(minusOne) : postTradeAsset.dai;

  const [, , offersLeft] = buy(total, sellOffers);
  const [, realPurchasingPowerPost] = realPurchasingPowerMarginable(postTradeAsset, offersLeft);

  return [
    request.createPlan([{
      ...request.assets.find(ai => ai.name === baseToken),
      delta
    } as Required<EditableDebt>]),
    {
      collRatioPost,
      liquidationPricePost,
      isSafePost,
      leveragePost,
      balancePost,
      daiBalancePost,
      realPurchasingPowerPost
    }
  ];
}

function getSellPlan(
  mta: MTAccount,
  buyOffers: Offer[],
  baseToken: string,
  amount: BigNumber,
  price: BigNumber,
  total: BigNumber,
): PlanInfo {

  const request = prepareSellAllocationRequest(
    mta,
    buyOffers,
    baseToken,
    amount,
    price,
  );

  if (isImpossible(request)) {
    return [
      request,
      {
        collRatioPost: undefined,
        liquidationPricePost: undefined,
        leveragePost: undefined,
        balancePost: undefined,
        daiBalancePost: undefined,
        isSafePost: undefined
      }
    ];
  }

  const asset: MarginableAsset =
    request.assets.find(ai => ai.name === baseToken) as MarginableAsset;

  const delta = BigNumber.min(asset.debt, total).times(minusOne);

  const postTradeAsset = calculateMarginable(
    {
      ...asset,
      debt: asset.debt.plus(delta)
    } as MarginableAssetCore,
    { buy: [], sell: [], tradingPair: { base: '', quote: '' }, blockNumber: 0 } as Orderbook
  );

  const collRatioPost = postTradeAsset.currentCollRatio;
  const liquidationPricePost = postTradeAsset.liquidationPrice;
  const isSafePost = postTradeAsset.safe;
  const leveragePost = postTradeAsset.leverage;
  const balancePost = postTradeAsset.balance;
  const daiBalancePost = postTradeAsset.debt.gt(zero) ?
    postTradeAsset.debt.times(minusOne) : postTradeAsset.dai;

  return [
    request.createPlan([{
      ...request.assets.find(ai => ai.name === baseToken),
      delta
    } as Required<EditableDebt>]),
    { collRatioPost, liquidationPricePost, leveragePost, isSafePost, balancePost, daiBalancePost }
  ];
}

function addPlan(state: MTSimpleFormState): MTSimpleFormState {
  if (
    !state.mta || state.mta.state === MTAccountState.notSetup ||
    !state.amount ||
    !state.price ||
    !state.total ||
    !state.orderbook ||
    !state.realPurchasingPower ||
    state.messages.length > 0
  ) {
    return {
      ...state,
      plan: undefined,
    };
  }

  const [plan, postTradeInfo] = state.kind === OfferType.buy ?
    getBuyPlan(
      state.mta,
      state.orderbook.sell,
      state.baseToken,
      state.amount,
      state.price,
      state.total,
      state.realPurchasingPower,
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

  const baseAsset = findAsset(state.baseToken, state.mta);

  if (postTradeInfo.daiBalancePost && baseAsset &&
    (
      postTradeInfo.daiBalancePost.lt(zero) &&
      postTradeInfo.daiBalancePost.times(minusOne).lt(baseAsset.minDebt)
    )
  ) {
    messages.push({
      kind: MessageKind.minDebt,
      field: 'total',
      priority: 1,
      message: baseAsset.minDebt.toFixed(5)
    });
  }

  return {
    ...state,
    ...postTradeInfo,
    plan,
    messages,
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
      total,
      slippageLimit
    } = state;

    if (
      !mta || mta.state === MTAccountState.notSetup ||
      !mta.proxy ||
      !amount || !price ||
      !total ||
      !slippageLimit ||
      !plan || isImpossible(plan) || !gasEstimation
    ) {
      return;
    }

    const proxy = mta.proxy;

    const formResetChange: FormResetChange = { kind: FormChangeKind.formResetChange };

    const totalWithSlippageIncluded = state.kind === OfferType.buy
      ? amount.times(price).times(slippageLimit.plus(1))
      : amount.times(price).dividedBy(slippageLimit.plus(1));

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
            total: totalWithSlippageIncluded,
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
  if (
    state.messages.length === 0 &&
    state.plan && !isImpossible(state.plan) && state.plan.length !== 0 &&
    state.gasEstimationStatus === GasEstimationStatus.calculated &&
    state.isSafeCollRatio
  ) {
    return  { ...state, readyToProceed: true };
  }
  return { ...state, readyToProceed: false };
}

function calculateMaxAmount(state: MTSimpleFormState): MTSimpleFormState {
  const { baseToken, realPurchasingPower, orderbook, kind, mta } = state;
  const ma = findMarginableAsset(baseToken, mta);

  let maxAmount: BigNumber | undefined;

  if (realPurchasingPower && orderbook && ma) {
    maxAmount = kind === OfferType.buy
      ? buy(realPurchasingPower, orderbook.sell)[0]
      : maxSellable(ma, orderbook.buy);
  }

  return {
    ...state,
    maxAmount: maxAmount ? maxAmount : zero
  };
}

function calculateMaxTotal(state: MTSimpleFormState): MTSimpleFormState {
  const { baseToken, realPurchasingPower, orderbook, mta, kind } = state;
  const ma = findMarginableAsset(baseToken, mta);

  let maxTotal: BigNumber | undefined | Impossible;

  if (realPurchasingPower && orderbook && ma) {
    const maxSellableAmount = maxSellable(ma, orderbook.buy);
    maxTotal = kind === OfferType.buy
      ? realPurchasingPower
      : getTotal(maxSellableAmount, orderbook.buy);
  }

  return {
    ...state,
    maxTotal: isImpossible(maxTotal) || !maxTotal ? zero : maxTotal
  };
}

function addPreTradeInfo(state: MTSimpleFormState): MTSimpleFormState {
  const ma = findMarginableAsset(state.baseToken, state.mta);

  const collRatio = ma && ma.currentCollRatio;
  const liquidationPrice = ma && ma.liquidationPrice;
  const leverage = ma && ma.leverage;

  const isSafeCollRatio =
    !(ma && ma.currentCollRatio && ma.currentCollRatio.lt(SAFE_COLL_RATIO_SELL));

  return {
    ...state,
    collRatio,
    isSafeCollRatio,
    liquidationPrice,
    leverage
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
    account$
  } : MTSimpleOrderFormParams,
  tradingPair: TradingPair,
  defaults:
    {
      kind?: OfferType,
    } = {}
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
    maxAmount: zero,
    maxTotal: zero,
    change: manualChange$.next.bind(manualChange$),
    view: ViewKind.instantTradeForm,
    isSafeCollRatio: true,
    ...defaults
  };

  return merge(
    manualChange$,
    environmentChange$,
    stageChange$
  ).pipe(
    scan(applyChange, initialState),
    map(addUserConfig),
    map(addApr),
    map(addPrice),
    map(addPriceImpact),
    map(addPreTradeInfo),
    map(addPurchasingPower),
    map(calculateMaxAmount),
    map(calculateMaxTotal),
    map(validate),
    map(addPlan),
    switchMap(curry(estimateGasPrice)(calls$, readCalls$)),
    scan(freezeGasEstimation),
    map(isReadyToProceed),
    firstOfOrTrue(s => s.gasEstimationStatus === GasEstimationStatus.calculating),
    shareReplay(1),
    // tap(state => state.plan && console.log('plan:', JSON.stringify(state.plan))),
    // ),
    // catchError(e => {
    //   console.log(e);
    //   return throwError(e);
    // })
  );
}
