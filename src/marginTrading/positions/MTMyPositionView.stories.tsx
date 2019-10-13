import { storiesOf } from '@storybook/react';
import { BigNumber } from 'bignumber.js';
import * as React from 'react';
import { of } from 'rxjs/index';
import { TxState } from '../../blockchain/transactions';
import {  MTAccount, MTAccountState } from '../state/mtAccount';
import { calculateMarginable } from '../state/mtCalculate';
import { getMarginableCore } from '../state/mtTestUtils';
import { MTTransferFormState } from '../transfer/mtTransferForm';
import { MTMyPositionPanel } from './MTMyPositionPanel';
import { MTMyPositionView } from './MTMyPositionView';

const stories = storiesOf('Leverage Trading/My Position Panel', module)
 .addDecorator(story => (
    <div style={{ width: '932px', background: '#2F2F38' }}>
      {story()}
    </div>)
 );

const ethMarginableAsset = calculateMarginable(getMarginableCore({
  name: 'WETH',
  balance: new BigNumber(12.987654321),
  walletBalance: new BigNumber(100),
  allowance: true,
  debt: new BigNumber(2000),
  referencePrice: new BigNumber(200),
  minCollRatio: new BigNumber(1.5),
  safeCollRatio: new BigNumber(1.9),
}));

// stories.add('CDP 1', () => (
//   <MTMyPositionView
//     {...{
//       ma:ethMarginableAsset,
//       createMTFundForm$: () => of({} as MTTransferFormState),
//       open: () => null,
//     }
//   } />
// ));

const defaultBalancesProps = {
  createMTFundForm$: () => of({} as MTTransferFormState),
  approveMTProxy: (_args: {token: string; proxyAddress: string}) => of({} as TxState)
};

stories.add('Not connected', () => (
  <MTMyPositionPanel
    value={{
      ...defaultBalancesProps,
      account: undefined,
      mta: { state: MTAccountState.notSetup } as MTAccount,
      ma: ethMarginableAsset,
    }}
    status="loaded"
    open={ () => null
    }
  />
));

// stories.add('Not setup', () => (
//   <MTMyPositionPanel
//     value={{
//       ...defaultBalancesProps,
//       account: '0x123',
//       mta: { state: MTAccountState.notSetup } as MTAccount,
//       ma: ethMarginableAsset,
//     }}
//     status="loaded"
//     open={ () => null }
//   />
// ));
