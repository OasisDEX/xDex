import { BigNumber } from 'bignumber.js';

import { setupFakeWeb3ForTesting } from '../../blockchain/web3';
setupFakeWeb3ForTesting();

import { impossible } from '../../utils/impossible';
import { MTAccountSetup, OperationKind } from '../state/mtAccount';
import { getMTAccount } from '../state/mtTestUtils';
import { planDraw } from './planDraw';
import { cash, dgx100, mkr100, mkrEmpty, wethEmpty } from './planFixtures';

describe('plan draw', () => {
  describe('cash', () => {
    test('no cash, no asset', () => {

      const mta: MTAccountSetup = getMTAccount({ marginableAssets: [wethEmpty] });

      const plan = planDraw(
        mta,
        'DAI',
        new BigNumber('25'),
        []);

      expect(plan).toEqual(impossible('not enough of DAI'));
    });

    test('enough cash', () => {

      const mta: MTAccountSetup = getMTAccount({ cash, marginableAssets: [wethEmpty] });

      const plan = planDraw(
        mta,
        'DAI',
        new BigNumber('20000'),
        []);

      expect(plan).toEqual([
        { kind: OperationKind.draw, name: 'DAI', amount: new BigNumber('20000') },
      ]);
    });
  });
  describe('marginable', () => {
    test('not enough asset', () => {

      const mta: MTAccountSetup = getMTAccount({ marginableAssets: [wethEmpty] });

      const plan = planDraw(
        mta,
        'WETH',
        new BigNumber('10'),
        []);

      expect(plan).toEqual(impossible('not enough of WETH'));
    });

    test('not enough asset', () => {

      const mta: MTAccountSetup = getMTAccount({ marginableAssets: [dgx100] });

      const plan = planDraw(
        mta,
        'DGX',
        new BigNumber('110'),
        []
        );

      expect(plan).toEqual(impossible('not enough of DGX'));
    });

    test('enough asset', () => {

      const mta: MTAccountSetup = getMTAccount({ marginableAssets: [dgx100] });

      const plan = planDraw(
        mta,
        'DGX',
        new BigNumber('90'),
        []);

      expect(plan).toEqual([
        { kind: OperationKind.adjust, name: 'DGX', dgem: new BigNumber('-90') },
        { kind: OperationKind.draw, amount: new BigNumber('90'), name: 'DGX' }
      ]);
    });

  });
  describe('nonMarginable', () => {
    test('empty asset', () => {

      const mta: MTAccountSetup = getMTAccount({ nonMarginableAssets: [mkrEmpty] });

      const plan = planDraw(
        mta,
        'MKR',
        new BigNumber('10'),
        []);

      expect(plan).toEqual(impossible('not enough of MKR'));
    });

    test('not enough asset', () => {

      const mta: MTAccountSetup = getMTAccount({ nonMarginableAssets: [mkr100] });

      const plan = planDraw(
        mta,
        'MKR',
        new BigNumber('110'),
        []
        );

      expect(plan).toEqual(impossible('not enough of MKR'));
    });

    test('enough asset', () => {

      const mta: MTAccountSetup = getMTAccount({ nonMarginableAssets: [mkr100] });

      const plan = planDraw(
        mta,
        'MKR',
        new BigNumber('90'),
        []);

      expect(plan).toEqual([
        { kind: OperationKind.draw, amount: new BigNumber('90'), name: 'MKR' }
      ]);
    });

  });
});