import { combineLatest, merge, Observable, of, Subject } from 'rxjs/index';
import {
  filter, first, map, scan,
  shareReplay, startWith,
  switchMap, takeUntil, tap
} from 'rxjs/operators';

import {
  FormChangeKind, FormStage,
  HasGasEstimationEthUsd,
  MTAccountStateChange, ProgressChange, ProgressStage, StageChange,
  toMTAccountStateChange,
  transactionToX
} from '../../utils/form';

import { BigNumber } from 'bignumber.js';
import { Calls$ } from '../../blockchain/calls/calls';
import { amountFromWei } from '../../blockchain/utils';
import { MTAccount, MTAccountState } from '../state/mtAccount';

export interface MTSetupProgressState extends HasGasEstimationEthUsd {
  stage: ProgressStage;
  cancel: () => void;
}

export interface MTSetupFormState {
  stage: FormStage;
  mtaState: MTAccountState;
  setup: () => Observable<MTSetupProgressState>;
}

type MTInternalChange = StageChange | ProgressChange;

type MTSetupFormChange = MTInternalChange | MTAccountStateChange;

function applyChange(state: MTSetupFormState, change: MTSetupFormChange): MTSetupFormState {
  switch (change.kind) {
    case FormChangeKind.marginTradingAccountStateChange:
      return {
        ...state,
        mtaState: change.mtaState,
      };
    case FormChangeKind.formStageChange:
      return { ...state, stage: change.stage };
  }
  return state;
}

function prepareSetup(calls$: Calls$,
                      gasPrice$: Observable<BigNumber>,
                      etherPriceUSD$: Observable<BigNumber>): [
  () => Observable<MTSetupProgressState>, Observable<MTInternalChange>] {

  const setupProgressChange$ = new Subject<MTInternalChange>();

  function setup(): Observable<MTSetupProgressState> {

    const cancel$ = new Subject<void>();
    const cancel = cancel$.next.bind(cancel$);

    const progress$: Observable<MTSetupProgressState> = calls$.pipe(
      first(),
      switchMap(calls =>
        combineLatest(
          calls.setupMTProxyEstimateGas({}).pipe(tap(() => console.log('A1'))),
          gasPrice$.pipe(tap(() => console.log('B1'))),
          etherPriceUSD$.pipe(tap(() => console.log('C1'))),
        ).pipe(
          first(),
          switchMap(([gasEstimation, gasPrice, etherPriceUSD]) => {
            const gasEstimationEth = amountFromWei(
              new BigNumber(gasEstimation).times(gasPrice),
              'ETH'
            );
            const gasEstimationUsd = gasEstimationEth.times(etherPriceUSD);
            return merge(
              calls.setupMTProxy({}).pipe(
                transactionToX<ProgressStage>(
                  ProgressStage.waitingForApproval,
                  ProgressStage.waitingForConfirmation,
                  ProgressStage.fiasco,
                  () => of(ProgressStage.done)
                ),
                takeUntil(cancel$)
              ),
              cancel$.pipe(map(() => ProgressStage.canceled)),
            ).pipe(
              map(stage => {
                return ({
                  stage,
                  cancel,
                  gasEstimation,
                  gasEstimationEth,
                  gasEstimationUsd,
                } as MTSetupProgressState);
              })
            );
          })
        )
      ),
      shareReplay(1)
    );

    const progressChange: Observable<MTInternalChange> = progress$.pipe(
      filter(
        (state: MTSetupProgressState) => state.stage === ProgressStage.fiasco ||
        state.stage === ProgressStage.canceled ||
        state.stage === ProgressStage.done),
      map(() =>
        ({ kind: FormChangeKind.formStageChange, stage: FormStage.idle } as MTInternalChange)),
      startWith({ kind: FormChangeKind.formStageChange, stage: FormStage.blocked })
    );

    progressChange.subscribe(change => setupProgressChange$.next(change));

    return progress$;
  }

  return [setup, setupProgressChange$];
}

export function createMTSetupForm$(
  mta$: Observable<MTAccount>,
  calls$: Calls$,
  gasPrice$: Observable<BigNumber>,
  etherPriceUSD$: Observable<BigNumber>): Observable<MTSetupFormState> {

  const [setup, setupProgressChange$] = prepareSetup(calls$, gasPrice$, etherPriceUSD$);

  const initialState: MTSetupFormState = {
    setup,
    stage: FormStage.idle,
    mtaState: MTAccountState.notSetup
  };

  return merge(
    setupProgressChange$,
    toMTAccountStateChange(mta$),
  ).pipe(
    scan(applyChange, initialState),
    tap(state => console.log('state', state.mtaState, state.stage))
  );
}
