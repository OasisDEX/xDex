import { BigNumber } from 'bignumber.js';

import { setupFakeWeb3ForTesting } from '../../blockchain/web3';
setupFakeWeb3ForTesting();

import { Impossible, impossible, isImpossible } from '../../utils/impossible';
import { zero } from '../../utils/zero';
import { AllocationRequestPilot } from '../allocate/allocate';
import { OperationKind } from '../state/mtAccount';
import { getMTAccount } from '../state/mtTestUtils';
import { planBuy, prepareBuyAllocationRequest } from './planBuy';
import { cash, dgx100, mtaOnlyWeth, sell1, sell2, sellOffers, wethEmpty } from './planFixtures';

describe('prepareBuyAllocationRequest', () => {
  test('no cash, no plan', () => {
    const mta = getMTAccount({ marginableAssets: [wethEmpty] });
    const request = prepareBuyAllocationRequest(
      mta,
      sellOffers,
      'WETH',
      new BigNumber('100'),
      new BigNumber('200'),
      zero);
    expect(request).toEqual(impossible('purchasing power too low'));
  });

  test('orderbook too shallow', () => {
    const request = prepareBuyAllocationRequest(
      mtaOnlyWeth,
      [sell1, sell2],
      'WETH',
      new BigNumber('300'),
      new BigNumber('200'),
      mtaOnlyWeth.cash.balance.times(mtaOnlyWeth.marginableAssets[0].safeCollRatio)
      );
    expect(request).toEqual(impossible('orderbook too shallow'));
  });

  test('just buy', () => {
    const mta = getMTAccount({ cash, marginableAssets: [wethEmpty, dgx100] });
    const request: AllocationRequestPilot | Impossible = prepareBuyAllocationRequest(
      mta,
      sellOffers,
      'WETH',
      new BigNumber('100'),
      new BigNumber('200'),
      new BigNumber('20000')
    );

    if (isImpossible(request)) {
      expect(true).toBeFalsy();
      return;
    }

    expect(request.cashBalance).toEqual(new BigNumber('30000'));
    expect(request.defaultTargetCash).toEqual(new BigNumber('30000'));
    expect(request.targetDaiBalance).toEqual(new BigNumber('10000'));

    const wethInfo = request.assets[0];
    expect(wethInfo.name).toEqual('WETH');
    expect(wethInfo.balance).toEqual(new BigNumber('100'));

    const dgxInfo = request.assets[1];
    expect(dgxInfo.name).toEqual('DGX');
    expect(dgxInfo.balance).toEqual(new BigNumber('100'));

  });
});

describe('planBuy', () => {
  test.only('just buy', () => {
    const plan = planBuy(
      'WETH',
      new BigNumber('10'),
      new BigNumber('2000'),
      [
        {
          name:'WETH',
          balance: new BigNumber('10'),
          debt: zero,
          maxDebt: new BigNumber('1000'),
          minCollRatio: new BigNumber('1.5'),
          safeCollRatio: new BigNumber('2'),
          referencePrice: new BigNumber('200'),
          targetDebt: new BigNumber('900'),
          delta: new BigNumber('900'),
          liquidationPrice: zero,
          currentCollRatio: zero,
        },
        {
          name:'DGX',
          balance: new BigNumber('10'),
          debt: zero,
          maxDebt: new BigNumber('333.3333'),
          minCollRatio: new BigNumber('1.1'),
          safeCollRatio: new BigNumber('1.5'),
          referencePrice: new BigNumber('50'),
          targetDebt: new BigNumber('100'),
          delta: new BigNumber('100'),
          liquidationPrice: zero,
          currentCollRatio: zero,
        },
      ]
    );
    expect(plan).toEqual(
      [
        {
          kind: OperationKind.buyRecursively,
          amount: new BigNumber('10'),
          maxTotal: new BigNumber('2000'),
          name: 'WETH'
        }
      ]
    );
  });
});
