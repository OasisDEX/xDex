import { BigNumber } from 'bignumber.js';
import { combineLatest, merge, Observable, Subject } from 'rxjs';
import { first, map, scan, switchMap } from 'rxjs/operators';
import { Calls$ } from '../blockchain/calls/calls';
import { CancelData } from '../blockchain/calls/offerMake';
import { TradeWithStatus } from '../exchange/myTrades/openTrades';
import { combineAndMerge } from '../utils/combineAndMerge';
import { AmountFieldChange, FormChangeKind, OrdersChange, toOrdersChange, } from '../utils/form';
import { zero } from '../utils/zero';
import { ExchangeMigrationState } from './migration';

export enum MessageKind {
  amount2Big = 'amount2Big',
  amount2Small = 'amount2Small',
}

export interface Message {
  kind: MessageKind.amount2Big | MessageKind.amount2Small;
}

export enum MigrationFormKind {
  sai2dai = 'sai2dai',
  dai2sai = 'dai2sai',
}

enum BalanceChangeKind {
  balanceChange = 'balanceChange',
}

export type ManualChange = AmountFieldChange;

interface BalanceChange {
  kind: BalanceChangeKind;
  balance: BigNumber;
}

type EnvironmentChange = BalanceChange | OrdersChange;

export interface ProgressChange {
  kind: FormChangeKind.progress;
  progress?: ExchangeMigrationState;
}

type MigrationFormChange = ManualChange | EnvironmentChange | ProgressChange;

export interface MigrationFormState {
  kind: MigrationFormKind;
  fromToken: string;
  balance: BigNumber;
  orders: TradeWithStatus[];
  amount?: BigNumber;
  messages: Message[];
  readyToProceed?: boolean;
  progress?: ExchangeMigrationState;
  change: (change: ManualChange | ProgressChange) => void;
  proceed: (state: MigrationFormState) => void;
  cancelOffer: (cancelData: CancelData) => void;
}

function applyChange(
  state: MigrationFormState,
  change: MigrationFormChange
): MigrationFormState {
  switch (change.kind) {
    case BalanceChangeKind.balanceChange:
      return { ...state, balance: change.balance };
    case FormChangeKind.amountFieldChange:
      return { ...state, amount: change.value  };
    case FormChangeKind.progress:
      return { ...state, progress: change.progress };
    case FormChangeKind.ordersChange:
      return { ...state, orders: change.orders };
  }
  return state;
}

function validate(state: MigrationFormState) {
  const messages: Message[] = [];

  if (state.amount && state.amount.gt(state.balance)) {
    messages.push({ kind: MessageKind.amount2Big });
  }

  if (state.amount && state.amount.lte(zero)) {
    messages.push({ kind: MessageKind.amount2Small });
  }

  return {
    ...state,
    messages,
  };
}

function checkIfIsReadyToProceed(state: MigrationFormState) {

  const readyToProceed = state.amount &&
    state.messages.length === 0;

  return {
    ...state,
    readyToProceed,
  };
}

function prepareProceed(
  migrate$: (amount: BigNumber) => Observable<ExchangeMigrationState>,
): [
  (state: MigrationFormState) => void, Observable<ProgressChange>
] {

  const proceedChange$ = new Subject<ProgressChange>();

  function proceed(state: MigrationFormState) {

    const amount = state.amount;

    if (!amount) {
      return;
    }

    const changes$ = migrate$(amount).pipe(
      map(progress => (
        { progress, kind: FormChangeKind.progress } as ProgressChange
      ))
    );

    changes$.subscribe((change: ProgressChange) => proceedChange$.next(change));

    return changes$;
  }

  return [proceed, proceedChange$];
}

function freezeIfInProgress(
  previous: MigrationFormState,
  state: MigrationFormState
): MigrationFormState {
  if (state.progress) {
    return {
      ...previous,
      progress: state.progress,
    };
  }
  return state;
}

function toBalanceChange(
  balance$: Observable<BigNumber>
) {
  return balance$.pipe(
    map(balance => ({ balance, kind: BalanceChangeKind.balanceChange }))
  );
}

export function createMigrationForm$(
  balance$: Observable<BigNumber>,
  kind: MigrationFormKind,
  migrate$: (amount: BigNumber) => Observable<ExchangeMigrationState>,
  calls$: Calls$,
  orders$: Observable<TradeWithStatus[]>
): Observable<MigrationFormState> {

  const manualChange$ = new Subject<ManualChange>();

  const environmentChange$ = combineAndMerge(
    toBalanceChange(balance$),
    toOrdersChange(orders$)
  );

  const [proceed, proceedProgressChange$] =
    prepareProceed(migrate$);

  const change = manualChange$.next.bind(manualChange$);

  return balance$.pipe(
    first(),
    switchMap((balance) => {
      const initialState = {
        kind,
        change,
        proceed,
        balance,
        amount: balance,
        messages: [],
        orders: [],
        fromToken: kind === MigrationFormKind.sai2dai ? 'SAI' : 'DAI',
        cancelOffer: (cancelData: CancelData) =>
          calls$.pipe(
            first(),
            switchMap(calls => calls.cancelOffer2(cancelData))
          ).subscribe()
      };

      return merge(
        manualChange$,
        environmentChange$,
        proceedProgressChange$
      ).pipe(
        scan(applyChange, initialState),
        map(validate),
        map(checkIfIsReadyToProceed),
        scan(freezeIfInProgress),
      );
    })
  );
}
