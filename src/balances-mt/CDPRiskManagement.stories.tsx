import { storiesOf } from '@storybook/react';
import * as React from 'react';

import { BigNumber } from 'bignumber.js';
import { calculateMarginable } from '../marginTrading/state/mtCalculate';
import { MTHistoryEvent } from '../marginTrading/state/mtHistory';
import { getMarginableCore } from '../marginTrading/state/mtTestUtils';
import { CDPRiskManagement } from './CDPRiskManagement';

const stories = storiesOf('Balances/CDP risk management', module);
//
// const wethEmpty = calculateMarginable(
//   getMarginableCore({
//     name: 'W-ETH',
//     referencePrice: new BigNumber('200'),
//     minCollRatio: new BigNumber('1.5'),
//     safeCollRatio: new BigNumber('2'),
//   }),
//   zero,
// );

const wethMarginableBase = {
  name: 'W-ETH',
  balance: new BigNumber(2000),
  walletBalance: new BigNumber(1000),
  allowance: true,
  // ma core
  debt: new BigNumber(150000),
  referencePrice: new BigNumber(200),
  minCollRatio: new BigNumber(1.5),
  safeCollRatio: new BigNumber(1.9),
  // maxSafeLeverage: new BigNumber(2),
};

const ethMarginableAsset = calculateMarginable(
  getMarginableCore(wethMarginableBase),
  new BigNumber(5000),
);

// stories.add('Empty weth', () => {
//   return (
//       <CDPRiskManagement {...wethEmpty} />
//   );
// });

stories.add('Weth without debt', () => {
  const wethWithoutDebtBase = {
    ...wethMarginableBase,
    debt: new BigNumber(0),
  };
  const weth = calculateMarginable(
    getMarginableCore(wethWithoutDebtBase),
    new BigNumber(5000),
  );
  return (
      <CDPRiskManagement {...weth } open={() => null} />
  );
});
stories.add('Marginable weth ', () => (
    <CDPRiskManagement {...ethMarginableAsset} open={() => null} />
  )
);

stories.add('Unsafe marginable weth ', () => {
  const wethUnsafeBase = {
    ...wethMarginableBase,
    debt: new BigNumber(215000),
  };
  const weth = calculateMarginable(
    getMarginableCore(wethUnsafeBase),
    new BigNumber(5000),
  );
  return (
      <CDPRiskManagement {...weth } open={() => null} />
  );
});

stories.add('Marginable weth below minimum', () => {
  const wethErrorBase = {
    ...wethMarginableBase,
    debt: new BigNumber(275000),
    history: [{
      token: 'W-ETH',
      kind: 'deal',
      timestamp: 1545297643,
      id: new BigNumber(3),
    } as MTHistoryEvent]
  };
  const weth = calculateMarginable(
    getMarginableCore(wethErrorBase),
    new BigNumber(5000),
  );
  return (
      <CDPRiskManagement {...weth } open={() => null} />
  );
});
