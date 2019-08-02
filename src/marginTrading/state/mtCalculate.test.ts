import { BigNumber } from 'bignumber.js';

import { setupFakeWeb3ForTesting } from '../../blockchain/web3';
setupFakeWeb3ForTesting();

import { zero } from '../../utils/zero';
import { CashAssetCore, MarginableAssetCore, MTAccount } from './mtAccount';
import {
  getCashCore,
  getMarginableCore,
  getMTAccount,
  getNonMarginableCore
} from './mtTestUtils';

const noCash: CashAssetCore = getCashCore({
  name: 'DAI',
  balance: zero,
  walletBalance: zero,
});

const cash: CashAssetCore = {
  ...noCash,
  balance: new BigNumber('30000'),
};

const wethEmpty: MarginableAssetCore = getMarginableCore({
  name: 'W-ETH',
  referencePrice: new BigNumber('200'),
  minCollRatio: new BigNumber('1.5'),
  safeCollRatio: new BigNumber('2'),
});

const dgxEmpty: MarginableAssetCore = getMarginableCore({
  name: 'DGX',
  referencePrice: new BigNumber('50'),
  minCollRatio: new BigNumber('1.1'),
  safeCollRatio: new BigNumber('1.2'),
});

test('no cash, no assets', () => {

  const mta: MTAccount = getMTAccount();

  expect(mta.totalAssetValue).toEqual(zero);
  expect(mta.totalDebt).toEqual(zero);
});

test('just cash, no assets', () => {

  const mta: MTAccount = getMTAccount({ cash });

  expect(mta.totalAssetValue).toEqual(cash.balance);
  expect(mta.totalDebt).toEqual(zero);
});

test('cash, empty weth', () => {

  const mta: MTAccount = getMTAccount({ cash, marginableAssets: [wethEmpty] });

  expect(mta.totalAssetValue).toEqual(cash.balance);
  expect(mta.totalDebt).toEqual(zero);

  const weth = mta.marginableAssets[0];

  expect(weth.purchasingPower).toEqual(cash.balance.times(weth.maxSafeLeverage));
});

test('weth with debt', () => {

  const wethWithDebt = {
    ...wethEmpty,
    balance: new BigNumber('100'),
    debt: new BigNumber('2000')
  };

  const mta: MTAccount = getMTAccount({ marginableAssets: [wethWithDebt] });

  const weth = mta.marginableAssets[0];

  expect(mta.totalAssetValue).toEqual(weth.balanceInCash);
  expect(mta.totalDebt).toEqual(weth.debt);

  expect(weth.purchasingPower).toEqual(
    weth.balanceInCash.div(weth.safeCollRatio)
    .minus(weth.debt)
    .times(weth.maxSafeLeverage));
});

test('weth with full debt', () => {

  const wethWithDebt = {
    ...wethEmpty,
    balance: new BigNumber('100'),
    debt: new BigNumber('10000')
  };

  const mta: MTAccount = getMTAccount({ marginableAssets: [wethWithDebt] });

  const weth = mta.marginableAssets[0];

  expect(mta.totalAssetValue).toEqual(weth.balanceInCash);
  expect(mta.totalDebt).toEqual(weth.debt);

  expect(weth.purchasingPower).toEqual(
    weth.balanceInCash.div(weth.safeCollRatio)
    .minus(weth.debt)
    .times(weth.maxSafeLeverage));
  expect(weth.purchasingPower).toEqual(zero);
});

test('weth and dgx with debt', () => {

  const wethWithDebt = {
    ...wethEmpty,
    balance: new BigNumber('100'),
    debt: new BigNumber('2000')
  };

  const dgxAsset = {
    ...dgxEmpty,
    balance: new BigNumber('100'),
    debt: new BigNumber(10),
  };

  const mta: MTAccount = getMTAccount({ marginableAssets: [wethWithDebt, dgxAsset] });

  const weth = mta.marginableAssets[0];
  const dgx = mta.marginableAssets[1];

  expect(mta.totalAssetValue)
    .toEqual(weth.balanceInCash.plus(dgx.balanceInCash));

  expect(mta.totalDebt).toEqual(weth.debt.plus(dgx.debt));

  expect(weth.purchasingPower).toEqual(
    dgx.balanceInCash.div(dgx.safeCollRatio)
    .plus(weth.balanceInCash.div(weth.safeCollRatio))
    .minus(mta.totalDebt)
    .times(weth.maxSafeLeverage));

  expect(dgx.purchasingPower).toEqual(
    dgx.balanceInCash.div(dgx.safeCollRatio)
    .plus(weth.balanceInCash.div(weth.safeCollRatio))
    .minus(mta.totalDebt)
    .times(dgx.maxSafeLeverage));
});

test('cash, weth, dgx and mkr, no debt', () => {

  const wethAsset = {
    ...wethEmpty,
    balance: new BigNumber('100'),
  };

  const dgxAsset = {
    ...dgxEmpty,
    balance: new BigNumber('100'),
  };

  const mkrAsset = getNonMarginableCore({ name: 'MKR', balance: new BigNumber(50) });

  const mta: MTAccount = getMTAccount({
    cash,
    marginableAssets: [wethAsset, dgxAsset],
    nonMarginableAssets: [mkrAsset]
  });

  const weth = mta.marginableAssets[0];
  const dgx = mta.marginableAssets[1];
  const mkr = mta.nonMarginableAssets[0];

  expect(mta.totalAssetValue)
    .toEqual(cash.balance.plus(weth.balanceInCash).plus(dgx.balanceInCash));

  expect(mta.totalDebt).toEqual(zero);

  expect(weth.purchasingPower).toEqual(
    cash.balance
    .plus(dgx.balanceInCash.div(dgx.safeCollRatio))
    .plus(weth.balanceInCash.div(weth.safeCollRatio))
    .times(weth.maxSafeLeverage));

  expect(dgx.purchasingPower).toEqual(
    cash.balance
    .plus(dgx.balanceInCash.div(dgx.safeCollRatio))
    .plus(weth.balanceInCash.div(weth.safeCollRatio))
    .times(dgx.maxSafeLeverage));

  expect(mkr.purchasingPower).toEqual(
    cash.balance
      .plus(dgx.balanceInCash.div(dgx.safeCollRatio))
      .plus(weth.balanceInCash.div(weth.safeCollRatio))
  );
});
