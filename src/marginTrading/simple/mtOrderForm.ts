import { BigNumber } from 'bignumber.js';
import { curry } from 'lodash';
import { merge, Observable, of, Subject } from 'rxjs';
import { first, map, scan, switchMap, takeUntil, tap } from 'rxjs/operators';
import { DustLimits } from '../../balances-nomt/balances';
import { Calls, Calls$, ReadCalls$ } from '../../blockchain/calls/calls';
import { AssetKind, tokens } from '../../blockchain/config';
import { Offer, OfferType, Orderbook } from '../../exchange/orderbook/orderbook';
import { TradingPair } from '../../exchange/tradingPair/tradingPair';
import { combineAndMerge } from '../../utils/combineAndMerge';
import {
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
  PriceFieldChange,
  progressChange,
  ProgressChange,
  ProgressStage,
  SetMaxChange,
  toDustLimitChange$,
  toEtherPriceUSDChange,
  toGasPriceChange,
  toMTAccountChange,
  toOrderbookChange$,
  transactionToX
} from '../../utils/form';
import { description, Impossible, isImpossible } from '../../utils/impossible';
import { minusOne, zero } from '../../utils/zero';
import { EditableDebt } from '../allocate/mtOrderAllocateDebtForm';
import { prepareBuyAllocationRequest } from '../plan/planBuy';
import { prepareSellAllocationRequest } from '../plan/planSell';
import { getPriceImpact, getTotal } from '../plan/planUtils';
import {
  findAsset,
  findMarginableAsset,
  findNonMarginableAsset,
  MarginableAsset, MarginableAssetCore,
  MTAccount, MTAccountSetup,
  MTAccountState,
  NonMarginableAsset,
  Operation
} from '../state/mtAccount';
import {
  calculateMarginable,
  realPurchasingPowerMarginable,
  realPurchasingPowerNonMarginable
} from '../state/mtCalculate';

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
  plan?: Operation[] | Impossible;
  collRatio?: BigNumber;
  collRatioPost?: BigNumber;
  leverage?: BigNumber;
  leveragePost?: BigNumber;
  liquidationPrice?: BigNumber;
  liquidationPricePost?: BigNumber;
  apr?: BigNumber;
  isSafePost?: boolean;
  slippageLimit?: BigNumber;
  priceImpact?: BigNumber;
  submit: (state: MTSimpleFormState) => void;
  change: (change: ManualChange) => void;
}

export type ManualChange =
  PriceFieldChange |
  AmountFieldChange |
  SetMaxChange |
  KindChange;

export type EnvironmentChange =
  GasPriceChange |
  EtherPriceUSDChange |
  OrderbookChange |
  DustLimitChange |
  MTAccountChange;

export type MTFormChange =
  ManualChange |
  EnvironmentChange |
  FormResetChange |
  ProgressChange;

function applyChange(state: MTSimpleFormState, change: MTFormChange): MTSimpleFormState {
  switch (change.kind) {
    case FormChangeKind.amountFieldChange:
      return {
        ...state,
        amount: change.value,
        ...change.value && state.price
          ? { total: change.value.multipliedBy(state.price) }
          : {},
        gasEstimationStatus: GasEstimationStatus.unset
      };
    case FormChangeKind.priceFieldChange:
      return {
        ...state,
        price: change.value,
        ...change.value && state.amount
          ? { total: change.value.multipliedBy(state.amount) }
          : {},
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

function addUserConfig(state: MTSimpleFormState) {
  return {
    ...state,
    slippageLimit: new BigNumber(0.05)
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

  const baseAsset =
    findMarginableAsset(state.baseToken, state.mta) ||
    findNonMarginableAsset(state.baseToken, state.mta);

  if (!state.mta
    || state.mta.state !== MTAccountState.setup
    || !state.orderbook
    || !baseAsset
  ) {
    return state;
  }

  return {
    ...state,
    realPurchasingPower: baseAsset.assetKind === AssetKind.marginable ?
      realPurchasingPowerMarginable(
        baseAsset,
        state.mta.cash.balance,
        state.orderbook.sell)
        :
        realPurchasingPowerNonMarginable(
          state.mta.cash.balance,
          state.orderbook.sell
        )
  };
}

function addPriceTotal(state: MTSimpleFormState) {
  if (!state.amount) {
    if (state.orderbook) {
      return {
        ...state,
        price: state.orderbook.sell[0].price,
        total: new BigNumber(0)
      };
    }
    return state;
  }

  if (!state.orderbook) {
    return state;
  }

  const orderbookTotal = getTotal(
    state.amount,
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
      total: undefined,
      price: undefined,
    };
  }

  const orderbookPrice = orderbookTotal.div(state.amount);

  return {
    ...state,
    total: orderbookTotal,
    price: orderbookPrice
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
    isSafePost?: boolean
  }
];

function getBuyPlan(
  mta: MTAccountSetup,
  sellOffers: Offer[],
  baseToken: string,
  amount: BigNumber,
  price: BigNumber,
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
      debt: asset.debt.plus(delta)
    } as MarginableAssetCore,
  );
  const collRatioPost = postTradeAsset.currentCollRatio;
  const liquidationPricePost = postTradeAsset.liquidationPrice;
  const isSafePost = postTradeAsset.safe;
  const leveragePost = postTradeAsset.leverage;

  return [
    request.createPlan([{
      ...request.assets.find(ai => ai.name === baseToken),
      delta
    } as Required<EditableDebt>]),
    { collRatioPost, liquidationPricePost, isSafePost, leveragePost }
  ];
}

function getSellPlan(
  mta: MTAccountSetup,
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
  );

  const collRatioPost = postTradeAsset.currentCollRatio;
  const liquidationPricePost = postTradeAsset.liquidationPrice;
  const isSafePost = postTradeAsset.safe;
  const leveragePost = postTradeAsset.leverage;

  return [
    request.createPlan([{
      ...request.assets.find(ai => ai.name === baseToken),
      delta
    } as Required<EditableDebt>]),
    { collRatioPost, liquidationPricePost, leveragePost, isSafePost }
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

  console.log(
    'readyToProceed',
    state.messages.length,
    state.plan,
    state.gasEstimationStatus,
    state.messages
  );

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

  const leverage = ma && ma.balance
      .times(ma.referencePrice)
      .div(ma.debt);
  return {
    ...state,
    collRatio,
    liquidationPrice,
    leverage
  };
}

export function createMTSimpleOrderForm$(
  tradingPair: TradingPair,
  gasPrice$: Observable<BigNumber>,
  etherPriceUSD$: Observable<BigNumber>,
  orderbook$: Observable<Orderbook>,
  mta$: Observable<MTAccount>,
  calls$: Calls$,
  readCalls$: ReadCalls$,
  dustLimits$: Observable<DustLimits>,
): Observable<MTSimpleFormState> {

  const manualChange$ = new Subject<ManualChange>();

  const environmentChange$ = combineAndMerge(
    toGasPriceChange(gasPrice$),
    toEtherPriceUSDChange(etherPriceUSD$),
    toOrderbookChange$(orderbook$),
    toDustLimitChange$(dustLimits$, tradingPair.base, tradingPair.quote),
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
  };

  return merge(
    manualChange$,
    environmentChange$,
    stageChange$
  ).pipe(
    scan(applyChange, initialState),
    map(addUserConfig),
    map(addPurchasingPower),
    map(addApr),
    map(addPriceTotal),
    map(addPriceImpact),
    map(validate),
    map(addPreTradeInfo),
    map(addPlan),
    switchMap(curry(estimateGasPrice)(calls$, readCalls$)),
    scan(freezeGasEstimation),
    map(isReadyToProceed),
    tap(state => state.plan && console.log('plan:', JSON.stringify(state.plan))),
    tap(state =>
        state.messages.length > 0 &&
        console.log('messages:', JSON.stringify(state.messages))
    ),
    tap(state => console.log('progress', state.progress))
    // catchError(e => {
    //   console.log(e);
    //   return throwError(e);
    // })
  );
}
