import { setupFakeWeb3ForTesting } from '../blockchain/web3';
setupFakeWeb3ForTesting();

import { BigNumber } from 'bignumber.js';
import { of } from 'rxjs';

import { MTAccountState } from '../marginTrading/state/mtAccount';
import { calculateMTAccount } from '../marginTrading/state/mtCalculate';
import {
  getCashCore,
  getMarginableCore,
} from '../marginTrading/state/mtTestUtils';
import { unpack } from '../utils/testHelpers';
import { zero } from '../utils/zero';

const ethMarginableAsset = getMarginableCore({
  name: 'ETH',
  balance: new BigNumber(100),
  // ma core
  debt: new BigNumber(5000),
  referencePrice: new BigNumber(200),
});

// const dgxMarginableAsset = getMarginableCore({
//   name: 'DGX', // DGX
//   balance: new BigNumber(20),
//   // ma core
//   debt: new BigNumber(3000),
//   referencePrice: new BigNumber(500),
// });
//
// const daiCashAsset = getCashCore({
//   name: 'DAI',
//   balance: new BigNumber(0),
//   walletBalance: new BigNumber(500),
//   allowance: true,
//   // ca core
// });
//
// test('mta with empty assets', () => {
//   // total debt => 0
//   // total assets => 0
//   // lev = undefined => -
//   const mta = calculateMTAccount(
//     {},
//     // daiCashAsset,
//     [{
//       ...ethMarginableAsset,
//       debt: zero,
//       balance: zero,
//     }, {
//       ...dgxMarginableAsset,
//       debt: zero,
//       balance: zero,
//     }],
//     []
//   );
//   const summary = createMTSummary$(of(mta));
//   expect(unpack(summary).totalDebt).toEqual(zero);
//   expect(unpack(summary).totalEquity).toEqual(zero);
//   expect(unpack(summary).totalCurrentLeverage).toBeUndefined();
//   expect(unpack(summary).state).toEqual(MTAccountState.setup);
// });
//
// test('8k debt, 30k total assets', () => {
//   const mta = calculateMTAccount(
//     {},
//     // daiCashAsset,
//     [ethMarginableAsset, dgxMarginableAsset],
//     []
//   );
//   // total debt = 8k
//   // total assets = 30k
//   // curr lev = 1.36
//   const summary = createMTSummary$(of(mta));
//   expect(unpack(summary).totalDebt).toEqual(new BigNumber(8000));
//   expect(unpack(summary).totalEquity).toEqual(new BigNumber(30000));
//   expect(unpack(summary).totalCurrentLeverage.toFixed(2)).toEqual('1.36');
//   expect(unpack(summary).state).toEqual(MTAccountState.setup);
// });
//
// test('0 debt, 30k total assets', () => {
//   const mta = calculateMTAccount(
//     {},
//     // daiCashAsset,
//     [{
//       ...ethMarginableAsset,
//       debt: zero,
//     }, {
//       ...dgxMarginableAsset,
//       debt: zero,
//     }],
//     []
//   );
//   // total debt = 0
//   // total assets = 30k
//   // curr lev = 1
//   const summary = createMTSummary$(of(mta));
//   expect(unpack(summary).totalDebt).toEqual(zero);
//   expect(unpack(summary).totalEquity).toEqual(new BigNumber(30000));
//   expect(unpack(summary).totalCurrentLeverage).toEqual(new BigNumber('1'));
//   expect(unpack(summary).state).toEqual(MTAccountState.setup);
// });
