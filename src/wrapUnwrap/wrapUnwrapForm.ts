/*
 * Copyright (C) 2020 Maker Ecosystem Growth Holdings, INC.
 */

import { BigNumber } from 'bignumber.js';
import { curry } from 'ramda';
import { merge, Observable, of, Subject } from 'rxjs';
import { first, map, scan, switchMap, takeUntil } from 'rxjs/operators';
import { Calls, Calls$ } from '../blockchain/calls/calls';
import { ProxyChange } from '../instant/instantForm';
import { MTAccount } from '../marginTrading/state/mtAccount';
import { combineAndMerge } from '../utils/combineAndMerge';
import {
  AmountFieldChange,
  doGasEstimation,
  EtherPriceUSDChange,
  FormChangeKind,
  GasEstimationStatus,
  GasPriceChange,
  HasGasEstimation,
  progressChange,
  ProgressChange,
  ProgressStage,
  toEtherPriceUSDChange,
  toGasPriceChange,
  transactionToX,
} from '../utils/form';
import { firstOfOrTrue } from '../utils/operators';
import { zero } from '../utils/zero';

export enum MessageKind {
  insufficientAmount = 'insufficientAmount',
  dustAmount = 'dustAmount',
  cannotPayForGas = 'cannotPayForGas',
}

export type Message =
  | {
      kind: MessageKind.insufficientAmount;
      token: string;
    }
  | {
      kind: MessageKind.dustAmount;
    }
  | {
      kind: MessageKind.cannotPayForGas;
    };

export enum WrapUnwrapFormKind {
  wrap = 'wrap',
  unwrap = 'unwrap',
}

enum BalanceChangeKind {
  ethBalanceChange = 'ethBalanceChange',
  wethBalanceChange = 'wethBalanceChange',
}

export type ManualChange = AmountFieldChange;

type EnvironmentChange =
  | GasPriceChange
  | ProxyChange
  | EtherPriceUSDChange
  | { kind: BalanceChangeKind; balance: BigNumber };

type WrapUnwrapFormChange = ManualChange | EnvironmentChange | ProgressChange;

export interface WrapUnwrapFormState extends HasGasEstimation {
  readyToProceed?: boolean;
  kind: WrapUnwrapFormKind;
  ethBalance: BigNumber;
  wethBalance: BigNumber;
  messages: Message[];
  amount?: BigNumber;
  progress?: ProgressStage;
  change: (change: ManualChange) => void;
  proceed: (state: WrapUnwrapFormState) => void;
  cancel: () => void;
  mta?: MTAccount;
}

function applyChange(state: WrapUnwrapFormState, change: WrapUnwrapFormChange): WrapUnwrapFormState {
  switch (change.kind) {
    case FormChangeKind.gasPriceChange:
      return { ...state, gasPrice: change.value, gasEstimationStatus: GasEstimationStatus.unset };
    case FormChangeKind.etherPriceUSDChange:
      return { ...state, etherPriceUsd: change.value, gasEstimationStatus: GasEstimationStatus.unset };
    case BalanceChangeKind.ethBalanceChange:
      return { ...state, ethBalance: change.balance, gasEstimationStatus: GasEstimationStatus.unset };
    case BalanceChangeKind.wethBalanceChange:
      return { ...state, wethBalance: change.balance, gasEstimationStatus: GasEstimationStatus.unset };
    case FormChangeKind.amountFieldChange:
      return { ...state, amount: change.value, gasEstimationStatus: GasEstimationStatus.unset };
    case FormChangeKind.progress:
      return { ...state, progress: change.progress };
    //   const _exhaustiveCheck: never = change; // tslint:disable-line
  }
  return state;
}

function validate(state: WrapUnwrapFormState) {
  const messages: Message[] = [];

  const balance = ((kind: WrapUnwrapFormKind) => {
    switch (kind) {
      case WrapUnwrapFormKind.wrap:
        return state.ethBalance;
      case WrapUnwrapFormKind.unwrap:
        return state.wethBalance;
    }
  })(state.kind);

  if (state.amount && state.amount.lte(zero)) {
    messages.push({
      kind: MessageKind.dustAmount,
    });
  }

  if (state.amount && balance && state.amount.gt(balance)) {
    messages.push({
      kind: MessageKind.insufficientAmount,
      token: ((kind: WrapUnwrapFormKind) => {
        switch (kind) {
          case WrapUnwrapFormKind.wrap:
            return 'ETH';
          case WrapUnwrapFormKind.unwrap:
            return 'WETH';
        }
      })(state.kind),
    });
  }

  return {
    ...state,
    messages,
  };
}

function estimateGasPrice(calls$: Calls$, state: WrapUnwrapFormState): Observable<WrapUnwrapFormState> {
  return doGasEstimation(calls$, undefined, state, (calls: Calls) => {
    if (!state.amount || !state.gasPrice || state.messages.length > 0) {
      return undefined;
    }

    const call: any = ((kind: WrapUnwrapFormKind) => {
      switch (kind) {
        case WrapUnwrapFormKind.wrap:
          return calls.wrapEstimateGas;
        case WrapUnwrapFormKind.unwrap:
          return calls.unwrapEstimateGas;
      }
    })(state.kind);

    const args: any = { amount: state.amount, gasPrice: state.gasPrice };
    return call(args);
  });
}

function checkIfCanPayGas(state: WrapUnwrapFormState) {
  const { kind, messages, ethBalance: balance, amount, gasEstimationEth } = state;

  if (!gasEstimationEth) {
    return state;
  }

  const wrapDelta = gasEstimationEth && balance ? balance.minus(gasEstimationEth) : new BigNumber(0.001);

  if (balance && amount && kind === WrapUnwrapFormKind.wrap && amount.gte(wrapDelta) && amount.lt(balance)) {
    messages.push({
      kind: MessageKind.cannotPayForGas,
    });
  }

  return {
    ...state,
    messages,
  };
}

function checkIfIsReadyToProceed(state: WrapUnwrapFormState) {
  const readyToProceed =
    state.amount && state.messages.length === 0 && state.gasEstimationStatus === GasEstimationStatus.calculated;
  return {
    ...state,
    readyToProceed,
  };
}

function prepareProceed(
  calls$: Calls$,
): [(state: WrapUnwrapFormState) => void, () => void, Observable<ProgressChange>] {
  const proceedChange$ = new Subject<ProgressChange>();

  const cancel$ = new Subject<void>();

  function proceed(state: WrapUnwrapFormState) {
    const amount = state.amount;
    const gasPrice = state.gasPrice;
    const gas = state.gasEstimation;

    if (!amount || !gasPrice || !gas) {
      return;
    }

    const changes$: Observable<ProgressChange> = merge(
      cancel$.pipe(map(() => progressChange(ProgressStage.canceled))),
      calls$.pipe(
        first(),
        switchMap(
          (calls): Observable<ProgressChange> => {
            const call: any = ((kind: WrapUnwrapFormKind) => {
              switch (kind) {
                case WrapUnwrapFormKind.wrap:
                  return calls.wrap;
                case WrapUnwrapFormKind.unwrap:
                  return calls.unwrap;
              }
            })(state.kind);
            return call({ amount, gasPrice, gas }).pipe(
              transactionToX(
                progressChange(ProgressStage.waitingForApproval),
                progressChange(ProgressStage.waitingForConfirmation),
                progressChange(ProgressStage.fiasco),
                () => of(progressChange(ProgressStage.done)),
              ),
              takeUntil(cancel$),
            );
          },
        ),
      ),
    );

    changes$.subscribe((change: ProgressChange) => proceedChange$.next(change));

    return changes$;
  }

  return [proceed, cancel$.next.bind(cancel$), proceedChange$];
}

function freezeIfInProgress(previous: WrapUnwrapFormState, state: WrapUnwrapFormState): WrapUnwrapFormState {
  if (state.progress) {
    return {
      ...previous,
      progress: state.progress,
    };
  }
  return state;
}

export function createWrapUnwrapForm$(
  gasPrice$: Observable<BigNumber>,
  etherPriceUsd$: Observable<BigNumber | undefined>,
  ethBalance$: Observable<BigNumber>,
  wethBalance$: Observable<BigNumber>,
  calls$: Calls$,
  kind: WrapUnwrapFormKind,
): Observable<WrapUnwrapFormState> {
  const manualChange$ = new Subject<ManualChange>();
  const resetChange$ = new Subject<ProgressChange>();

  const ethBalanceChange$ = ethBalance$.pipe(
    map((balance) => ({
      balance,
      kind: BalanceChangeKind.ethBalanceChange,
    })),
  );

  const wethBalanceChange$ = wethBalance$.pipe(
    map((balance) => ({
      balance,
      kind: BalanceChangeKind.wethBalanceChange,
    })),
  );

  const environmentChange$ = combineAndMerge(
    toGasPriceChange(gasPrice$),
    toEtherPriceUSDChange(etherPriceUsd$),
    ethBalanceChange$,
    wethBalanceChange$,
  );

  const [proceed, cancel, proceedProgressChange$] = prepareProceed(calls$);

  const change = manualChange$.next.bind(manualChange$);

  const initialState = {
    kind,
    change,
    proceed,
    cancel,
    ethBalance: zero,
    wethBalance: zero,
    messages: [],
    gasEstimationStatus: GasEstimationStatus.unset,
  };

  return merge(manualChange$, environmentChange$, resetChange$, proceedProgressChange$).pipe(
    scan(applyChange, initialState),
    map(validate),
    switchMap(curry(estimateGasPrice)(calls$)),
    map(checkIfCanPayGas),
    map(checkIfIsReadyToProceed),
    scan(freezeIfInProgress),
    firstOfOrTrue((s) => s.gasEstimationStatus === GasEstimationStatus.calculating),
  );
}
