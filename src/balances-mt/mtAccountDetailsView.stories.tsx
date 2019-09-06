import { storiesOf } from '@storybook/react';
import { BigNumber } from 'bignumber.js';
import * as React from 'react';

import { AssetKind } from '../blockchain/config';
import { MTAccount } from '../marginTrading/state/mtAccount';
import { calculateMTAccount } from '../marginTrading/state/mtCalculate';
import {
  getCashCore,
  getMarginableCore, getMTAccount,
  getNonMarginableCore
} from '../marginTrading/state/mtTestUtils';
import { MtAccountDetailsView } from './mtAccountDetailsView';

// const stories = storiesOf('Balances/Account details', module)
//   .addDecorator(story => (
//     <div style={{ width: '932px' }}>
//       {story()}
//     </div>
// ));
//
// const wethEmpty = getMarginableCore({
//   name: 'WETH',
//   referencePrice: new BigNumber('200'),
//   minCollRatio: new BigNumber('1.5'),
//   safeCollRatio: new BigNumber('2'),
// });
//
// const dgxEmpty = getMarginableCore({
//   name: 'DGX',
//   referencePrice: new BigNumber('50'),
//   minCollRatio: new BigNumber('1.1'),
//   safeCollRatio: new BigNumber('1.2'),
// });
//
// const ethMarginableAsset = getMarginableCore({
//   name: 'ETH',
//   balance: new BigNumber(100),
//   walletBalance: new BigNumber(100),
//   allowance: true,
//   // ma core
//   debt: new BigNumber(5000),
//   referencePrice: new BigNumber(200),
//   minCollRatio: new BigNumber(1.5),
//   safeCollRatio: new BigNumber(1.9),
//   // maxSafeLeverage: new BigNumber(2),
// });
//
// const mkrMarginableAsset = getMarginableCore({
//   name: 'DGX', // DGX
//   balance: new BigNumber(20),
//   walletBalance: new BigNumber(0),
//   allowance: true,
//   // ma core
//   assetKind: AssetKind.marginable,
//   debt: new BigNumber(3000),
//   referencePrice: new BigNumber(500),
//   minCollRatio: new BigNumber(1.8),
//   safeCollRatio: new BigNumber(2.5),
//   // maxSafeLeverage: new BigNumber(4),
// });
//
// const wethNonMarginableAsset = getNonMarginableCore({
//   name: 'WETH', // SPANK
//   balance: new BigNumber(20),
//   walletBalance: new BigNumber(0),
//   allowance: true,
//   // nma core
//   assetKind: AssetKind.nonMarginable,
//   referencePrice: new BigNumber(0.002),
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
// const defaultMta = calculateMTAccount(
//   null,
//   daiCashAsset,
//   [ethMarginableAsset, mkrMarginableAsset],
//   [wethNonMarginableAsset]
// );
//
// stories.add('Sample', () => (
//   <MtAccountDetailsView {...defaultMta} />
// ));
//
// stories.add('Test weth with debt', () => {
//
//   const wethWithDebt = {
//     ...wethEmpty,
//     balance: new BigNumber('100'),
//     debt: new BigNumber('2000')
//   };
//
//   const mta: MTAccount = getMTAccount({ marginableAssets: [wethWithDebt] });
//
//   return (
//     <MtAccountDetailsView {...mta} />
//   );
// });
//
// stories.add('Test weth with full debt', () => {
//
//   const wethWithDebt = {
//     ...wethEmpty,
//     balance: new BigNumber('100'),
//     debt: new BigNumber('10000')
//   };
//
//   const mta: MTAccount = getMTAccount({ marginableAssets: [wethWithDebt] });
//
//   return (
//     <MtAccountDetailsView {...mta} />
//   );
// });
//
// stories.add('Test weth and dgx with debt', () => {
//
//   const wethWithDebt = {
//     ...wethEmpty,
//     balance: new BigNumber('100'),
//     debt: new BigNumber('2000')
//   };
//
//   const dgxAsset = {
//     ...dgxEmpty,
//     balance: new BigNumber('100'),
//     debt: new BigNumber(10),
//   };
//
//   const mta: MTAccount = getMTAccount({ marginableAssets: [wethWithDebt, dgxAsset] });
//
//   return (
//     <MtAccountDetailsView {...mta} />
//   );
// });
//
// stories.add('Test cash, weth, dgx and mkr, no debt', () => {
//
//   const wethAsset = {
//     ...wethEmpty,
//     balance: new BigNumber('100'),
//   };
//
//   const dgxAsset = {
//     ...dgxEmpty,
//     balance: new BigNumber('100'),
//   };
//
//   const mkrAsset = getNonMarginableCore({
//     name: 'MKR',
//     balance: new BigNumber(50),
//     referencePrice: new BigNumber(500),
//   });
//
//   const mta: MTAccount = getMTAccount({
//     cash: getCashCore({ balance: new BigNumber('30000') }),
//     marginableAssets: [wethAsset, dgxAsset],
//     nonMarginableAssets: [mkrAsset]
//   });
//
//   return (
//     <MtAccountDetailsView {...mta} />
//   );
// });
