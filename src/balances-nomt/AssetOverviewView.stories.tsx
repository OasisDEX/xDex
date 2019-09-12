import { storiesOf } from '@storybook/react';
import { BigNumber } from 'bignumber.js';
import * as React from 'react';
import { of } from 'rxjs';
import { TxState } from '../blockchain/transactions';
import { Panel, PanelHeader } from '../utils/panel/Panel';
import { zero } from '../utils/zero';
import { WrapUnwrapFormState } from '../wrapUnwrap/wrapUnwrapForm';
import { AssetsOverviewViewInternal } from './AssetOverviewView';
import { CombinedBalance } from './balances';

const stories = storiesOf('Balances/Balances', module)
  .addDecorator(story => (
    <Panel style={{ width: '932px' }}>
      <PanelHeader>Asset overview</PanelHeader>
        {story()}
    </Panel>
));

const wethBalance = {
  name: 'WETH',
  balance: new BigNumber(3),
  allowance: true,
} as CombinedBalance;

const daiBalance = {
  name: 'DAI',
  balance: new BigNumber(4.5),
  allowance: true,
} as CombinedBalance;

const defaultBalancesProps = {
  open: () => null,
  approveWallet: (_token: string) => of({} as TxState),
  disapproveWallet: (_token: string) => of({} as TxState),
  etherBalance: zero,
  etherValueInUsd: zero,
  wrapUnwrapForm$: () => of({} as WrapUnwrapFormState),
};

stories.add('Empty balances nomt', () => (
    <AssetsOverviewViewInternal
      {...defaultBalancesProps}
      balances={[]}/>
  )
);

stories.add('Sample balances with allowances nomt', () => {
  return (
    <AssetsOverviewViewInternal
      {...defaultBalancesProps}
      balances={[wethBalance, daiBalance]}
    />
  );
});

stories.add('Sample balances with ETH ', () => {
  return (
    <AssetsOverviewViewInternal
      {...defaultBalancesProps}
      etherBalance={new BigNumber(895)}
      balances={[wethBalance, daiBalance]}
    />
  );
});

stories.add('Balances without allowance for DAI nomt', () => {
  const daiAssetWoAllowance = {
    ...daiBalance,
    allowance: false,
  };
  return (
    <AssetsOverviewViewInternal
      {...defaultBalancesProps}
      balances={[wethBalance, daiAssetWoAllowance]}
    />
  );
});

stories.add('Balances with zero WETH', () => {
  const wethZeroBalance = {
    ...wethBalance,
    balance: zero,
  };
  return (
    <AssetsOverviewViewInternal
      {...defaultBalancesProps}
      balances={[wethZeroBalance, daiBalance]}
    />
  );
});
