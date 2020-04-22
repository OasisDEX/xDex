import { BigNumber } from 'bignumber.js';

import { setupFakeWeb3ForTesting } from '../../blockchain/web3';
setupFakeWeb3ForTesting();

import { MTAccount, OperationKind } from '../state/mtAccount';
import { getMTAccount } from '../state/mtTestUtils';
import { dgx100, wethEmpty } from './planFixtures';
import { planFund, planFundDai } from './planFund';

describe('plan fund', () => {
  describe('cash', () => {
    test('no cash', () => {
      const mta = getMTAccount({ marginableAssets: [wethEmpty] });

      const plan = planFundDai(mta, 'WETH', new BigNumber('100'), []);

      expect(plan).toEqual([{ amount: new BigNumber('100'), kind: OperationKind.fundDai, name: 'WETH' }]);
    });

    test('some dgx, no debt', () => {
      const mta = getMTAccount({ marginableAssets: [dgx100] });

      const plan = planFundDai(mta, 'DGX', new BigNumber('100'), []);

      expect(plan).toEqual([{ amount: new BigNumber('100'), kind: OperationKind.fundDai, name: 'DGX' }]);
    });

    // test('dgx with debt, little cash', () => {
    //
    //   const dgxWithDebt = {
    //     ...dgx100,
    //     debt: new BigNumber('50')
    //   };
    //
    //   const mta: MTAccount = getMTAccount({ marginableAssets: [dgxWithDebt] });
    //
    //   const plan = planFund(mta, 'DAI', new BigNumber('25'));
    //
    //   expect(plan).toEqual([
    //     { amount: new BigNumber('25'), kind: OperationKind.fund, name: 'DAI' },
    //     { ddai: new BigNumber('-25'), kind: OperationKind.adjust, name: 'DGX' }
    //   ]);
    // });
    //
    // test('dgx with debt, a lot of cash', () => {
    //
    //   const dgxWithDebt = {
    //     ...dgx100,
    //     debt: new BigNumber('50')
    //   };
    //
    //   const mta: MTAccount = getMTAccount({ marginableAssets: [dgxWithDebt] });
    //
    //   const plan = planFund(mta, 'DAI', new BigNumber('125'));
    //
    //   expect(plan).toEqual([
    //     { kind: OperationKind.fund, name: 'DAI', amount: new BigNumber('125'), },
    //     { kind: OperationKind.adjust, name: 'DGX', ddai: new BigNumber('-50'), }
    //   ]);
    // });
    //
    // test('weth and dgx with debt, a lot of cash', () => {
    //
    //   const dgxWithDebt = {
    //     ...dgx100,
    //     debt: new BigNumber('50')
    //   };
    //
    //   const wethWithDebt = {
    //     ...wethEmpty,
    //     balance: new BigNumber('10'),
    //     debt: new BigNumber('200')
    //   };
    //
    //   const mta: MTAccount
    // = getMTAccount({ marginableAssets: [wethWithDebt, dgxWithDebt] });
    //
    //   const plan = planFund(mta, 'DAI', new BigNumber('250'));
    //
    //   expect(plan).toEqual([
    //     { amount: new BigNumber('250'), kind: OperationKind.fund, name: 'DAI' },
    //     { ddai: new BigNumber('-200'), kind: OperationKind.adjust, name: 'WETH' },
    //     { ddai: new BigNumber('-50'), kind: OperationKind.adjust, name: 'DGX' }
    //   ]);
    // });
  });
  describe('marginable', () => {
    test('empty weth', () => {
      const mta: MTAccount = getMTAccount({ marginableAssets: [wethEmpty] });

      const plan = planFund(mta, 'WETH', new BigNumber('25'), []);

      expect(plan).toEqual([{ amount: new BigNumber('25'), kind: OperationKind.fundGem, name: 'WETH' }]);
    });
  });
});
