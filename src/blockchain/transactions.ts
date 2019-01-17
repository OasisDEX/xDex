import {
  bindNodeCallback, combineLatest, Observable, of, Subject
} from 'rxjs';
import { takeWhileInclusive } from 'rxjs-take-while-inclusive';
import {
  catchError, filter, map, mergeMap,
  scan, shareReplay, startWith, take
} from 'rxjs/operators';
import { account$, context$, onEveryBlock$ } from './network';
import { web3 } from './web3';

export enum TxStatus {
  WaitingForApproval = 'WaitingForApproval',
  CancelledByTheUser = 'CancelledByTheUser',
  WaitingForConfirmation = 'WaitingForConfirmation',
  Success = 'Success',
  Error = 'Error',
  Failure = 'Failure'
}

export type TxState = {
  account: string;
  txNo: number;
  meta: any;
  start: Date;
  end?: Date,
  lastChange: Date
} & (
  | {
    status: TxStatus.WaitingForApproval;
  }
  | {
    status: TxStatus.CancelledByTheUser;
    error: any;
  } | {
    status: TxStatus.WaitingForConfirmation;
    txHash: string;
  } | {
    status: TxStatus.Success;
    txHash: string;
    blockNumber: number;
    receipt: any;
    confirmations: number,
    safeConfirmations: number
  } | {
    status: TxStatus.Failure;
    txHash: string;
    blockNumber: number;
    receipt: any;
  } | {
    status: TxStatus.Error;
    txHash: string;
    error: any
  });

let txCounter: number = 1;

export function send(
  account: string,
  meta: any,
  method: (...args: any[]) => string, // Any contract method
  ...args: any[]
): Observable<TxState> {

  const common = {
    account,
    meta,
    txNo: (txCounter += 1),
    start: new Date(),
    lastChange: new Date()
  };

  function successOrFailure(txHash: string,
                            receipt: any): Observable<TxState> {

    const end = new Date();

    if (receipt.status !== '0x1') {
      // TODO: failure should be confirmed!
      return of({
        ...common,
        txHash,
        receipt,
        end,
        lastChange: end,
        blockNumber: receipt.blockNumber,
        status: TxStatus.Failure,
      } as TxState);
    }

    // TODO: error handling!
    return combineLatest(context$, onEveryBlock$).pipe(
      mergeMap(([context, blockNumber]) => of({
        ...common,
        txHash,
        receipt,
        end,
        lastChange: new Date(),
        blockNumber: receipt.blockNumber,
        status: TxStatus.Success,
        confirmations: Math.max(0, blockNumber - receipt.blockNumber),
        safeConfirmations: context.safeConfirmations,
      } as TxState)),
      takeWhileInclusive(state =>
        state.status === TxStatus.Success &&
        state.confirmations < state.safeConfirmations));
  }

  const result: Observable<TxState> = bindNodeCallback(method)(...args).pipe(
    mergeMap((txHash: string) => {
      return onEveryBlock$.pipe(
        mergeMap(() => bindNodeCallback(web3.eth.getTransactionReceipt)(txHash)),
        filter(receipt => !!receipt),
        // to prevent degenerated infura response...
        filter((receipt: any) => receipt.blockNumber !== undefined),
        take(1),
        mergeMap(receipt => successOrFailure(txHash, receipt)),
        catchError((error) => {
          return of({
            ...common,
            txHash,
            error,
            end: new Date(),
            lastChange: new Date(),
            status: TxStatus.Error
          } as TxState);
        }),
        startWith({
          ...common,
          txHash,
          status: TxStatus.WaitingForConfirmation
        } as TxState)
      );
    }),
    catchError(error =>
      of({
        ...common,
        error,
        end: new Date(),
        lastChange: new Date(),
        status: TxStatus.CancelledByTheUser
      })
    ),
    startWith({
      ...common,
      status: TxStatus.WaitingForApproval
    })
  );

  result.subscribe(state => transactionObserver.next(state));

  return result;
}

export const transactionObserver: Subject<TxState> = new Subject();

export const transactions$: Observable<TxState[]> = combineLatest(
  transactionObserver.pipe(
    scan((transactions: TxState[], newState: TxState) => {
      const result = [...transactions];
      const i = result.findIndex(
        t => t.txNo === newState.txNo
      );
      if (i >= 0) {
        result[i] = newState;
      } else {
        result.push(newState);
      }
      return result;
    },   []),

  ),
  account$
).pipe(
  map(([transactions, account]) =>
    transactions.filter((t: TxState) => t.account === account)
  ),
  startWith([]),
  shareReplay(1)
);
