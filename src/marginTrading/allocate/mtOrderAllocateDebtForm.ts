import { BigNumber } from 'bignumber.js';
import { curry } from 'ramda';
import { merge, Observable, of, Subject } from 'rxjs';
import { first, tap } from 'rxjs/internal/operators';
import { map, scan, switchMap, takeUntil } from 'rxjs/operators';
import { Calls, Calls$, ReadCalls, ReadCalls$ } from '../../blockchain/calls/calls';
import { combineAndMerge } from '../../utils/combineAndMerge';
import {
  doGasEstimation,
  EtherPriceUSDChange,
  FormChangeKind,
  FormResetChange,
  GasEstimationStatus,
  GasPriceChange,
  HasGasEstimation, progressChange, ProgressChange, ProgressStage,
  toEtherPriceUSDChange,
  toGasPriceChange, transactionToX,
} from '../../utils/form';
import { description, Impossible, isImpossible } from '../../utils/impossible';
import { Omit } from '../../utils/omit';
import { minusOne, zero } from '../../utils/zero';
import { Operation } from '../state/mtAccount';
import { AllocationRequestAssetInfo, AllocationRequestPilot } from './allocate';
import { balance } from './balance';

export interface EditableDebt extends AllocationRequestAssetInfo {
  delta?: BigNumber;
  liquidationPrice?: BigNumber;
  currentCollRatio?: BigNumber;
}

export enum MessageKind {
  debtToBig = 'debtToBig',
  debtLowerThanZero = 'debtLowerThanZero',
  impossibleToPlan = 'impossibleToPlan',
  notEnoughCash = 'notEnoughCash',
  totalCashAllocatedToBig = 'totalCashAllocatedToBig',
}

export type Message = {
  kind: MessageKind.debtToBig | MessageKind.debtLowerThanZero;
  name: string
} | {
  kind: MessageKind.notEnoughCash;
} | {
  kind: MessageKind.totalCashAllocatedToBig;
} | {
  kind: MessageKind.impossibleToPlan
  field?: string;
  priority: number;
  message: string
};

export interface MTAllocateState
  extends HasGasEstimation, Omit<AllocationRequestPilot, 'assets'>
{
  proxy: any;
  progress?: ProgressStage;
  readyToProceed?: boolean;
  debts: EditableDebt[];
  targetCash?: BigNumber;
  daiBalance: BigNumber;
  cashDelta?: BigNumber;
  reverseCashDelta?: BigNumber;
  targetDaiBalance: BigNumber;
  initialDaiBalance: BigNumber;
  diffDaiBalance: BigNumber;
  deltaDaiBalance: BigNumber;
  messages: Message[];
  plan?: Operation[] | Impossible;
  change: (change: ManualChange) => void;
  submit: (state: MTAllocateState) => void;
  autoAllocate: (state: MTAllocateState) => void;
  cancel: () => void;
}

export type EnvironmentChange =
  GasPriceChange |
  EtherPriceUSDChange;

export enum AllocateChangeKind {
  targetCashChange = 'targetCashChange',
  cashDeltaChange = 'cashDeltaChange',
  reverseCashDeltaChange = 'reverseCashDeltaChange',
  debtChange = 'debtChange',
  debtDeltaChange = 'debtDeltaChange',
}

export interface TargetCashChange {
  kind:
    AllocateChangeKind.targetCashChange |
    AllocateChangeKind.cashDeltaChange |
    AllocateChangeKind.reverseCashDeltaChange;
  value?: BigNumber;
}

export interface DebtChange {
  kind: AllocateChangeKind.debtChange | AllocateChangeKind.debtDeltaChange;
  name: string;
  value?: BigNumber;
}

export type ManualChange =
  TargetCashChange |
  DebtChange;

export type MTAllocateStateChange =
  ManualChange |
  EnvironmentChange |
  FormResetChange |
  ProgressChange;

function applyChange(
  state: MTAllocateState,
  change: MTAllocateStateChange
): MTAllocateState {
  switch (change.kind) {
    case FormChangeKind.gasPriceChange:
      return {
        ...state,
        gasPrice: change.value,
        gasEstimationStatus: GasEstimationStatus.unset
      };
    case FormChangeKind.etherPriceUSDChange:
      return {
        ...state,
        etherPriceUsd: change.value,
        gasEstimationStatus: GasEstimationStatus.unset
      };
    case AllocateChangeKind.targetCashChange:
      return {
        ...state,
        targetCash: change.value,
        gasEstimationStatus: GasEstimationStatus.unset
      };
    case AllocateChangeKind.debtChange:
      return {
        ...state,
        debts: state.debts.map(
          d => d.name === change.name ?
            { ...d, targetDebt: change.value } :
            d
        ),
        gasEstimationStatus: GasEstimationStatus.unset
      };
    case AllocateChangeKind.debtDeltaChange:
      return {
        ...state,
        debts: state.debts.map(
          d => d.name === change.name ?
            { ...d, targetDebt: change.value ? d.debt.plus(change.value) : undefined } :
            d
        ),
        gasEstimationStatus: GasEstimationStatus.unset
      };
    case FormChangeKind.progress:
      return {
        ...state,
        progress: change.progress
      };
    case AllocateChangeKind.cashDeltaChange:
      return {
        ...state,
        targetCash: change.value ? state.cashBalance.plus(change.value) : undefined
      };
    case AllocateChangeKind.reverseCashDeltaChange:
      return {
        ...state,
        targetCash: change.value ? state.cashBalance.plus(change.value.times(minusOne)) : undefined
      };
    case FormChangeKind.formResetChange:
      return state;
  }
}

function calculate(
  state: Omit<
    MTAllocateState,
    'diffDaiBalance'|'daiBalance'|'cashDelta'|'initialDaiBalance'|'deltaDaiBalance'>
): MTAllocateState {

  const totalTargetDebt = state.debts.reduce((sum, d) => sum.plus(d.targetDebt || zero), zero);

  const totalDebt = state.debts.reduce((sum, d) => sum.plus(d.debt), zero);

  const daiBalance = (state.targetCash || zero).minus(totalTargetDebt);
  const initialDaiBalance = state.cashBalance.minus(totalDebt);

  const diffDaiBalance = state.targetDaiBalance.minus(daiBalance);
  const deltaDaiBalance = daiBalance.minus(initialDaiBalance);

  const cashDelta = state.targetCash ? state.targetCash.minus(state.cashBalance) : undefined;
  const reverseCashDelta = cashDelta ? cashDelta.times(minusOne) : undefined;

  const debts = state.debts.map(
    d => ({
      ...d,
      delta: d.targetDebt ?
        d.targetDebt.minus(d.debt) :
        undefined,
      liquidationPrice: d.targetDebt ?
        d.minCollRatio.times(d.targetDebt).div(d.balance) :
        undefined,
      currentCollRatio: d.targetDebt && d.targetDebt.gt(zero) ?
        d.balance.times(d.referencePrice).dividedBy(d.targetDebt) :
        undefined,
    }));

  return {
    ...state,
    diffDaiBalance,
    daiBalance,
    debts,
    cashDelta,
    reverseCashDelta,
    initialDaiBalance,
    deltaDaiBalance
  };
}

function validate(state: MTAllocateState): MTAllocateState {

  const messages: Message[] = [];

  for (const { targetDebt, maxDebt, name } of state.debts) {
    if (targetDebt && targetDebt.gt(maxDebt)) {
      messages.push({ name, kind: MessageKind.debtToBig });
    }
    if (targetDebt && targetDebt.lt(zero)) {
      messages.push({ name, kind: MessageKind.debtLowerThanZero });
    }
  }

  if (state.targetCash && state.targetCash.lt(zero)) {
    messages.push({ kind: MessageKind.notEnoughCash });
  }

  if (messages.length === 0) {
    return state;
  }

  return {
    ...state,
    messages
  };
}

function addPlan(state: MTAllocateState): MTAllocateState {

  if (
    !state.diffDaiBalance.eq(zero) ||
    state.debts.find(d => !d.targetDebt) ||
    state.messages.length > 0
  ) {
    return {
      ...state,
      plan: undefined,
    };
  }

  const deltas: Array<Required<EditableDebt>> = state.debts
    .filter(d => d.delta !== undefined)
    .map(debt => ({
      ...debt,
      targetDebt: debt.targetDebt as BigNumber,
      liquidationPrice: debt.liquidationPrice as BigNumber,
      currentCollRatio: debt.currentCollRatio as BigNumber,
      delta: debt.delta as BigNumber }));

  if (deltas.length !== state.debts.length) {
    return {
      ...state,
      plan: undefined,
    };
  }

  // console.log('plan deltas:', JSON.stringify(deltas));

  const plan = state.createPlan(deltas);

  const messages: Message[] =
    isImpossible(plan) ?
    [
      ...state.messages,
      {
        kind: MessageKind.impossibleToPlan,
        message: description(plan),
        priority: 1,
        field: 'total'
      }
    ] :
    state.messages;

  return {
    ...state,
    plan,
    messages,
  };
}

function estimateGasPrice(
  theCalls$: Calls$,
  readCalls$: ReadCalls$,
  theState: MTAllocateState
): Observable<MTAllocateState> {
  return doGasEstimation(
    theCalls$, readCalls$, theState,
    (calls: Calls, _readCalls: ReadCalls, state: MTAllocateState) => {
      if (!state.plan || isImpossible(state.plan) || state.progress) {
        return undefined;
      }

      const {
        proxy,
        plan,
        estimateGas,
      } = state;

      return estimateGas(calls, proxy, plan);
    });
}

function freezeGasEstimation(previous: MTAllocateState, state: MTAllocateState) {
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
): [(state: MTAllocateState) => void, () => void, Observable<ProgressChange>] {

  const progressChange$ = new Subject<ProgressChange>();
  const cancel$ = new Subject<void>();

  function submit(state: MTAllocateState) {

    const {
      proxy, plan,
      gasEstimation,
      execute,
    } = state;

    if (!plan || isImpossible(plan) || !gasEstimation) {
      return;
    }

    const changes$: Observable<ProgressChange> = merge(
      cancel$.pipe(
        map(() => progressChange(ProgressStage.canceled))
      ),
      calls$.pipe(
        first(),
        switchMap((calls): Observable<ProgressChange> => {
          return execute(calls, proxy, plan, Math.trunc(gasEstimation * 1.2))
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

    changes$.subscribe(change => progressChange$.next(change));
  }

  return [submit, cancel$.next.bind(cancel$), progressChange$];
}

function isReadyToProceed(state: MTAllocateState): MTAllocateState {
  if (
    state.messages.length === 0 &&
    state.diffDaiBalance.eq(zero) &&
    state.plan && !isImpossible(state.plan) && state.plan.length !== 0 &&
    state.gasEstimationStatus === GasEstimationStatus.calculated
  ) {
    return  { ...state, readyToProceed: true };
  }
  return { ...state, readyToProceed: false };
}

function autoAllocate(state: MTAllocateState): void {
  const targetDebt =  state.targetDaiBalance.minus(state.targetCash || zero);

  balance(targetDebt.absoluteValue(), state.debts).forEach((delta, i) =>
    state.change({
      kind: AllocateChangeKind.debtDeltaChange,
      name: state.debts[i].name,
      value: delta,
    })
  );
}

export function createMTAllocateForm$(
  gasPrice$: Observable<BigNumber>,
  etherPriceUsd$: Observable<BigNumber|undefined>,
  theCalls$: Calls$,
  readCalls$: ReadCalls$,
  proxy: any,
  { assets, ...request }: AllocationRequestPilot
): Observable<MTAllocateState> {
  const manualChange$ = new Subject<ManualChange>();

  const environmentChange$ = combineAndMerge(
    toGasPriceChange(gasPrice$),
    toEtherPriceUSDChange(etherPriceUsd$),
  );

  const [submit, cancel, stageChange$] = prepareSubmit(theCalls$);

  const initialState = calculate({
    proxy,
    submit,
    cancel,
    autoAllocate,
    ...request,
    change: manualChange$.next.bind(manualChange$),
    messages: [],
    targetCash: request.defaultTargetCash,
    debts: assets.map(
      ({ debt, ...rest }) => ({ debt, targetDebt: debt, ...rest })),
    gasEstimationStatus: GasEstimationStatus.unset,
  });

  const changes = merge(
    manualChange$,
    environmentChange$,
    stageChange$);

  return changes.pipe(
    scan(applyChange, initialState),
    map(calculate),
    map(validate),
    map(addPlan),
    switchMap(curry(estimateGasPrice)(theCalls$, readCalls$)),
    scan(freezeGasEstimation),
    map(isReadyToProceed),
    // tap(s => s.plan && console.log('plan', JSON.stringify(s.plan))),
    tap(s => s.gasEstimation && console.log(
      `gas estimation: ${s.gasEstimation && s.gasEstimation.toString()} gas`,
      `${s.gasEstimationUsd && s.gasEstimationUsd.toString()} USD `,
      )),
  );
}
