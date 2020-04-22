import { storiesOf } from '@storybook/react';
import { BigNumber } from 'bignumber.js';
import * as React from 'react';

import { of } from 'rxjs/index';
import { TxState } from '../blockchain/transactions';
import { wethEmpty } from '../marginTrading/plan/planFixtures';
import { MTAccount } from '../marginTrading/state/mtAccount';
import { getMTAccount } from '../marginTrading/state/mtTestUtils';
import { Panel } from '../utils/panel/Panel';
import { WrapUnwrapFormState } from '../wrapUnwrap/wrapUnwrapForm';
import { CombinedBalance, CombinedBalances } from './balances';
import { WalletViewInternal } from './WalletView';

const stories = storiesOf('Account/My Wallet', module).addDecorator((story) => (
  <Panel>
    <div style={{ width: '932px' }}>{story()}</div>
  </Panel>
));

const wethWithDebt = {
  ...wethEmpty,
  balance: new BigNumber('100'),
  debt: new BigNumber('2000'),
};

const mta: MTAccount = getMTAccount({ marginableAssets: [wethWithDebt] });

const balance1: CombinedBalance = {
  name: 'WETH',
  walletBalance: new BigNumber(100),
  mtAssetValueInDAI: new BigNumber(20000),
  allowance: true,
  walletBalanceInUSD: new BigNumber(1000),
  allowanceChangeInProgress: false,
};

const balance2: CombinedBalance = {
  name: 'DAI',
  walletBalance: new BigNumber(1000),
  mtAssetValueInDAI: new BigNumber(1000),
  walletBalanceInUSD: new BigNumber(1000),
  allowance: false,
  allowanceChangeInProgress: false,
};

const balance3: CombinedBalance = {
  name: 'DGD',
  walletBalance: new BigNumber(100),
  mtAssetValueInDAI: new BigNumber(1500),
  walletBalanceInUSD: new BigNumber(1000),
  allowance: false,
  allowanceChangeInProgress: false,
};

const walletViewParams = {
  mta,
  balances: [balance1, balance2, balance3],
} as CombinedBalances;

stories.add('My Wallet - Assets', () => (
  <WalletViewInternal
    {...walletViewParams}
    {...{
      open: () => null,
      wrapUnwrapForm$: () => of({} as WrapUnwrapFormState),
      approveWallet: () => of({} as TxState),
      disapproveWallet: () => of({} as TxState),
    }}
  />
));
