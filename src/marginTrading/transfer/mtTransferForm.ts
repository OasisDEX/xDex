import { BigNumber } from 'bignumber.js';
import { merge, Observable, of, Subject } from 'rxjs';
import {
  first,
  map,
  scan,
  switchMap,
  takeUntil,
} from 'rxjs/operators';

import {
  AmountFieldChange,
  BalancesChange, doGasEstimation, EtherPriceUSDChange,
  FormChangeKind, GasEstimationStatus,
  GasPriceChange, HasGasEstimation,
  MTAccountChange, MTAccountStateChange, OrderbookChange,
  progressChange, ProgressChange, ProgressStage,
  toBalancesChange, toEtherPriceUSDChange,
  toGasPriceChange, TokenChange,
  toMTAccountChange, toOrderbookChange$, transactionToX,
} from '../../utils/form';

import { curry } from 'ramda';
import { filter } from 'rxjs/internal/operators';
import { Balances } from '../../balances/balances';
import { Calls, Calls$, ReadCalls, ReadCalls$ } from '../../blockchain/calls/calls';
import { AssetKind } from '../../blockchain/config';
import { nullAddress } from '../../blockchain/utils';
import { Orderbook } from '../../exchange/orderbook/orderbook';
import { combineAndMerge } from '../../utils/combineAndMerge';
import { description, impossible, Impossible, isImpossible } from '../../utils/impossible';
import { firstOfOrTrue } from '../../utils/operators';
import { minusOne, zero } from '../../utils/zero';
import { WrapUnwrapFormState } from '../../wrapUnwrap/wrapUnwrapForm';
import { planDraw, planDrawDai } from '../plan/planDraw';
import { planFund, planFundDai } from '../plan/planFund';
import {
  findAsset, findMarginableAsset, MarginableAsset,
  MTAccount, MTAccountState,
  Operation, UserActionKind
} from '../state/mtAccount';
import {
  calculateMarginable,
  realPurchasingPowerMarginable,
} from '../state/mtCalculate';

export enum MessageKind {
  insufficientAmount = 'insufficientAmount',
  insufficientAvailableAmount = 'insufficientAvailableAmount',
  dustAmount = 'dustAmount',
  impossibleToPlan = 'impossibleToPlan'
}

export type Message = {
  kind: MessageKind.insufficientAmount |
    MessageKind.insufficientAvailableAmount |
    MessageKind.dustAmount;
} | {
  kind: MessageKind.impossibleToPlan;
  message: string;
};

export type ManualChange = TokenChange | AmountFieldChange | IlkFieldChange;

export enum MTTransferFormTab {
  proxy = 'proxy',
  transfer = 'transfer',
}

export interface MTTransferFormState extends HasGasEstimation {
  readyToProceed?: boolean;
  actionKind: UserActionKind.draw | UserActionKind.fund;
  mta?: MTAccount;
  balances?: Balances;
  messages: Message[];
  amount?: BigNumber;
  orderbook?: Orderbook;
  ilk?: string;
  token: string;
  realPurchasingPower?: BigNumber;
  realPurchasingPowerPost?: BigNumber;
  liquidationPrice?: BigNumber;
  liquidationPricePost?: BigNumber;
  leveragePost?: BigNumber;
  leveragePostPost?: BigNumber;
  daiBalance?: BigNumber;
  daiBalancePost?: BigNumber;
  balancePost?: BigNumber;
  isSafePost?: boolean;
  plan?: Operation[] | Impossible;
  progress?: ProgressStage;
  tab?: MTTransferFormTab;
  startTab?: MTTransferFormTab;
  change: (change: ManualChange) => void;
  transfer: (state: MTTransferFormState) => void;
  setup: (state: MTTransferFormState) => void;
  allowance: (state: MTTransferFormState) => void;
  cancel: () => void;
  reset: () => void;
}

export type CreateMTFundForm$ =
  (actionKind: UserActionKind, token: string, ilk: string | undefined)
    => Observable<MTTransferFormState>;

export enum TransferFormChangeKind {
  ilkFieldChange = 'ilkFieldChange',
}

export interface IlkFieldChange {
  kind: TransferFormChangeKind.ilkFieldChange;
  value?: string;
}

type EnvironmentChange =
  MTAccountChange | MTAccountStateChange | OrderbookChange |
  GasPriceChange | EtherPriceUSDChange | BalancesChange;

// TODO: why not: ManualChange | EnvironmentChange | StageChange?
type MTSetupFormChange =
  TokenChange | AmountFieldChange | IlkFieldChange |
  EnvironmentChange |
  ProgressChange;

function initialTab(mta: MTAccount, name: string) {
  const { proxy, transfer } = MTTransferFormTab;
  if (mta.proxy.address !==  nullAddress) {
    const isAllowance = name === 'DAI'
              ? mta.daiAllowance
              : findMarginableAsset(name, mta)!.allowance;
    return isAllowance ? transfer : proxy;
    return isAllowance ? transfer : proxy;
  }

  return proxy;
}

function applyChange(state: MTTransferFormState, change: MTSetupFormChange): MTTransferFormState {
  switch (change.kind) {
    case FormChangeKind.gasPriceChange:
      return { ...state,
        gasPrice: change.value,
        gasEstimationStatus: GasEstimationStatus.unset };
    case FormChangeKind.orderbookChange:
      return { ...state,
        orderbook: change.orderbook };
    case FormChangeKind.etherPriceUSDChange:
      return { ...state,
        etherPriceUsd: change.value,
        gasEstimationStatus: GasEstimationStatus.unset };
    case FormChangeKind.marginTradingAccountChange:
      return { ...state,
        mta: change.mta,
        tab: !state.tab ? initialTab(change.mta, state.token) : state.tab,
        startTab: !state.startTab ? initialTab(change.mta, state.token) : state.startTab,
        gasEstimationStatus: GasEstimationStatus.unset };
    case FormChangeKind.balancesChange:
      return { ...state,
        balances: change.balances,
        gasEstimationStatus: GasEstimationStatus.unset };
    case FormChangeKind.amountFieldChange:
      return { ...state,
        amount: change.value,
        gasEstimationStatus: GasEstimationStatus.unset };
    case TransferFormChangeKind.ilkFieldChange:
      return { ...state,
        ilk: change.value,
        gasEstimationStatus: GasEstimationStatus.unset };
    case FormChangeKind.progress:
      return {
        ...state,
        progress: change.progress === ProgressStage.done &&
          state.tab !== MTTransferFormTab.transfer ? undefined : change.progress
      };
    // default:
    //   const _exhaustiveCheck: never = change; // tslint:disable-line
  }
  return state;
}

function updatePlan(state: MTTransferFormState): MTTransferFormState {
  const baseToken = state.token === 'DAI' && state.ilk || state.token;
  const asset = findMarginableAsset(baseToken, state.mta);

  if (!state.mta
    || state.mta.state !== MTAccountState.setup
    || !state.orderbook
    || !asset || asset.assetKind !== AssetKind.marginable
  ) {
    return state;
  }

  const liquidationPrice = asset.liquidationPrice;
  const realPurchasingPower = realPurchasingPowerMarginable(
    asset,
    state.orderbook.sell);
  const daiBalance = asset.debt.gt(zero) ?
    asset.debt.times(minusOne) : asset.dai;

  if (
    state.amount === undefined ||
    state.messages.length !== 0 ||
    state.token === 'DAI' && state.ilk === undefined
  ) {
    return {
      ...state,
      liquidationPrice,
      realPurchasingPower,
      daiBalance,
      liquidationPricePost: undefined,
      leveragePost: undefined,
      balancePost: undefined,
      daiBalancePost: undefined,
      realPurchasingPowerPost: undefined,
      plan: impossible('state not ready') };
  }

  const createPlan = state.actionKind === UserActionKind.fund ?
    state.token === 'DAI' ? planFundDai : planFund :
    state.token === 'DAI' ? planDrawDai : planDraw;

  const plan = createPlan(
    state.mta,
    state.token === 'DAI' && state.ilk || state.token,
    state.amount,
    []);

  const messages: Message[] =
    isImpossible(plan) ?
    [
      ...state.messages,
      {
        kind: MessageKind.impossibleToPlan,
        message: description(plan),
      }
    ] :
      state.messages;

  if (isImpossible(plan)) {
    return {
      ...state,
      plan,
      messages,
      realPurchasingPower,
      daiBalance,
      liquidationPrice,
      liquidationPricePost: undefined,
      leveragePost: undefined,
      balancePost: undefined,
      daiBalancePost: undefined,
      realPurchasingPowerPost: undefined,
    };
  }
  let newAsset: MarginableAsset;
  if (state.token === 'DAI') {
    newAsset = {
      ...asset,
      debt: state.actionKind === UserActionKind.fund ?
        BigNumber.max(zero, asset.debt.minus(state.amount)) :
        BigNumber.max(asset.debt.minus(state.amount), zero),
      dai: state.actionKind === UserActionKind.fund ?
        asset.dai.plus(BigNumber.max(zero, state.amount.minus(asset.debt))) :
        BigNumber.max(asset.dai.minus(state.amount), zero)
    };
  } else {
    newAsset = {
      ...asset,
      balance: (state.actionKind === UserActionKind.fund) ?
        asset.balance.plus(state.amount) : asset.balance.minus(state.amount),
    };
  }

  const postTradeAsset = calculateMarginable(
    newAsset
  );

  const isSafePost = postTradeAsset.safe;
  const liquidationPricePost = postTradeAsset.liquidationPrice;
  const leveragePost = postTradeAsset.leverage;
  const balancePost = postTradeAsset.balance;
  const daiBalancePost = postTradeAsset.debt.gt(zero) ?
    postTradeAsset.debt.times(minusOne) : postTradeAsset.dai;
  const realPurchasingPowerPost = realPurchasingPowerMarginable(
    postTradeAsset,
    state.orderbook.sell);

  return { ...state,
    messages,
    liquidationPrice,
    liquidationPricePost,
    leveragePost,
    balancePost,
    daiBalance,
    daiBalancePost,
    realPurchasingPower,
    realPurchasingPowerPost,
    isSafePost,
    plan
  };
}

function estimateGasPrice(
  calls$: Calls$, readCalls$: ReadCalls$, state: MTTransferFormState
): Observable<MTTransferFormState> {
  return doGasEstimation(calls$, readCalls$, state, (calls: Calls, _readCalls: ReadCalls) => {
    if (
      state.mta === undefined ||
      state.mta.state === MTAccountState.notSetup) {
      return undefined;
    }

    const proxy = state.mta.proxy;
    const plan = state.plan;

    if (!plan || isImpossible(plan)) {
      return undefined;
    }

    const call = state.actionKind === UserActionKind.draw ?
      calls.mtDrawEstimateGas : calls.mtFundEstimateGas;
    return call({ proxy, plan });
  });
}

function transactionHandler() {
  return transactionToX(
    progressChange(ProgressStage.waitingForApproval),
    progressChange(ProgressStage.waitingForConfirmation),
    progressChange(ProgressStage.fiasco),
    () => of(progressChange(ProgressStage.done))
  );
}

function prepareTransfer(calls$: Calls$)
  : [(state: MTTransferFormState) => void, () => void, Observable<ProgressChange>] {

  const transferChange$ = new Subject<ProgressChange>();

  const cancel$ = new Subject<void>();

  function transfer(state: MTTransferFormState) {
    if (state.mta === undefined ||
      state.mta.state === MTAccountState.notSetup) {
      // should not happen!
      return;
    }

    const actionKind = state.actionKind;
    const proxy = state.mta.proxy;
    const plan = state.plan;
    const token = state.token;
    const amount = state.amount;

    if (!plan || isImpossible(plan) || !amount) {
      return;
    }

    const changes$: Observable<ProgressChange> = merge(
      cancel$.pipe(
        map(() => progressChange(ProgressStage.canceled))
      ),
      calls$.pipe(
        first(),
        switchMap((calls): Observable<ProgressChange> => {

          const call =
            actionKind === UserActionKind.draw ?
              calls.mtDraw :
              calls.mtFund;

          return call({ proxy, plan, token, amount, })
            .pipe(
              transactionHandler(),
              takeUntil(cancel$)
            );
        }),
      ),
    );

    changes$.subscribe((change: ProgressChange) => transferChange$.next(change));

    return changes$;
  }

  return [
    transfer,
    cancel$.next.bind(cancel$),
    transferChange$,
  ];
}

function prepareSetup(calls$: Calls$, mta$: Observable<MTAccount>)
  : [(state: MTTransferFormState) => void, Observable<ProgressChange>] {

  const setupChange$ = new Subject<ProgressChange>();

  function setup(_state: MTTransferFormState) {

    const changes$: Observable<ProgressChange> = calls$.pipe(
      first(),
      switchMap((calls): Observable<ProgressChange> => {
        return calls.setupMTProxy({}).pipe(
          transactionHandler(),
          switchMap(change => {
            if (change.progress !== ProgressStage.done) {
              return of(change);
            }
            return mta$.pipe(
              filter(mta => mta.state === MTAccountState.setup),
              first(),
              map(() => change)
            );
          })
        );
      }),
    );

    changes$.subscribe((change: ProgressChange) => setupChange$.next(change));

    return changes$;
  }

  return [setup, setupChange$];
}

function prepareAllowance(calls$: Calls$, mta$: Observable<MTAccount>)
  : [(state: MTTransferFormState) => void, Observable<ProgressChange>] {

  const allowanceChange$ = new Subject<ProgressChange>();

  function allowance(state: MTTransferFormState) {
    if (!state.mta) {
      return;
    }

    const proxyAddress = state.mta.proxy.address;
    const changes$: Observable<ProgressChange> = calls$.pipe(
      first(),
      switchMap((calls): Observable<ProgressChange> => {
        return calls.approveMTProxy({
          proxyAddress,
          token: state.token
        }).pipe(
          transactionHandler(),
          switchMap(change => {
            if (change.progress !== ProgressStage.done) {
              return of(change);
            }
            return mta$.pipe(
              filter(mta => mta.state === MTAccountState.setup),
              first(),
              map(() => change)
            );
          })
        );
      }),
    );

    changes$.subscribe((change: ProgressChange) => allowanceChange$.next(change));

    return changes$;
  }

  return [allowance, allowanceChange$];
}

function validate(state: MTTransferFormState) {

  const messages: Message[] = [];
  const asset = findAsset(state.token, state.mta);
  const ilkAsset = state.ilk && findAsset(state.ilk, state.mta);

  if (state.balances && state.amount) {
    const drawBalance = state.token !== 'DAI' ?
      (asset && asset.assetKind === AssetKind.marginable ? asset.availableBalance : undefined) :
      (ilkAsset && ilkAsset.assetKind === AssetKind.marginable ? ilkAsset.dai : undefined);
    if (state.actionKind === UserActionKind.draw
      && drawBalance && drawBalance.lt(state.amount)
    ) {
      messages.push({
        kind: MessageKind.insufficientAvailableAmount,
      });
      // } else if (state.actionKind === UserActionKind.draw &&
      //   asset && asset.assetKind === AssetKind.nonMarginable &&
      //   (asset.balance || new BigNumber(0).lt(state.amount))) {
      //   messages.push({
      //     kind: MessageKind.insufficientAmount,
      //   });
    } else if (state.actionKind === UserActionKind.fund &&
      state.balances[state.token].lt(state.amount)) {
      (null || messages).push({
        kind: MessageKind.insufficientAmount,
      });
    }
  }

  return {
    ...state,
    messages,
  };
}

function checkIfIsReadyToProceed(state: MTTransferFormState) {
  if (
    state.mta !== undefined &&
    state.mta.state === MTAccountState.setup &&
    // state.stage === FormStage.editing &&
    !!state.amount &&
    state.amount.gt(new BigNumber(0)) &&
    state.messages.length === 0 &&
    state.gasEstimationStatus === GasEstimationStatus.calculated
  ) {
    return { ...state, readyToProceed: true };
  }

  return { ...state, readyToProceed: false };
}

function freezeIfInProgress(
  previous: WrapUnwrapFormState,
  state: WrapUnwrapFormState
): WrapUnwrapFormState {
  if (state.progress) {
    return {
      ...previous,
      mta: state.mta,
      progress: state.progress,
    };
  }
  return state;
}

export function createMTTransferForm$(
  mta$: Observable<MTAccount>,
  gasPrice$: Observable<BigNumber>,
  etherPriceUSD$: Observable<BigNumber>,
  balances$: Observable<Balances>,
  orderbook$: Observable<Orderbook>,
  calls$: Calls$,
  readCalls$: ReadCalls$,
  actionKind: UserActionKind.fund | UserActionKind.draw,
  token: string,
  ilk: string,
): Observable<MTTransferFormState> {

  const manualChange$ = new Subject<ManualChange>();
  const resetChange$ = new Subject<ProgressChange>();

  const environmentChange$ = combineAndMerge(
    toGasPriceChange(gasPrice$),
    toEtherPriceUSDChange(etherPriceUSD$),
    toOrderbookChange$(orderbook$),
    toMTAccountChange(mta$),
    toBalancesChange(balances$),
  );

  const [transfer, cancel, transferProgressChange$] = prepareTransfer(calls$);
  const [setup, setupProgressChange$] = prepareSetup(calls$, mta$);
  const [allowance, allowanceProgressChange$] = prepareAllowance(calls$, mta$);

  const change = manualChange$.next.bind(manualChange$);

  const initialState: MTTransferFormState = {
    actionKind,
    transfer,
    setup,
    allowance,
    change,
    cancel,
    token,
    ilk,
    reset: () => resetChange$.next(progressChange(undefined)),
    messages: [],
    gasEstimationStatus: GasEstimationStatus.unset,
  };

  return merge(
    of({ token, stage: FormChangeKind.tokenChange }),
    manualChange$,
    environmentChange$,
    transferProgressChange$,
    setupProgressChange$,
    allowanceProgressChange$,
    resetChange$,
  ).pipe(
    scan(applyChange, initialState),
    map(validate),
    map(updatePlan),
    switchMap(curry(estimateGasPrice)(calls$, readCalls$)),
    map(checkIfIsReadyToProceed),
    scan(freezeIfInProgress),
    firstOfOrTrue(s => s.gasEstimationStatus === GasEstimationStatus.calculating),
  );
}
