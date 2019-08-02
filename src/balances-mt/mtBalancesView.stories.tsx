import { storiesOf } from '@storybook/react';
import * as React from 'react';

import { BigNumber } from 'bignumber.js';
import { of } from 'rxjs';
import { AssetKind } from '../blockchain/config';
import { TxState } from '../blockchain/transactions';
import { MTAllocateState } from '../marginTrading/allocate/mtOrderAllocateDebtForm';
import { CashAssetCore, findAsset, MarginableAssetCore } from '../marginTrading/state/mtAccount';
import { getMTAccount, getNotSetupMTAccount } from '../marginTrading/state/mtTestUtils';
import { MTTransferFormState } from '../marginTrading/transfer/mtTransferForm';
import { Panel, PanelHeader } from '../utils/panel/Panel';
import { CombinedBalance } from './balances';
import { MTBalancesViewInternal } from './mtBalancesView';

const stories = storiesOf('Balances/Balances', module)
  .addDecorator(story => (
    <Panel style={{ width: '932px' }}>
      <PanelHeader>Asset overview</PanelHeader>
      {story()}
    </Panel>
));

const wethMarginableFixture = {
  assetKind: AssetKind.marginable,
  name: 'W-ETH',
  balance: new BigNumber(0),
  walletBalance: new BigNumber(3),
  // availableActions: [{ kind: UserActionKind.fund }]
}  as Partial<MarginableAssetCore>;

const wethBalance = {
  name: 'W-ETH',
  walletBalance: new BigNumber(3),
  marginBalance: new BigNumber(0),
  mtAssetValueInDAI: new BigNumber(4.349804),
} as CombinedBalance;

const daiCashFixture = {
  name: 'DAI',
  balance: new BigNumber(3),
  walletBalance: new BigNumber(4.5),
  allowance: true,
  // availableActions: [{ kind: UserActionKind.draw }, { kind: UserActionKind.fund }]
} as Partial<CashAssetCore>;

const daiBalance = {
  name: 'DAI',
  walletBalance: new BigNumber(4.5),
  marginBalance: new BigNumber(3),
  mtAssetValueInDAI: new BigNumber(7.5),
} as CombinedBalance;

const mkrMarginableFixture = {
  name: 'MKR',
  balance: new BigNumber(20),
  walletBalance: new BigNumber(0),
  allowance: true,
  // availableActions: [{ kind: UserActionKind.draw }]
} as Partial<MarginableAssetCore>;

const mkrBalance = {
  name: 'MKR',
  walletBalance: new BigNumber(0),
  marginBalance: new BigNumber(20),
  mtAssetValueInDAI: new BigNumber(154.1245789),
} as CombinedBalance;

const defaultMta = getMTAccount({
  cash: daiCashFixture,
  marginableAssets: [wethMarginableFixture, mkrMarginableFixture],
});

const defaultBalancesProps = {
  open: () => null,
  createMTFundForm$: () => of({} as MTTransferFormState),
  createMTAllocateForm$: () => of({} as MTAllocateState),
  approveMTProxy: (_args: {token: string; proxyAddress: string}) => of({} as TxState)
};

stories.add('Empty balances', () => (
    <MTBalancesViewInternal
      {...defaultBalancesProps}
      mta={getNotSetupMTAccount()}
      balances={[]}/>
  )
);

stories.add('Balances when mta not setup', () => {
  return (
    <MTBalancesViewInternal
      {...defaultBalancesProps}
      mta={getNotSetupMTAccount()}
      balances={[wethBalance, daiBalance]}
    />
  );
});

stories.add('Sample balances with allowances', () => {
  const wethMarginable = {
    ...wethBalance,
    asset: findAsset('W-ETH', defaultMta),
  };
  const daiMarginable = {
    ...daiBalance,
    asset: findAsset('DAI', defaultMta),
  };
  const mkrMarginable = {
    ...mkrBalance,
    asset: findAsset('MKR', defaultMta),
  };
  return (
    <MTBalancesViewInternal
      {...defaultBalancesProps}
      mta={defaultMta}
      balances={[wethMarginable, daiMarginable, mkrMarginable]}
    />
  );
});

stories.add('Sample balances with ETH nonexisting in mta', () => {
  const wethMarginable = {
    ...wethBalance,
    asset: findAsset('W-ETH', defaultMta),
  };
  const daiMarginable = {
    ...daiBalance,
    asset: findAsset('DAI', defaultMta),
  };
  const mkrMarginable = {
    ...mkrBalance,
    asset: findAsset('MKR', defaultMta),
  };
  const ethBalance = {
    name: 'ETH',
    walletBalance: new BigNumber(895),
    marginBalance: new BigNumber(0),
    mtAssetValueInDAI: new BigNumber(325),
  } as CombinedBalance;
  return (
    <MTBalancesViewInternal
      {...defaultBalancesProps}
      mta={defaultMta}
      balances={[ethBalance, wethMarginable, daiMarginable, mkrMarginable]}
    />
  );
});

stories.add('Balances without allowance for DAI', () => {
  const daiAssetWoAllowance = {
    ...daiCashFixture,
    allowance: false,
    balance: new BigNumber(0),
    availableActions: [],
  };
  const mta = getMTAccount({
    cash: daiAssetWoAllowance,
    marginableAssets: [wethMarginableFixture, mkrMarginableFixture]
  });
  const wethMarginable = {
    ...wethBalance,
    asset: findAsset('W-ETH', mta),
  };
  const daiMarginable = {
    ...daiBalance,
    asset: findAsset('DAI', mta),
    totalValueInDAI: new BigNumber(4.5) };
  const mkrMarginable = {
    ...mkrBalance,
    asset: findAsset('MKR', mta),
  };
  return (
    <MTBalancesViewInternal
      {...defaultBalancesProps}
      mta={mta}
      balances={[wethMarginable, daiMarginable, mkrMarginable]}
    />
  );
});
