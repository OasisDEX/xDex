import { BigNumber } from 'bignumber.js';
import { of } from 'rxjs/internal/observable/of';

import { setupFakeWeb3ForTesting } from '../../blockchain/web3';
setupFakeWeb3ForTesting();

import { Calls$ } from '../../blockchain/calls/calls';
import { FormStage } from '../../utils/form';
import { unpack } from '../../utils/testHelpers';
import { MTAccount, MTAccountState } from '../state/mtAccount';
import { createMTSetupForm$ } from './mtSetupForm';

// @ts-ignore
const defaultCalls$: Calls$ = of({
  setupMTProxy: () => null,
});

function createForm(props?: {}) {
  const params = {
    mta: of({ state: MTAccountState.notSetup } as MTAccount),
    calls: defaultCalls$,
    gasPrice: of(new BigNumber(100)),
    etherPriceUsd: of(new BigNumber(13)),
    ...props,
  };
  return createMTSetupForm$(
    params.mta,
    params.calls,
    params.gasPrice,
    params.etherPriceUsd
  ).pipe(
    // shareReplay(1)
  );
}

test('initial setup form state', () => {
  const setupForm = createForm();
  expect(unpack(setupForm).stage).toEqual(FormStage.idle);
  expect(unpack(setupForm).mtaState).toEqual(MTAccountState.notSetup);
});

// test('click setup ', () => {
//   const setupForm = createForm();
//   const { setup } = unpack(setupForm);
//
//   setup();
//
//   expect(unpack(setupForm).stage).toEqual(FormStage.blocked);
//   expect(unpack(setupForm).mtaState).toEqual(MTAccountState.notSetup);
// });
