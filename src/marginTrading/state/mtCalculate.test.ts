import { BigNumber } from 'bignumber.js';

import { setupFakeWeb3ForTesting } from '../../blockchain/web3';
setupFakeWeb3ForTesting();

import { zero } from '../../utils/zero';
import { CashAssetCore, MarginableAssetCore, MTAccount } from './mtAccount';
import {
  calculateMarginable,
  calculateMTHistoryEvents,
  realPurchasingPowerMarginable
} from './mtCalculate';
import {
  dai100,
  rawHistoryBuy,
  rawHistoryBuySell,
  sellOffers,
  sellOffersShort,
  weth1dai100,
  weth2
} from './mtCalculateFixtures';
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
  name: 'WETH',
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
  // const mkr = mta.nonMarginableAssets[0];

  expect(mta.totalAssetValue)
    .toEqual(cash.balance.plus(weth.balanceInCash).plus(dgx.balanceInCash));

  expect(mta.totalDebt).toEqual(zero);
});

test('Purchasing power marginable', () => {
  const purchasingPower = realPurchasingPowerMarginable(
    calculateMarginable(weth2),
    sellOffers
  );
  expect(purchasingPower).toEqual(new BigNumber(1518));
});

test('Purchasing power marginable - shallow orderbook', () => {
  const purchasingPower = realPurchasingPowerMarginable(
    calculateMarginable(weth2),
    sellOffersShort
  );
  expect(purchasingPower).toEqual(new BigNumber(301));
});

test('Purchasing power marginable - cash only', () => {
  const purchasingPower = realPurchasingPowerMarginable(
    calculateMarginable(dai100),
    sellOffers
  );
  expect(purchasingPower.toFixed(0)).toEqual(new BigNumber(150).toFixed());
});

test('Purchasing power marginable - cash + collateral', () => {
  const purchasingPower = realPurchasingPowerMarginable(
    calculateMarginable(weth1dai100),
    sellOffers
  );
  expect(purchasingPower.toFixed(0)).toEqual(new BigNumber(299).toFixed());
});

test('Events history - BuyLev', () => {

  const history = calculateMTHistoryEvents(rawHistoryBuy, weth2);

  expect(history[2].debtDelta).toEqual(new BigNumber('100'));
  expect(history[2].dDAIAmount).toEqual(new BigNumber('300'));
  expect(history[2].dAmount).toEqual(new BigNumber('1'));
});

test('Events history - SellLev', () => {

  const history = calculateMTHistoryEvents(rawHistoryBuySell, weth2);

  expect(history[3].debtDelta).toEqual(new BigNumber('-100'));
  expect(history[3].dDAIAmount).toEqual(new BigNumber('250'));
  expect(history[3].dAmount).toEqual(new BigNumber('1'));
});
