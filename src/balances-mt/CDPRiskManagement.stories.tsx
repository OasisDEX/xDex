import { storiesOf } from '@storybook/react';
import * as React from 'react';

import { BigNumber } from 'bignumber.js';
import { MTHistoryEvent } from '../marginTrading/state/mtAccount';
import { calculateMarginable } from '../marginTrading/state/mtCalculate';
import { getMarginableCore } from '../marginTrading/state/mtTestUtils';
import { CDPRiskManagement } from './CDPRiskManagement';

const stories = storiesOf('Balances/CDP risk management', module);
//
// const wethEmpty = calculateMarginable(
//   getMarginableCore({
//     name: 'WETH',
//     referencePrice: new BigNumber('200'),
//     minCollRatio: new BigNumber('1.5'),
//     safeCollRatio: new BigNumber('2'),
//   }),
//   zero,
// );

const wethMarginableBase = {
  name: 'WETH',
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
      token: 'WETH',
      kind: 'deal',
      timestamp: 1545297643,
      id: new BigNumber(3),
    } as MTHistoryEvent]
  };
  const weth = calculateMarginable(
    getMarginableCore(wethErrorBase),
  );
  return (
      <CDPRiskManagement {...weth } open={() => null} />
  );
});
