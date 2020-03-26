import { BigNumber } from 'bignumber.js';
import { Observable, of } from 'rxjs';
import { shareReplay } from 'rxjs/internal/operators';
import { TxState, TxStatus } from '../../blockchain/transactions';
import { setupFakeWeb3ForTesting } from '../../blockchain/web3';
import { emptyOrderBook } from '../../exchange/depthChart/fakeOrderBook';
import { Orderbook } from '../../exchange/orderbook/orderbook';
import { FormChangeKind, GasEstimationStatus, ProgressStage } from '../../utils/form';
import { unpack } from '../../utils/testHelpers';
import { UserActionKind } from '../state/mtAccount';
import { calculateMTAccount } from '../state/mtCalculate';
import { getMarginableCore } from '../state/mtTestUtils';
import {
  createMTTransferForm$,
  MessageKind,
  MTTransferFormState,
  TransferFormChangeKind
} from './mtTransferForm';
setupFakeWeb3ForTesting();

const defParams = {
  mta$: calculateMTAccount(
    { options: {} },
    [getMarginableCore({
      name: 'WETH',
      balance: new BigNumber(20),
      walletBalance: new BigNumber(0),
      allowance: true,
      referencePrice: new BigNumber(500),
    })],
    true,
    {
      WETH: { buy: [], sell: [], tradingPair: { base: '', quote: '' }, blockNumber: 0 } as Orderbook
    }
  ),
  gasPrice$: of(new BigNumber(100)),
  etherPriceUsd$: of(new BigNumber(13)),
};

const defaultBalances = {
  ETH: new BigNumber(3),
  WETH: new BigNumber(12),
  DAI: new BigNumber(100),
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
    orderbook: of(emptyOrderBook),
    calls: of(defaultCalls),
    kind: UserActionKind.fund,
    token: 'WETH',
    ilk: 'WETH',
    withOnboarding: false,
    ...props,
  };

  // calls.mtDrawEstimateGas : calls.mtFundEstimateGas;

  return createMTTransferForm$(
    params.mta,
    params.gasPrice,
    params.etherPriceUsd,
    params.balances,
    params.orderbook,
    params.calls,
    // @ts-ignore
    of({}),
    {
      actionKind: params.kind as UserActionKind.fund | UserActionKind.draw,
      token: params.token,
      ilk: params.ilk,
      withOnboarding: params.withOnboarding,
    }
  ).pipe(
    shareReplay(1)
  );
}

test('initial fund state', () => {
  const transferForm = createForm();
  expect(unpack(transferForm).actionKind).toEqual(UserActionKind.fund);
  expect(unpack(transferForm).balances.WETH).toEqual(defaultBalances.WETH);
  expect(unpack(transferForm).balances.DAI).toEqual(defaultBalances.DAI);
  expect(unpack(transferForm).messages).toEqual([]);
  expect(unpack(transferForm).amount).toBeUndefined();
  expect(unpack(transferForm).token).toEqual('WETH');
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

test('validation -- too big amount for draw DAI', () => {
  const transferForm = createForm({ kind: UserActionKind.draw, token: 'DAI' });
  const { change } = unpack(transferForm);

  change({ kind: FormChangeKind.amountFieldChange, value: new BigNumber(2) });
  change({ kind: TransferFormChangeKind.ilkFieldChange, value: 'WETH' });

  expect(unpack(transferForm).amount).toEqual(new BigNumber(2));
  expect(unpack(transferForm).readyToProceed).toBeFalsy();
  expect(unpack(transferForm).progress).toBeUndefined();
  expect(unpack(transferForm).gasEstimationStatus).toEqual(GasEstimationStatus.unset);
  expect(unpack(transferForm).messages.length).toEqual(1);
  expect(unpack(transferForm).messages).toEqual([
    { kind: MessageKind.insufficientAvailableAmount, token: 'DAI' },
  ]);
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
  expect(unpack(transferForm).amount).toEqual(undefined);
  // expect(unpack(transferForm).stage).toEqual(FormStage.blocked);
  expect(unpack(transferForm).gasEstimationStatus).toEqual(GasEstimationStatus.unset);
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

// // ----------------------- draw MKR ------------------
// test('initial draw WETH state', () => {
//   const transferForm = createForm({
//     kind: UserActionKind.draw,
//     token: 'WETH',
//   });
//   // expect(unpack(transferForm).stage).toEqual(FormStage.idle);
//   expect(unpack(transferForm).actionKind).toEqual(UserActionKind.draw);
//   expect(unpack(transferForm).balances).toEqual(defaultBalances);
//   expect(unpack(transferForm).messages).toEqual([]);
//   expect(unpack(transferForm).amount).toBeUndefined();
//   expect(unpack(transferForm).token).toEqual('WETH');
//   expect(unpack(transferForm).progress).toBeUndefined();
//   expect(unpack(transferForm).gasEstimationStatus).toEqual(GasEstimationStatus.unset);
// });
//
// test.skip('set amount for draw MKR', () => {
//   const transferForm = createForm({
//     kind: UserActionKind.draw,
//     token: 'MKR',
//   });
//   const { change } = unpack(transferForm);
//
//   change({ kind: FormChangeKind.amountFieldChange, value: new BigNumber(2) });
//
//   expect(unpack(transferForm).amount).toEqual(new BigNumber(2));
//   console.log(unpack(transferForm));
//   // expect(unpack(transferForm).stage).toEqual(FormStage.blocked);
//   expect(unpack(transferForm).progress).toBeUndefined();
//   expect(unpack(transferForm).gasEstimationStatus).toEqual(GasEstimationStatus.calculated);
// });
//
// test.skip('proceed draw MKR', () => {
//   const transferForm = createForm({
//     kind: UserActionKind.draw,
//     token: 'MKR',
//     calls: of({
//       ...defaultCalls,
//       mtDraw: () => of({ status: TxStatus.WaitingForApproval } as TxState),
//     })
//   });
//   const { change, transfer } = unpack(transferForm);
//
//   change({ kind: FormChangeKind.amountFieldChange, value: new BigNumber(2) });
//
//   // expect(unpack(transferForm).stage).toEqual(FormStage.blocked);
//
//   transfer(unpack(transferForm));
//   expect(unpack(transferForm).progress).toEqual(ProgressStage.waitingForApproval);
// });
//
// test('validation -- to big amount for draw WETH', () => {
//   const transferForm = createForm({
//     kind: UserActionKind.draw,
//     token: 'WETH',
//   });
//   const { change } = unpack(transferForm);
//
//   change({ kind: FormChangeKind.amountFieldChange, value: new BigNumber(21) });
//
//   expect(unpack(transferForm).amount).toEqual(new BigNumber(21));
//   // expect(unpack(transferForm).stage).toEqual(FormStage.idle);
//   expect(unpack(transferForm).progress).toBeUndefined();
//   expect(unpack(transferForm).gasEstimationStatus).toEqual(GasEstimationStatus.unset);
//   expect(unpack(transferForm).messages).toEqual([
//     { kind: MessageKind.insufficientAvailableAmount },
//   ]);
// });
//
// test('try to transfer when mta is undefined', () => {
//   const transferForm = createForm({
//     mta: of(undefined),
//   });
//   const { change, transfer } = unpack(transferForm);
//
//   // expect(unpack(transferForm).stage).toEqual(FormStage.idle);
//   change({ kind: FormChangeKind.amountFieldChange, value: new BigNumber(2) });
//   // expect(unpack(transferForm).stage).toEqual(FormStage.idle); // didn't change
//
//   transfer(unpack(transferForm));
//   expect(unpack(transferForm).progress).toBeUndefined();
// });
