/*
 * Copyright (C) 2020 Maker Ecosystem Growth Holdings, INC.
 */

import { BigNumber } from 'bignumber.js';

import { setupFakeWeb3ForTesting } from '../../blockchain/web3';
setupFakeWeb3ForTesting();

import { impossible } from '../../utils/impossible';
import { MTAccount, OperationKind } from '../state/mtAccount';
import { getMTAccount } from '../state/mtTestUtils';
import { planDraw, planDrawDai } from './planDraw';
import { dgx100, wethEmpty } from './planFixtures';

describe('plan draw', () => {
  describe('cash', () => {
    test('no cash, no asset', () => {
      const mta: MTAccount = getMTAccount({ marginableAssets: [wethEmpty] });

      const plan = planDrawDai(mta, 'WETH', new BigNumber('25'), []);

      expect(plan).toEqual(impossible('not enough of DAI on WETH'));
    });
  });
  describe('marginable', () => {
    test('not enough asset', () => {
      const mta: MTAccount = getMTAccount({ marginableAssets: [wethEmpty] });

      const plan = planDraw(mta, 'WETH', new BigNumber('10'), []);

      expect(plan).toEqual(impossible('not enough of WETH'));
    });

    test('not enough asset', () => {
      const mta: MTAccount = getMTAccount({ marginableAssets: [dgx100] });

      const plan = planDraw(mta, 'DGX', new BigNumber('110'), []);

      expect(plan).toEqual(impossible('not enough of DGX'));
    });

    test('enough asset', () => {
      const mta: MTAccount = getMTAccount({ marginableAssets: [dgx100] });

      const plan = planDraw(mta, 'DGX', new BigNumber('90'), []);

      expect(plan).toEqual([{ kind: OperationKind.drawGem, amount: new BigNumber('90'), name: 'DGX' }]);
    });
  });
});
