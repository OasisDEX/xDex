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
  MTAccountChange, MTAccountStateChange, progressChange, ProgressChange, ProgressStage,
  toBalancesChange, toEtherPriceUSDChange,
  toGasPriceChange, TokenChange,
  toMTAccountChange, transactionToX,
} from '../../utils/form';

import { curry } from 'ramda';
import { Balances } from '../../balances-nomt/balances';
import { Calls, Calls$, ReadCalls, ReadCalls$ } from '../../blockchain/calls/calls';
import { AssetKind } from '../../blockchain/config';
import { combineAndMerge } from '../../utils/combineAndMerge';
import { description, impossible, Impossible, isImpossible } from '../../utils/impossible';
import { firstOfOrTrue } from '../../utils/operators';
import { planDraw } from '../plan/planDraw';
import { planFund } from '../plan/planFund';
import {
  findAsset,
  MTAccount, MTAccountState,
  Operation, UserActionKind
} from '../state/mtAccount';

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

export type ManualChange = TokenChange | AmountFieldChange;

export interface MTTransferFormState extends HasGasEstimation {
  readyToProceed?: boolean;
  actionKind: UserActionKind.draw | UserActionKind.fund;
  mta?: MTAccount;
  balances?: Balances;
  messages: Message[];
  amount?: BigNumber;
  token: string;
  plan?: Operation[] | Impossible;
  progress?: ProgressStage;
  change: (change: ManualChange) => void;
  transfer: (state: MTTransferFormState) => void;
  cancel: () => void;
  reset: () => void;
}

type EnvironmentChange =
  MTAccountChange | MTAccountStateChange |
  GasPriceChange | EtherPriceUSDChange | BalancesChange;

// TODO: why not: ManualChange | EnvironmentChange | StageChange?
type MTSetupFormChange =
  TokenChange | AmountFieldChange |
  EnvironmentChange |
  ProgressChange;

function applyChange(state: MTTransferFormState, change: MTSetupFormChange): MTTransferFormState {
  switch (change.kind) {
    case FormChangeKind.gasPriceChange:
      return { ...state,
        gasPrice: change.value,
        gasEstimationStatus: GasEstimationStatus.unset };
    case FormChangeKind.etherPriceUSDChange:
      return { ...state,
        etherPriceUsd: change.value,
        gasEstimationStatus: GasEstimationStatus.unset };
    case FormChangeKind.marginTradingAccountChange:
      return { ...state,
        mta: change.mta,
        gasEstimationStatus: GasEstimationStatus.unset };
    case FormChangeKind.balancesChange:
      return { ...state,
        balances: change.balances,
        gasEstimationStatus: GasEstimationStatus.unset };
    case FormChangeKind.amountFieldChange:
      return { ...state,
        amount: change.value,
        gasEstimationStatus: GasEstimationStatus.unset };
    case FormChangeKind.progress:
      return { ...state, progress: change.progress };
    // default:
    //   const _exhaustiveCheck: never = change; // tslint:disable-line
  }
  return state;
}

function updatePlan(state: MTTransferFormState): MTTransferFormState {

  if (
    state.mta === undefined ||
    state.mta.state === MTAccountState.notSetup ||
    state.amount === undefined ||
    state.messages.length !== 0
  ) {
    return {
      ...state,
      plan: impossible('state not ready') };
  }

  const plan =
    (state.actionKind === UserActionKind.fund ? planFund : planDraw)(
      state.mta, state.token, state.amount, []
    );

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

  return { ...state, messages, plan };
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

    // console.log('plan', plan);

    const call = state.actionKind === UserActionKind.draw ?
      calls.mtDrawEstimateGas : calls.mtFundEstimateGas;
    return call({ proxy, plan });
  });
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
            transactionToX(
              progressChange(ProgressStage.waitingForApproval),
              progressChange(ProgressStage.waitingForConfirmation),
              progressChange(ProgressStage.fiasco),
              () => of(progressChange(ProgressStage.done))
            ),
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

function validate(state: MTTransferFormState) {

  const messages: Message[] = [];
  const asset = findAsset(state.token, state.mta);

  if (state.balances && state.amount) {
    if (state.actionKind === UserActionKind.draw
      && asset
      && asset.assetKind === AssetKind.marginable
      && asset.availableBalance.lt(state.amount)
    ) {
      messages.push({
        kind: MessageKind.insufficientAvailableAmount,
      });
    } else if ((state.actionKind === UserActionKind.fund ?
        state.balances[state.token] :
        asset && asset.balance || new BigNumber(0)
    ).lt(state.amount)) {
      messages.push({
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

export function createMTTransferForm$(
  mta$: Observable<MTAccount>,
  gasPrice$: Observable<BigNumber>,
  etherPriceUSD$: Observable<BigNumber>,
  balances$: Observable<Balances>,
  calls$: Calls$,
  readCalls$: ReadCalls$,
  actionKind: UserActionKind.fund | UserActionKind.draw,
  token: string
): Observable<MTTransferFormState> {

  const manualChange$ = new Subject<ManualChange>();
  const resetChange$ = new Subject<ProgressChange>();

  const environmentChange$ = combineAndMerge(
    toGasPriceChange(gasPrice$),
    toEtherPriceUSDChange(etherPriceUSD$),
    toMTAccountChange(mta$),
    toBalancesChange(balances$),
  );

  const [transfer, cancel, transferProgressChange$] = prepareTransfer(calls$);

  const change = manualChange$.next.bind(manualChange$);

  const initialState: MTTransferFormState = {
    actionKind,
    transfer,
    change,
    cancel,
    token,
    reset: () => resetChange$.next(progressChange(undefined)),
    messages: [],
    gasEstimationStatus: GasEstimationStatus.unset,
  };

  return merge(
    of({ token, stage: FormChangeKind.tokenChange }),
    manualChange$,
    environmentChange$,
    transferProgressChange$,
    resetChange$,
  ).pipe(
    scan(applyChange, initialState),
    map(validate),
    map(updatePlan),
    switchMap(curry(estimateGasPrice)(calls$, readCalls$)),
    map(checkIfIsReadyToProceed),
    firstOfOrTrue(s => s.gasEstimationStatus === GasEstimationStatus.calculating),
  );
}
