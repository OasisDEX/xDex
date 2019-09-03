import { storiesOf } from '@storybook/react';
import { BigNumber } from 'bignumber.js';
import * as React from 'react';
import { calculateMarginable } from '../state/mtCalculate';
import { getMarginableCore } from '../state/mtTestUtils';
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
  // ma core
  debt: new BigNumber(5000),
  referencePrice: new BigNumber(200),
  minCollRatio: new BigNumber(1.5),
  safeCollRatio: new BigNumber(1.9),
  // maxSafeLeverage: new BigNumber(2),
}));

stories.add('CDP 1', () => (
  <MTMyPositionView {...ethMarginableAsset} />
));
