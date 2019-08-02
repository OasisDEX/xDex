import { BigNumber } from 'bignumber.js';
import { Observable, of } from 'rxjs/index';
import { shareReplay } from 'rxjs/operators';

import { setupFakeWeb3ForTesting } from '../../blockchain/web3';
setupFakeWeb3ForTesting();

import { Calls } from '../../blockchain/calls/calls';
import { TxState, TxStatus } from '../../blockchain/transactions';
import { FormChangeKind, GasEstimationStatus, ProgressStage } from '../../utils/form';
import { unpack } from '../../utils/testHelpers';
import {
  UserActionKind
} from '../state/mtAccount';
import { calculateMTAccount } from '../state/mtCalculate';
import { getCashCore, getMarginableCore } from '../state/mtTestUtils';
import { createMTTransferForm$, MessageKind, MTTransferFormState } from './mtTransferForm';

const defParams = {
  mta$: calculateMTAccount(
    undefined,
    getCashCore({
      name: 'DAI',
      balance: new BigNumber(0),
      walletBalance: new BigNumber(100),
    }),
    [getMarginableCore({
      name: 'MKR',
      balance: new BigNumber(20),
      walletBalance: new BigNumber(0),
      allowance: true
    })],
    [],
  ),
  gasPrice$: of(new BigNumber(100)),
  etherPriceUsd$: of(new BigNumber(13)),
};

const defaultBalances = {
  ETH: new BigNumber(3),
  'W-ETH': new BigNumber(12),
  DAI: new BigNumber(100),
  MKR: new BigNumber(0),
};

// @ts-ignore
const defaultCalls: Calls = {
  mtDraw: () => of({ status: TxStatus.WaitingForApproval } as TxState),
// @ts-ignore
  mtDrawEstimateGas: () => of(new BigNumber(200000000)),
  mtFund: () => of({ status: TxStatus.WaitingForApproval } as TxState),
  // @ts-ignore
  mtFundEstimateGas: () => of(new BigNumber(200000000)),
};

function createForm(props?: {}): Observable<MTTransferFormState> {
  const params = {
    mta: of(defParams.mta$),
    gasPrice: defParams.gasPrice$,
    etherPriceUsd: defParams.etherPriceUsd$,
    balances: of(defaultBalances),
    calls: of(defaultCalls),
    kind: UserActionKind.fund,
    token: 'DAI',
    ...props,
  };
  return createMTTransferForm$(
    params.mta,
    params.gasPrice,
    params.etherPriceUsd,
    params.balances,
    params.calls,
    of(),
    params.kind as UserActionKind.fund | UserActionKind.draw,
    params.token
  ).pipe(
    shareReplay(1)
  );
}

test('initial fund state', () => {
  const transferForm = createForm();
  expect(unpack(transferForm).actionKind).toEqual(UserActionKind.fund);
  expect(unpack(transferForm).balances).toEqual(defaultBalances);
  expect(unpack(transferForm).messages).toEqual([]);
  expect(unpack(transferForm).amount).toBeUndefined();
  expect(unpack(transferForm).token).toEqual('DAI');
  expect(unpack(transferForm).progress).toBeUndefined();
  expect(unpack(transferForm).gasEstimationStatus).toEqual(GasEstimationStatus.unset);
});

test('set amount for fund', () => {
  const transferForm = createForm();
  const { change } = unpack(transferForm);

  change({ kind: FormChangeKind.amountFieldChange, value: new BigNumber(2) });

  expect(unpack(transferForm).amount).toEqual(new BigNumber(2));
  expect(unpack(transferForm).progress).toBeUndefined();
  expect(unpack(transferForm).gasEstimationStatus).toEqual(GasEstimationStatus.calculated);
});

test('validation -- too big amount for fund', () => {
  const transferForm = createForm();
  const { change } = unpack(transferForm);

  change({ kind: FormChangeKind.amountFieldChange, value: new BigNumber(200) });

  expect(unpack(transferForm).amount).toEqual(new BigNumber(200));
  expect(unpack(transferForm).readyToProceed).toBeFalsy();
  expect(unpack(transferForm).progress).toBeUndefined();
  expect(unpack(transferForm).gasEstimationStatus).toEqual(GasEstimationStatus.unset);
  expect(unpack(transferForm).messages.length).toEqual(1);
  expect(unpack(transferForm).messages).toEqual([{ kind: MessageKind.insufficientAmount }]);
});

test('validation -- too big amount for draw', () => {
  const transferForm = createForm({ kind: UserActionKind.draw });
  const { change } = unpack(transferForm);

  change({ kind: FormChangeKind.amountFieldChange, value: new BigNumber(2) });

  expect(unpack(transferForm).amount).toEqual(new BigNumber(2));
  expect(unpack(transferForm).readyToProceed).toBeFalsy();
  expect(unpack(transferForm).progress).toBeUndefined();
  expect(unpack(transferForm).gasEstimationStatus).toEqual(GasEstimationStatus.unset);
  expect(unpack(transferForm).messages.length).toEqual(1);
  expect(unpack(transferForm).messages).toEqual([{ kind: MessageKind.insufficientAmount }]);
});

test('proceed fund DAI', () => {
  const transferForm = createForm({
    calls: of({
      ...defaultCalls,
      mtPerformOperations: () => of({ status: TxStatus.WaitingForApproval } as TxState),
    })
  });
  const { change, transfer } = unpack(transferForm);

  change({ kind: FormChangeKind.amountFieldChange, value: new BigNumber(2) });
  // expect(unpack(transferForm).stage).toEqual(FormStage.blocked);

  transfer(unpack(transferForm));
  expect(unpack(transferForm).progress).toEqual(ProgressStage.waitingForApproval);
});

test('proceed fund DAI confirmed', () => {
  const transferForm = createForm({
    calls: of({
      ...defaultCalls,
      mtFund: () => of(
          { status: TxStatus.WaitingForApproval } as TxState,
          { status: TxStatus.WaitingForConfirmation } as TxState,
        ),
    })
  });
  const { change, transfer } = unpack(transferForm);

  change({ kind: FormChangeKind.amountFieldChange, value: new BigNumber(2) });
  // expect(unpack(transferForm).stage).toEqual(FormStage.blocked);

  transfer(unpack(transferForm));
  expect(unpack(transferForm).progress).toEqual(ProgressStage.waitingForConfirmation);
});

test('proceed fund DAI success', () => {
  const transferForm = createForm({
    calls: of({
      ...defaultCalls,
      mtFund: () => of(
          { status: TxStatus.WaitingForApproval } as TxState,
          { status: TxStatus.WaitingForConfirmation } as TxState,
          { status: TxStatus.Success } as TxState,
        ),
    })
  });
  const { change, transfer } = unpack(transferForm);

  change({ kind: FormChangeKind.amountFieldChange, value: new BigNumber(2) });
  // expect(unpack(transferForm).stage).toEqual(FormStage.blocked);

  transfer(unpack(transferForm));
  expect(unpack(transferForm).progress).toEqual(ProgressStage.done);
});

test('reset after fund DAI success', () => {
  const transferForm = createForm({
    calls: of({
      ...defaultCalls,
      mtFund: () => of(
          { status: TxStatus.WaitingForApproval } as TxState,
          { status: TxStatus.WaitingForConfirmation } as TxState,
          { status: TxStatus.Success } as TxState,
        ),
    })
  });
  const { change, transfer, reset } = unpack(transferForm);

  change({ kind: FormChangeKind.amountFieldChange, value: new BigNumber(2) });
  transfer(unpack(transferForm));
  expect(unpack(transferForm).progress).toEqual(ProgressStage.done);

  reset();

  expect(unpack(transferForm).progress).toBeUndefined();
  expect(unpack(transferForm).amount).toEqual(new BigNumber(2));
  // expect(unpack(transferForm).stage).toEqual(FormStage.blocked);
  expect(unpack(transferForm).gasEstimationStatus).toEqual(GasEstimationStatus.calculated);
});

test('set amount for fund and cancel', () => {
  const transferForm = createForm();
  const { change, cancel, transfer } = unpack(transferForm);

  change({ kind: FormChangeKind.amountFieldChange, value: new BigNumber(2) });
  transfer(unpack(transferForm));

  expect(unpack(transferForm).progress).toEqual(ProgressStage.waitingForApproval);
  expect(unpack(transferForm).amount).toEqual(new BigNumber(2));
  // expect(unpack(transferForm).stage).toEqual(FormStage.blocked);
  expect(unpack(transferForm).gasEstimationStatus).toEqual(GasEstimationStatus.calculated);

  cancel();
  expect(unpack(transferForm).progress).toEqual(ProgressStage.canceled);
  expect(unpack(transferForm).amount).toEqual(new BigNumber(2));
  // expect(unpack(transferForm).stage).toEqual(FormStage.blocked);
  expect(unpack(transferForm).gasEstimationStatus).toEqual(GasEstimationStatus.calculated);
});

// ----------------------- draw MKR ------------------
test('initial draw MKR state', () => {
  const transferForm = createForm({
    kind: UserActionKind.draw,
    token: 'MKR',
  });
  // expect(unpack(transferForm).stage).toEqual(FormStage.idle);
  expect(unpack(transferForm).actionKind).toEqual(UserActionKind.draw);
  expect(unpack(transferForm).balances).toEqual(defaultBalances);
  expect(unpack(transferForm).messages).toEqual([]);
  expect(unpack(transferForm).amount).toBeUndefined();
  expect(unpack(transferForm).token).toEqual('MKR');
  expect(unpack(transferForm).progress).toBeUndefined();
  expect(unpack(transferForm).gasEstimationStatus).toEqual(GasEstimationStatus.unset);
});

test.skip('set amount for draw MKR', () => {
  const transferForm = createForm({
    kind: UserActionKind.draw,
    token: 'MKR',
  });
  const { change } = unpack(transferForm);

  change({ kind: FormChangeKind.amountFieldChange, value: new BigNumber(2) });

  expect(unpack(transferForm).amount).toEqual(new BigNumber(2));
  console.log(unpack(transferForm));
  // expect(unpack(transferForm).stage).toEqual(FormStage.blocked);
  expect(unpack(transferForm).progress).toBeUndefined();
  expect(unpack(transferForm).gasEstimationStatus).toEqual(GasEstimationStatus.calculated);
});

test.skip('proceed draw MKR', () => {
  const transferForm = createForm({
    kind: UserActionKind.draw,
    token: 'MKR',
    calls: of({
      ...defaultCalls,
      mtDraw: () => of({ status: TxStatus.WaitingForApproval } as TxState),
    })
  });
  const { change, transfer } = unpack(transferForm);

  change({ kind: FormChangeKind.amountFieldChange, value: new BigNumber(2) });

  // expect(unpack(transferForm).stage).toEqual(FormStage.blocked);

  transfer(unpack(transferForm));
  expect(unpack(transferForm).progress).toEqual(ProgressStage.waitingForApproval);
});

test('validation -- to big amount for draw W-ETH', () => {
  const transferForm = createForm({
    kind: UserActionKind.draw,
    token: 'W-ETH',
  });
  const { change } = unpack(transferForm);

  change({ kind: FormChangeKind.amountFieldChange, value: new BigNumber(2) });

  expect(unpack(transferForm).amount).toEqual(new BigNumber(2));
  // expect(unpack(transferForm).stage).toEqual(FormStage.idle);
  expect(unpack(transferForm).progress).toBeUndefined();
  expect(unpack(transferForm).gasEstimationStatus).toEqual(GasEstimationStatus.unset);
  expect(unpack(transferForm).messages).toEqual([{ kind: MessageKind.insufficientAmount }]);
});

test('try to transfer when mta is undefined', () => {
  const transferForm = createForm({
    mta: of(undefined),
  });
  const { change, transfer } = unpack(transferForm);

  // expect(unpack(transferForm).stage).toEqual(FormStage.idle);
  change({ kind: FormChangeKind.amountFieldChange, value: new BigNumber(2) });
  // expect(unpack(transferForm).stage).toEqual(FormStage.idle); // didn't change

  transfer(unpack(transferForm));
  expect(unpack(transferForm).progress).toBeUndefined();
});
