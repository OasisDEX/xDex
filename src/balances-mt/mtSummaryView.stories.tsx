import { storiesOf } from '@storybook/react';
import { BigNumber } from 'bignumber.js';
import * as React from 'react';

import { MTAccountState } from '../marginTrading/state/mtAccount';
import { MtSummaryView } from './mtSummaryView';

const stories = storiesOf('Balances/MT summary', module)
  .addDecorator(story => (
    <div style={{ width: '932px' }}>
      {story()}
    </div>
  ));

stories.add('Sample: 8k debt, 30k total assets', () => (
  <MtSummaryView
    totalDebt={new BigNumber(8000)}
    totalEquity={ new BigNumber(30000) }
    totalCurrentLeverage={new BigNumber('1.36')}
    state={ MTAccountState.setup }
  />
));

stories.add('Sample: 0 debt, 30k total assets', () => (
  <MtSummaryView
    totalDebt={new BigNumber(0)}
    totalEquity={ new BigNumber(30000) }
    totalCurrentLeverage={new BigNumber('1')}
  state={ MTAccountState.setup }
  />
));

stories.add('Sample: no assets', () => (
  <MtSummaryView
    totalDebt={new BigNumber(0)}
    totalEquity={ new BigNumber(0) }
    totalCurrentLeverage={ undefined }
    state={ MTAccountState.setup }
  />
));
