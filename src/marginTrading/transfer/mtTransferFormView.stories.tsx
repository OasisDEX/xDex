/*
 * Copyright (C) 2020 Maker Ecosystem Growth Holdings, INC.
 */

import { storiesOf } from '@storybook/react';
import * as React from 'react';
import { of } from 'rxjs';

import { BigNumber } from 'bignumber.js';
import { AssetKind } from '../../blockchain/config';
import { TxState } from '../../blockchain/transactions';
import { GasEstimationStatus, ProgressStage } from '../../utils/form';
import { MTAllocateState } from '../allocate/mtOrderAllocateDebtForm';
import { MTAccount, MTAccountState, UserActionKind } from '../state/mtAccount';
import { MessageKind } from './mtTransferForm';
import { MtTransferFormView } from './mtTransferFormView';

const stories = storiesOf('Margin Trading/Transfer', module);

const defaultParams = {
  // stage
  actionKind: UserActionKind.fund as UserActionKind.fund | UserActionKind.draw,
  mta: {
    state: MTAccountState.setup,
    cash: {
      name: 'DAI',
      balance: new BigNumber(345),
      walletBalance: new BigNumber(52),
      marginBalance: new BigNumber(0),
      assetKind: AssetKind.cash,
      allowance: true,
      availableActions: [],
      rawHistory: [],
      rawLiquidationHistory: [],
    },
    liquidationPricePost: new BigNumber(2),
    leveragePost: new BigNumber(4),
    balancePost: new BigNumber(5),
    daiBalance: new BigNumber(6),
    daiBalancePost: new BigNumber(6),
    daiAllowance: true,
    realPurchasingPower: new BigNumber(7),
    realPurchasingPowerPost: new BigNumber(7),
    marginableAssets: [],
    nonMarginableAssets: [],
    totalAssetValue: new BigNumber(3),
    totalDebt: new BigNumber(4),
    totalAvailableDebt: new BigNumber(0),
    totalLeverage: new BigNumber(5),
    proxy: null,
    approve: () => of({} as TxState),
  } as MTAccount,
  messages: [],
  // amount
  token: 'DAI',
  // progress: ProgressStage.waitingForApproval,
  change: () => null,
  transfer: () => null,
  setup: () => null,
  allowance: () => null,
  cancel: () => null,
  reset: () => null,
  gasEstimationStatus: GasEstimationStatus.unset,
  close: () => null,
  open: () => null,
  createMTAllocateForm$: () => of({} as MTAllocateState),
};

stories.add('FormStage is editing (default)', () => (
  <div style={{ width: '932px' }}>
    <MtTransferFormView {...defaultParams} />
  </div>
));

stories.add('FormStage is editing with validation error', () => (
  <div style={{ width: '932px' }}>
    <MtTransferFormView
      {...defaultParams}
      messages={[{ kind: MessageKind.insufficientAmount }]}
      amount={new BigNumber(152345)}
    />
  </div>
));

stories.add('FormStage is readyToProceed', () => (
  <div style={{ width: '932px' }}>
    <MtTransferFormView {...defaultParams} amount={new BigNumber(15)} />
  </div>
));

stories.add('ProgressStage is waitingForApproval', () => (
  <div style={{ width: '932px' }}>
    <MtTransferFormView {...defaultParams} progress={ProgressStage.waitingForApproval} amount={new BigNumber(15)} />
  </div>
));

stories.add('ProgressStage is waitingForConfirmation', () => (
  <div style={{ width: '932px' }}>
    <MtTransferFormView {...defaultParams} progress={ProgressStage.waitingForConfirmation} amount={new BigNumber(15)} />
  </div>
));

stories.add('ProgressStage is done', () => (
  <div style={{ width: '932px' }}>
    <MtTransferFormView {...defaultParams} progress={ProgressStage.done} amount={new BigNumber(15)} />
  </div>
));

stories.add('ProgressStage is fiasco', () => (
  <div style={{ width: '932px' }}>
    <MtTransferFormView {...defaultParams} progress={ProgressStage.fiasco} amount={new BigNumber(15)} />
  </div>
));
