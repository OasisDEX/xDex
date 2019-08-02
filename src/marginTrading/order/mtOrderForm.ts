import { BigNumber } from 'bignumber.js';
// import { curry } from 'lodash';
import { merge, Observable, Subject } from 'rxjs';
// import { tap } from 'rxjs/internal/operators';
import {
  map,
  scan
} from 'rxjs/operators';
import { DustLimits } from '../../balances-nomt/balances';
import { Calls$ } from '../../blockchain/calls/calls';
import { AssetKind, tokens } from '../../blockchain/config';
import { OfferType, Orderbook } from '../../exchange/orderbook/orderbook';
import { TradingPair } from '../../exchange/tradingPair/tradingPair';
import { combineAndMerge } from '../../utils/combineAndMerge';
import {
  AmountFieldChange, DustLimitChange, EtherPriceUSDChange, FormChangeKind,
  FormResetChange, GasEstimationStatus, GasPriceChange, HasGasEstimation, KindChange,
  MTAccountChange, OrderbookChange, PriceFieldChange,
  SetMaxChange, toDustLimitChange$, toEtherPriceUSDChange,
  toGasPriceChange,
  toMTAccountChange, toOrderbookChange$
} from '../../utils/form';
import { description, impossible, Impossible, isImpossible } from '../../utils/impossible';
import { AllocationRequestPilot, DebtDelta } from '../allocate/allocate';
import { prepareBuyAllocationRequest } from '../plan/planBuy';
import { prepareSellAllocationRequest } from '../plan/planSell';
import { getTotal } from '../plan/planUtils';
import {
  findAsset, findMarginableAsset, findNonMarginableAsset,
  MarginableAsset,
  MTAccount,
  MTAccountState,
  NonMarginableAsset,
  Operation
} from '../state/mtAccount';
import {
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

export enum FormStage {
  editing = 'editing',
  readyToAllocate = 'readyToAllocate',
  waitingForAllocation = 'waitingForAllocation'
}

export interface MTFormState extends HasGasEstimation {
  baseToken: string;
  quoteToken: string;
  kind: OfferType;
  stage: FormStage;
  amount?: BigNumber;
  price?: BigNumber;
  total?: BigNumber;
  messages: Message[];
  orderbook?: Orderbook;
  dustLimitQuote?: BigNumber;
  dustLimitBase?: BigNumber;
  mta?: MTAccount;
  realPurchasingPower?: BigNumber;
  allocationRequest?: AllocationRequestPilot | Impossible;
  debtDeltas?: DebtDelta[];
  plan?: Operation[] | Impossible;
  change: (change: ManualChange) => void;
}

export type ManualChange =
  PriceFieldChange |
  AmountFieldChange |
  SetMaxChange |
  KindChange;

export interface FormStageChange {
  kind: FormChangeKind.formStageChange;
  stage: FormStage;
}

export type StageChange =
  FormResetChange |
  FormStageChange;

export type EnvironmentChange =
  GasPriceChange |
  EtherPriceUSDChange |
  OrderbookChange |
  DustLimitChange |
  MTAccountChange;

export type MTFormChange = ManualChange | StageChange | EnvironmentChange;

function applyChange(state: MTFormState, change: MTFormChange): MTFormState {
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
          const basePurchasingPower = (baseAsset
            && (baseAsset as MarginableAsset).purchasingPower) || new BigNumber(0);
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
        stage: FormStage.editing,
        price: undefined,
        amount: undefined,
        total: undefined
      };
    case FormChangeKind.formStageChange:
      return { ...state, stage: change.stage };
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
  }
}

function validate(state: MTFormState): MTFormState {

  if (state.stage !== FormStage.editing) {
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

function doAllocationRequest(state: MTFormState): MTFormState {

  if (
    !(state.mta &&
    state.mta.state !== MTAccountState.notSetup &&
    state.orderbook &&
    state.amount &&
    state.price &&
    state.realPurchasingPower)
  ) {
    return {
      ...state,
      allocationRequest: impossible('state not ready'),
    };
  }

  const prepareAllocationRequest = state.kind === OfferType.buy ?
    prepareBuyAllocationRequest :
    prepareSellAllocationRequest;

  const allocationRequest = prepareAllocationRequest(
    state.mta,
    state.kind === OfferType.buy ? state.orderbook.sell : state.orderbook.buy,
    state.baseToken,
    state.amount,
    state.price,
    state.realPurchasingPower
  );

  const messages: Message[] =
      isImpossible(allocationRequest) ?
      [...state.messages,
        {
          kind: MessageKind.impossibleToPlan,
          message: description(allocationRequest),
          priority: 1,
          field: 'total'
        }
      ] :
      state.messages;

  return {
    ...state,
    allocationRequest,
    messages,
  };
}

function checkIfIsReadyToAllocate(state: MTFormState): MTFormState {

  if (state.stage !== FormStage.editing) {
    return state;
  }

  if (
    // state.gasEstimationStatus === GasEstimationStatus.calculated &&
    state.amount && state.price &&
    state.messages.length === 0 &&
    !isImpossible(state.allocationRequest)
  ) {
    return { ...state, stage: FormStage.readyToAllocate };
  }

  return { ...state, stage: FormStage.editing };
}

function addPurchasingPower(state: MTFormState) {

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
        state.mta.cash.balance.plus(findMarginableAsset(state.baseToken, state.mta)!.availableDebt),
        state.orderbook.sell)
      :
      realPurchasingPowerNonMarginable(
        state.mta.cash.balance,
        state.orderbook.sell
      )
  };
}

function addTotal(state: MTFormState) {
  if (!state.amount || !state.orderbook) {
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

export function createMTOrderForm$(
  tradingPair: TradingPair,
  gasPrice$: Observable<BigNumber>,
  etherPriceUSD$: Observable<BigNumber>,
  orderbook$: Observable<Orderbook>,
  mta$: Observable<MTAccount>,
  _calls$: Calls$,
  dustLimits$: Observable<DustLimits>,
): Observable<MTFormState> {

  const manualChange$ = new Subject<ManualChange>();

  const environmentChange$ = combineAndMerge(
    toGasPriceChange(gasPrice$),
    toEtherPriceUSDChange(etherPriceUSD$),
    toOrderbookChange$(orderbook$),
    toDustLimitChange$(dustLimits$, tradingPair.base, tradingPair.quote),
    toMTAccountChange(mta$)
  );

  const initialState: MTFormState = {
    kind: OfferType.buy,
    baseToken: tradingPair.base,
    quoteToken: tradingPair.quote,
    gasEstimationStatus: GasEstimationStatus.unset,
    messages: [],
    stage: FormStage.editing,
    change: manualChange$.next.bind(manualChange$),
  };

  return merge(
    manualChange$,
    environmentChange$,
  ).pipe(
    scan(applyChange, initialState),
    map(addPurchasingPower),
    map(addTotal),
    map(validate),
    map(doAllocationRequest),
    map(checkIfIsReadyToAllocate),
  );
}
