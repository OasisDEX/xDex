/*
 * Copyright (C) 2020 Maker Ecosystem Growth Holdings, INC.
 */

import { BigNumber } from 'bignumber.js';

import { setupFakeWeb3ForTesting } from '../../blockchain/web3';
import { fakeOrderbook } from '../../exchange/depthChart/depthchart.test';
setupFakeWeb3ForTesting();

import { one, zero } from '../../utils/zero';
import { CashAssetCore, MarginableAssetCore, MTAccount } from './mtAccount';
import {
  calculateMarginable,
  calculateMTHistoryEvents,
  maxSellable,
  realPurchasingPowerMarginable,
  sellable,
} from './mtCalculate';
import {
  dai100,
  rawHistoryBuy,
  rawHistoryBuySell,
  sell1,
  sell2,
  sell3,
  sellOffers,
  sellOffersShort,
  weth1dai100,
  weth2,
} from './mtCalculateFixtures';
import { getCashCore, getMarginableCore, getMTAccount } from './mtTestUtils';

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

test('weth with debt', () => {
  const wethWithDebt = {
    ...wethEmpty,
    balance: new BigNumber('100'),
    debt: new BigNumber('2000'),
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
    debt: new BigNumber('10000'),
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
    debt: new BigNumber('2000'),
  };

  const dgxAsset = {
    ...dgxEmpty,
    balance: new BigNumber('100'),
    debt: new BigNumber(10),
  };

  const mta: MTAccount = getMTAccount({ marginableAssets: [wethWithDebt, dgxAsset] });

  const weth = mta.marginableAssets[0];
  const dgx = mta.marginableAssets[1];

  expect(mta.totalAssetValue).toEqual(weth.balanceInCash.plus(dgx.balanceInCash));

  expect(mta.totalDebt).toEqual(weth.debt.plus(dgx.debt));
});

test('weth, dgx and mkr, no debt', () => {
  const wethAsset = {
    ...wethEmpty,
    balance: new BigNumber('100'),
  };

  const dgxAsset = {
    ...dgxEmpty,
    balance: new BigNumber('100'),
  };

  // const mkrAsset = getNonMarginableCore({ name: 'MKR', balance: new BigNumber(50) });

  const mta: MTAccount = getMTAccount({
    cash,
    marginableAssets: [wethAsset, dgxAsset],
    // nonMarginableAssets: [mkrAsset]
  });

  const weth = mta.marginableAssets[0];
  const dgx = mta.marginableAssets[1];
  // const mkr = mta.nonMarginableAssets[0];

  expect(mta.totalAssetValue).toEqual(weth.balanceInCash.plus(dgx.balanceInCash));

  expect(mta.totalDebt).toEqual(zero);
});

describe('Purchasing power marginable', () => {
  test('Collateral only', () => {
    const [, purchasingPower] = realPurchasingPowerMarginable(calculateMarginable(weth2, fakeOrderbook), sellOffers);
    expect(purchasingPower).toEqual(new BigNumber(299.981689453125));
  });

  test('Shallow orderbook', () => {
    const [, purchasingPower] = realPurchasingPowerMarginable(
      calculateMarginable(weth2, fakeOrderbook),
      sellOffersShort,
    );
    expect(purchasingPower).toEqual(new BigNumber(299.981689453125));
  });

  test('Cash only', () => {
    const [, purchasingPower] = realPurchasingPowerMarginable(calculateMarginable(dai100, fakeOrderbook), sellOffers);
    expect(purchasingPower.toFixed(0)).toEqual(new BigNumber(150).toFixed());
  });

  test('A bit of cash only', () => {
    const [, purchasingPower] = realPurchasingPowerMarginable(
      calculateMarginable({ ...dai100, referencePrice: new BigNumber('300'), dai: new BigNumber('5') }, fakeOrderbook),
      sellOffers,
    );
    expect(purchasingPower.toFixed(0)).toEqual(new BigNumber(5).toFixed());
  });

  test('A bit of cash only 2', () => {
    const [, purchasingPower] = realPurchasingPowerMarginable(
      calculateMarginable({ ...dai100, referencePrice: new BigNumber('300'), dai: new BigNumber('20') }, fakeOrderbook),
      sellOffers,
    );
    expect(purchasingPower.toFixed(0)).toEqual(new BigNumber(20).toFixed());
  });

  test('A bit of cash only 3', () => {
    const [, purchasingPower] = realPurchasingPowerMarginable(
      calculateMarginable({ ...dai100, referencePrice: new BigNumber('300'), dai: new BigNumber('31') }, fakeOrderbook),
      // sellOffers
      [sell1, sell1, sell1, sell1, sell2, sell3],
    );
    expect(purchasingPower.toFixed(0)).toEqual(new BigNumber(62).toFixed());
  });

  test('Cash + collateral', () => {
    const [, purchasingPower] = realPurchasingPowerMarginable(
      calculateMarginable(weth1dai100, fakeOrderbook),
      sellOffers,
    );
    expect(purchasingPower.toFixed(0)).toEqual(new BigNumber(300).toFixed());
  });

  test('Debt', () => {
    const [, purchasingPower] = realPurchasingPowerMarginable(
      calculateMarginable({ ...weth2, debt: new BigNumber('140') }, fakeOrderbook),
      sellOffers,
    );
    expect(purchasingPower.toFixed(0)).toEqual(new BigNumber(20).toFixed());
  });
});

test('Events history - BuyMultiple', () => {
  const history = calculateMTHistoryEvents(rawHistoryBuy, weth2);

  expect(history[2].debtDelta).toEqual(new BigNumber('100'));
  expect(history[2].dDAIAmount).toEqual(new BigNumber('300'));
  expect(history[2].dAmount).toEqual(new BigNumber('1'));
});

test('Events history - SellMultiple', () => {
  const history = calculateMTHistoryEvents(rawHistoryBuySell, weth2);

  expect(history[3].debtDelta).toEqual(new BigNumber('-100'));
  expect(history[3].dDAIAmount).toEqual(new BigNumber('250'));
  expect(history[3].dAmount).toEqual(new BigNumber('1'));
});

describe('Is position sellable', () => {
  test('No debt, prices match', () => {
    const ma = calculateMarginable(weth2, fakeOrderbook);

    const [result] = sellable(ma, sellOffers, one);

    expect(result).toBeTruthy();
  });

  test('No debt, prices match - partial sell', () => {
    const ma = calculateMarginable(weth2, fakeOrderbook);

    const [result] = sellable(ma, sellOffers, new BigNumber(0.9));

    expect(result).toBeTruthy();
  });

  test('Avg debt, prices match', () => {
    const ma = calculateMarginable(
      {
        ...weth2,
        debt: new BigNumber('150'),
      },
      fakeOrderbook,
    );

    const [result] = sellable(ma, sellOffers, one);

    expect(result).toBeTruthy();
  });

  test('Large debt, prices match', () => {
    const ma = calculateMarginable(
      {
        ...weth2,
        debt: new BigNumber('199'),
      },
      fakeOrderbook,
    );

    const [result] = sellable(ma, sellOffers, one);

    expect(result).toBeFalsy();
  });

  test('Avg debt, prices match', () => {
    const ma = calculateMarginable(
      {
        ...weth2,
        debt: new BigNumber('300'),
        referencePrice: new BigNumber('600'),
      },
      fakeOrderbook,
    );

    const [result] = sellable(ma, sellOffers, one);

    expect(result).toBeFalsy();
  });

  test("Don't jump over dust", () => {
    const ma = calculateMarginable(
      getMarginableCore({
        name: 'WETH',
        referencePrice: new BigNumber('300'),
        minCollRatio: new BigNumber('1.5'),
        safeCollRatio: new BigNumber('2'),
        balance: new BigNumber('0.11'),
        debt: new BigNumber('21'),
      }),
      fakeOrderbook,
    );

    const sellableAmount = new BigNumber('0.011');
    const [result, , , message] = sellable(ma, sellOffers, sellableAmount);
    expect(result).toBeFalsy();
    expect(message).toEqual("Can't jump over dust");
  });
});

describe('Calculate maxSellable', () => {
  test('Partially sellable, dust', () => {
    const ma = calculateMarginable(
      getMarginableCore({
        name: 'WETH',
        referencePrice: new BigNumber('300'),
        minCollRatio: new BigNumber('1.5'),
        safeCollRatio: new BigNumber('2'),
        balance: new BigNumber('0.11'),
        debt: new BigNumber('21'),
      }),
      fakeOrderbook,
    );
    const result = maxSellable(ma, sellOffers);
    expect(result).toEqual(new BigNumber('0.009998626708984375'));
  });

  test('Partially sellable, too many iterations', () => {
    const ma = calculateMarginable(
      getMarginableCore({
        name: 'WETH',
        referencePrice: new BigNumber('300'),
        minCollRatio: new BigNumber('1.5'),
        safeCollRatio: new BigNumber('2'),
        balance: new BigNumber('1'),
        debt: new BigNumber('199'),
      }),
      fakeOrderbook,
    );
    const result = maxSellable(ma, sellOffers);
    expect(result.gt(zero)).toBeTruthy();
  });

  test('Fully sellable, no debt', () => {
    const ma = calculateMarginable(
      getMarginableCore({
        name: 'WETH',
        referencePrice: new BigNumber('300'),
        minCollRatio: new BigNumber('1.5'),
        safeCollRatio: new BigNumber('2'),
        balance: new BigNumber('0.11'),
        debt: new BigNumber('0'),
      }),
      fakeOrderbook,
    );
    const result = maxSellable(ma, sellOffers);
    expect(result).toEqual(new BigNumber('0.11'));
  });

  test('Fully sellable, small debt', () => {
    const ma = calculateMarginable(
      getMarginableCore({
        name: 'WETH',
        referencePrice: new BigNumber('300'),
        minCollRatio: new BigNumber('1.5'),
        safeCollRatio: new BigNumber('2'),
        balance: new BigNumber('0.11'),
        debt: new BigNumber('0.001'),
      }),
      fakeOrderbook,
    );
    const result = maxSellable(ma, sellOffers);
    expect(result).toEqual(new BigNumber('0.11'));
  });
});
