/*
 * Copyright (C) 2020 Maker Ecosystem Growth Holdings, INC.
 */

import { BigNumber } from 'bignumber.js';

import { setupFakeWeb3ForTesting } from '../../blockchain/web3';
setupFakeWeb3ForTesting();

import { impossible } from '../../utils/impossible';
import { zero } from '../../utils/zero';
import { getMTAccount } from '../state/mtTestUtils';
import { cash, sellOffers, weth100 } from './planFixtures';
import { planSell, prepareSellAllocationRequest } from './planSell';

describe('prepareSellAllocationRequest', () => {
  test('wrong asset', () => {
    const mta = getMTAccount({
      cash,
      marginableAssets: [weth100],
    });
    const request = prepareSellAllocationRequest(
      mta,
      sellOffers,
      'MKR',
      new BigNumber('120'),
      new BigNumber('200'),
      zero,
    );
    expect(request).toEqual(impossible('asset not setup'));
  });

  test('balance too small', () => {
    const mta = getMTAccount({
      cash,
      marginableAssets: [weth100],
    });
    const request = prepareSellAllocationRequest(
      mta,
      sellOffers,
      'WETH',
      new BigNumber('120'),
      new BigNumber('200'),
      zero,
    );
    expect(request).toEqual(impossible('balance too small'));
  });

  test('price too high', () => {
    const mta = getMTAccount({
      cash,
      marginableAssets: [weth100],
    });
    const request = prepareSellAllocationRequest(
      mta,
      sellOffers,
      'WETH',
      new BigNumber('100'),
      new BigNumber('20000'),
      zero,
    );
    expect(request).toEqual(impossible('price too high'));
  });

  test('coll ratio at min', () => {
    const mta = getMTAccount({
      cash,
      marginableAssets: [
        {
          ...weth100,
          debt: weth100.balance.times(weth100.referencePrice).div(weth100.minCollRatio),
        },
      ],
    });
    const request = prepareSellAllocationRequest(
      mta,
      sellOffers,
      'WETH',
      new BigNumber('100'),
      new BigNumber('200'),
      zero,
    );
    expect(request).toEqual(impossible('debt at max possible value'));
  });
});

describe('planSell', () => {
  test('no debt, sell all', () => {
    const plan = planSell(
      'WETH',
      new BigNumber('10'),
      new BigNumber('2000'),
      [
        {
          name: 'WETH',
          balance: zero,
          debt: zero,
          maxDebt: zero,
          minCollRatio: new BigNumber('1.5'),
          safeCollRatio: new BigNumber('2'),
          referencePrice: new BigNumber('200'),
          targetDebt: zero,
          delta: zero,
          liquidationPrice: zero,
          currentCollRatio: zero,
        },
      ],
      zero,
    );
    expect(plan).toEqual([
      {
        amount: new BigNumber('10'),
        kind: 'sellLev',
        maxTotal: new BigNumber('2000'),
        name: 'WETH',
        slippageLimit: zero,
      },
    ]);
  });

  test('max debt, sell all', () => {
    const plan = planSell(
      'WETH',
      new BigNumber('10'),
      new BigNumber('2000'),
      [
        {
          name: 'WETH',
          balance: zero,
          debt: new BigNumber('1000'),
          maxDebt: zero,
          minCollRatio: new BigNumber('1.5'),
          safeCollRatio: new BigNumber('2'),
          referencePrice: new BigNumber('200'),
          targetDebt: zero,
          delta: new BigNumber('-1000'),
          liquidationPrice: zero,
          currentCollRatio: zero,
        },
      ],
      zero,
    );
    expect(plan).toEqual([
      {
        amount: new BigNumber('10'),
        kind: 'sellLev',
        maxTotal: new BigNumber('2000'),
        name: 'WETH',
        slippageLimit: zero,
      },
    ]);
  });

  test('debt, sell', () => {
    const plan = planSell(
      'WETH',
      new BigNumber('1'),
      new BigNumber('200'),
      [
        {
          name: 'WETH',
          balance: new BigNumber('9'),
          debt: new BigNumber('1000'),
          targetDebt: new BigNumber('800'),
          maxDebt: new BigNumber('900'),
          minCollRatio: new BigNumber('1.5'),
          safeCollRatio: new BigNumber('2'),
          referencePrice: new BigNumber('200'),
          delta: new BigNumber('-200'),
          liquidationPrice: zero,
          currentCollRatio: zero,
        },
      ],
      zero,
    );
    expect(plan).toEqual([
      {
        amount: new BigNumber('1'),
        kind: 'sellLev',
        maxTotal: new BigNumber('200'),
        name: 'WETH',
        slippageLimit: zero,
      },
    ]);
  });

  test('debt, sell, keep cash, repay necessary debt', () => {
    const plan = planSell(
      'WETH',
      new BigNumber('1'),
      new BigNumber('200'),
      [
        {
          name: 'WETH',
          balance: new BigNumber('9'),
          debt: new BigNumber('1000'),
          maxDebt: new BigNumber('900'),
          targetDebt: new BigNumber('900'),
          delta: new BigNumber('-100'),
          minCollRatio: new BigNumber('1.5'),
          safeCollRatio: new BigNumber('2'),
          referencePrice: new BigNumber('200'),
          liquidationPrice: zero,
          currentCollRatio: zero,
        },
      ],
      zero,
    );

    expect(plan).toEqual([
      {
        amount: new BigNumber('1'),
        kind: 'sellLev',
        maxTotal: new BigNumber('200'),
        name: 'WETH',
        slippageLimit: zero,
      },
    ]);
  });

  test('repay all debt, surplus leave as cash', () => {
    const plan = planSell(
      'WETH',
      new BigNumber('2'),
      new BigNumber('400'),
      [
        {
          name: 'WETH',
          balance: new BigNumber('8'),
          debt: new BigNumber('300'),
          maxDebt: new BigNumber('800'),
          targetDebt: zero,
          delta: new BigNumber('-300'),
          minCollRatio: new BigNumber('1.5'),
          safeCollRatio: new BigNumber('2'),
          referencePrice: new BigNumber('200'),
          liquidationPrice: zero,
          currentCollRatio: zero,
        },
      ],
      zero,
    );

    expect(plan).toEqual([
      {
        amount: new BigNumber('2'),
        kind: 'sellLev',
        maxTotal: new BigNumber('400'),
        name: 'WETH',
        slippageLimit: zero,
      },
    ]);
  });

  test.skip('sell non marginable', () => {
    const plan = planSell('MKR', new BigNumber('10'), new BigNumber('5000'), [], zero);
    expect(plan).toEqual([
      {
        amount: new BigNumber('10'),
        kind: 'sell',
        maxTotal: new BigNumber('5000'),
        name: 'MKR',
        slippageLimit: zero,
      },
    ]);
  });
});
