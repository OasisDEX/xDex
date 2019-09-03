import { storiesOf } from '@storybook/react';
import { BigNumber } from 'bignumber.js';
import * as React from 'react';
import { of } from 'rxjs';

import { FormStage, ProgressStage } from '../../utils/form';
import { MTAccountState } from '../state/mtAccount';
import { MTSetupButton, MTSetupModal } from './mtSetupFormView';

const stories = storiesOf('Margin Trading/Create proxy', module);

const defaultMtSetupButton = {
  setup: () => of({
    stage: ProgressStage.waitingForApproval,
    cancel: () => null,
  }),
  open: () => null,
  stage: FormStage.idle,
  mtaState: MTAccountState.notSetup,
};

const defaultMTSetupProgressState = {
  cancel: () => null,
  close: () => null,
  gasEstimationEth: new BigNumber(0.01152),
  gasEstimationUsd: new BigNumber(2.34),
};

stories.add('Create proxy button', () => (
  <div>
    <h3>Form stage = Not setup</h3>
    <MTSetupButton
      {...defaultMtSetupButton}
      mtaState={MTAccountState.notSetup}
      stage={FormStage.idle}
    />
    <h3>Form stage = Not setup, but stage blocked</h3>
    <MTSetupButton
      {...defaultMtSetupButton}
      mtaState={MTAccountState.notSetup}
      stage={FormStage.blocked}
    />
    <h3>Form stage = setup</h3>
    <MTSetupButton
      {...defaultMtSetupButton}
      mtaState={MTAccountState.setup}
      stage={FormStage.idle}
    />
  </div>
));

stories.add('Modal - waiting for approval', () => (
  <div>
    <div style={{ display: 'flex', flexDirection: 'row-reverse' }}>
      <MTSetupModal
        {...defaultMTSetupProgressState}
        stage={ProgressStage.waitingForApproval}
      />
    </div>
  </div>
));

stories.add('Modal - waiting for confirmation', () => (
  <div>
    <div style={{ display: 'flex', flexDirection: 'row-reverse' }}>
      <MTSetupModal
        {...defaultMTSetupProgressState}
        stage={ProgressStage.waitingForConfirmation}
      />
    </div>
  </div>
));

stories.add('Modal - done', () => (
  <div>
    <div style={{ display: 'flex', flexDirection: 'row-reverse' }}>
      <MTSetupModal
        {...defaultMTSetupProgressState}
        stage={ProgressStage.done}
      />
    </div>
  </div>
));

stories.add('Modal - canceled', () => (
  <div>
    <div style={{ display: 'flex', flexDirection: 'row-reverse' }}>
      <MTSetupModal
        {...defaultMTSetupProgressState}
        stage={ProgressStage.canceled}
      />
    </div>
  </div>
));

stories.add('Modal - fiasco', () => (
  <div>
    <div style={{ display: 'flex', flexDirection: 'row-reverse' }}>
      <MTSetupModal
        {...defaultMTSetupProgressState}
        stage={ProgressStage.fiasco}
      />
    </div>
  </div>
));
