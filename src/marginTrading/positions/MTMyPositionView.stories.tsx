import { storiesOf } from '@storybook/react';
import { BigNumber } from 'bignumber.js';
import * as React from 'react';
import { of } from 'rxjs/index';
import { TxState } from '../../blockchain/transactions';
import { MTAccount, MTAccountState, MTHistoryEventKind } from '../state/mtAccount';
import { calculateMarginable } from '../state/mtCalculate';
import { RawMTHistoryEvent } from '../state/mtHistory';
import { getMarginableCore, getMTAccount } from '../state/mtTestUtils';
import { MTTransferFormState } from '../transfer/mtTransferForm';
import { MTMyPositionPanel } from './MTMyPositionPanel';
import { MTMyPositionView } from './MTMyPositionView';

const stories = storiesOf('Leverage Trading/My Position Panel', module)
  .addDecorator(story => (
    <div style={{ width: '932px', background: '#ffffff' }}>
      {story()}
    </div>)
  );

const assetCore = {
  name: 'WETH',
  balance: new BigNumber(20),
  walletBalance: new BigNumber(0),
  allowance: true,
  debt: new BigNumber(3000),
  minCollRatio: new BigNumber(1.5),
  safeCollRatio: new BigNumber(2),
};

const leverageHistory: RawMTHistoryEvent[] = [
  {
    kind: MTHistoryEventKind.buyLev,
    amount: new BigNumber(20),
    payAmount: new BigNumber(3000),
    timestamp: 1573140000,
    token: 'WETH'
  } as RawMTHistoryEvent,
];

const liquidationHistory: RawMTHistoryEvent[] = [
  {
    kind: MTHistoryEventKind.bite,
    id: 1,
    lot: new BigNumber(5),
    bid: new BigNumber(1000),
    timestamp: 1573141000,
    token: 'WETH'
  } as RawMTHistoryEvent,
  {
    kind: MTHistoryEventKind.kick,
    id: 1,
    lot: new BigNumber(5),
    bid: new BigNumber(0),
    tab: new BigNumber(1200),
    timestamp: 1573141010,
    token: 'WETH'
  } as RawMTHistoryEvent,
  {
    kind: MTHistoryEventKind.tend,
    id: 1,
    lot: new BigNumber(5),
    bid: new BigNumber(1200),
    timestamp: 1573141020,
    token: 'WETH'
  } as RawMTHistoryEvent,
];

const ethMarginableAsset = calculateMarginable(getMarginableCore({
  ...assetCore,
  referencePrice: new BigNumber(250),
  osmPriceNext: new BigNumber(250),
  rawHistory: leverageHistory
}));

const mta: MTAccount = getMTAccount({ marginableAssets: [ethMarginableAsset] });

stories.add('CDP 1 - no liquidation', () => (
  <MTMyPositionView
    {...{
      mta,
      ma:ethMarginableAsset,
      createMTFundForm$: () => of({} as MTTransferFormState),
      redeem: () => null,
      open: () => null,
      approveMTProxy: (_args: {token: string; proxyAddress: string}) => of({} as TxState)
    }
    } />
));

const ethMarginableAsset2 = calculateMarginable(getMarginableCore({
  ...assetCore,
  referencePrice: new BigNumber(250),
  osmPriceNext: new BigNumber(130),
  // zzz: moment(new Date()).add(67, 'minutes').toDate(),
  zzz: new BigNumber(1),
  rawHistory: leverageHistory
}));

const mta2: MTAccount = getMTAccount({ marginableAssets: [ethMarginableAsset2] });

stories.add('CDP 1 - liquidation imminent', () => (
  <MTMyPositionView
    {...{
      mta: mta2,
      ma:ethMarginableAsset2,
      createMTFundForm$: () => of({} as MTTransferFormState),
      redeem: () => null,
      open: () => null,
      approveMTProxy: (_args: {token: string; proxyAddress: string}) => of({} as TxState)
    }
    } />
));

const ethMarginableAsset3 = calculateMarginable(getMarginableCore({
  ...assetCore,
  referencePrice: new BigNumber(130),
  osmPriceNext: new BigNumber(130),
  rawHistory: [...leverageHistory, ...liquidationHistory]
}));

const mta3: MTAccount = getMTAccount({ marginableAssets: [ethMarginableAsset3] });

stories.add('CDP 1 - liquidation ongoing', () => (
  <MTMyPositionView
    {...{
      mta: mta3,
      ma:ethMarginableAsset3,
      createMTFundForm$: () => of({} as MTTransferFormState),
      redeem: () => null,
      open: () => null,
      approveMTProxy: (_args: {token: string; proxyAddress: string}) => of({} as TxState)
    }
    } />
));

liquidationHistory.push({
  kind: MTHistoryEventKind.dent,
  id: 1,
  lot: new BigNumber(4.2),
  bid: new BigNumber(1200),
  timestamp: 1573141030,
  token: 'WETH'
} as RawMTHistoryEvent
);
liquidationHistory.push({
  kind: MTHistoryEventKind.deal,
  id: 1,
  timestamp: 1573141040,
  token: 'WETH'
} as RawMTHistoryEvent
);

const ethMarginableAsset4 = calculateMarginable(getMarginableCore({
  ...assetCore,
  referencePrice: new BigNumber(130),
  osmPriceNext: new BigNumber(130),
  redeemable: new BigNumber(0.8),
  rawHistory: [...leverageHistory, ...liquidationHistory]
}));

const mta4: MTAccount = getMTAccount({ marginableAssets: [ethMarginableAsset4] });

stories.add('CDP 1 - liquidation ongoing 2', () => (
  <MTMyPositionView
    {...{
      mta: mta4,
      ma:ethMarginableAsset4,
      redeem: () => null,
      createMTFundForm$: () => of({} as MTTransferFormState),
      open: () => null,
      approveMTProxy: (_args: {token: string; proxyAddress: string}) => of({} as TxState)
    }
    } />
));

const ethMarginableAsset5 = calculateMarginable(getMarginableCore({
  ...assetCore,
  referencePrice: new BigNumber(250),
  osmPriceNext: new BigNumber(250),
  redeemable: new BigNumber(0.8),
  rawHistory: [...leverageHistory, ...liquidationHistory]
}));

const mta5: MTAccount = getMTAccount({ marginableAssets: [ethMarginableAsset5] });

stories.add('CDP 1 - liquidation ended with redeem', () => (
  <MTMyPositionView
    {...{
      mta: mta5,
      ma:ethMarginableAsset5,
      createMTFundForm$: () => of({} as MTTransferFormState),
      redeem: () => null,
      open: () => null,
      approveMTProxy: (_args: {token: string; proxyAddress: string}) => of({} as TxState)
    }
    } />
));

liquidationHistory.push({
  kind: MTHistoryEventKind.redeem,
  id: 1,
  timestamp: 1573141040,
  token: 'WETH',
  amount: new BigNumber(0.8)
} as RawMTHistoryEvent);

const ethMarginableAsset6 = calculateMarginable(getMarginableCore({
  ...assetCore,
  referencePrice: new BigNumber(250),
  osmPriceNext: new BigNumber(250),
  redeemable: new BigNumber(0),
  rawHistory: [...leverageHistory, ...liquidationHistory]
}));

const mta6: MTAccount = getMTAccount({ marginableAssets: [ethMarginableAsset6] });

stories.add('CDP 1 - liquidation ended. After redeem', () => (
  <MTMyPositionView
    {...{
      mta: mta6,
      ma:ethMarginableAsset6,
      createMTFundForm$: () => of({} as MTTransferFormState),
      redeem: () => null,
      open: () => null,
      approveMTProxy: (_args: {token: string; proxyAddress: string}) => of({} as TxState)
    }
    } />
));

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
      redeem: () => null
    }}
    status="loaded"
    open={ () => null}
  />
));

stories.add('Not setup', () => (
  <MTMyPositionPanel
    value={{
      ...defaultBalancesProps,
      account: '0x123',
      mta: { state: MTAccountState.notSetup } as MTAccount,
      ma: ethMarginableAsset,
      redeem: () => null
    }}
    status="loaded"
    open={ () => null }
  />
));
