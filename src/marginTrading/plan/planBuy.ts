import { BigNumber } from 'bignumber.js';
import { flatten } from 'lodash';

import { AssetKind } from '../../blockchain/config';
import { Offer, Orderbook } from '../../exchange/orderbook/orderbook';
import {
  findAsset, findMarginableAsset, MarginableAsset, MarginableAssetCore, MTAccount,
  Operation,
  OperationKind
} from '../state/mtAccount';

import { Observable } from 'rxjs';
import { Calls } from '../../blockchain/calls/calls';
import { TxState } from '../../blockchain/transactions';
import { Impossible, impossible, isImpossible } from '../../utils/impossible';
import { zero } from '../../utils/zero';
import { AllocationRequestPilot } from '../allocate/allocate';
import { EditableDebt } from '../allocate/mtOrderAllocateDebtForm';
import { calculateMarginable } from '../state/mtCalculate';
import { deltaToOps, getTotal, Operations, orderDeltas } from './planUtils';

export function prepareBuyAllocationRequest(
  mta: MTAccount,
  sellOffers: Offer[],
  baseToken: string,
  amount: BigNumber,
  price: BigNumber,
  realPurchasingPower: BigNumber,
  slippageLimit: BigNumber
): AllocationRequestPilot | Impossible {
  const asset = findAsset(baseToken, mta);

  if (asset === undefined) {
    return impossible('asset not setup');
  }

  const maxTotal = getTotal(amount, sellOffers);

  if (isImpossible(maxTotal)) {
    return maxTotal;
  }

  if (asset.assetKind === AssetKind.marginable) {
    if (realPurchasingPower.lt(maxTotal)) {
      return impossible('purchasing power too low');
    }
  }

  const avgPrice = maxTotal.div(amount);

  if (price.lt(avgPrice)) {
    return impossible('price too low');
  }

  const assets: MarginableAsset[] = mta.marginableAssets.map(ma => {
    const balance = ma.name === baseToken ?
      ma.balance.plus(amount) :
      ma.balance;

    return calculateMarginable(
      {
        ...ma,
        balance,
      } as MarginableAssetCore,
      { buy: [], sell: [], tradingPair: { base: '', quote: '' }, blockNumber: 0 } as Orderbook
    );
  });

  const baseAsset = findMarginableAsset(baseToken, mta);

  const cashBalance = baseAsset!.dai;
  const totalDebt = assets.reduce((sum, a) => sum.plus(a.debt), zero);

  const targetDaiBalance = cashBalance.minus(maxTotal).minus(totalDebt);

  const defaultTargetCash = cashBalance; // BigNumber.max(zero, cashBalance.minus(maxTotal));

  const createPlan = (debts: Array<Required<EditableDebt>>): Operations =>
    planBuy(baseToken, amount, maxTotal, debts, slippageLimit);

  const execute = (calls: Calls, proxy: any, plan: Operation[], gas: number): Observable<TxState> =>
    calls.mtBuy({
      amount,
      baseToken,
      price,
      proxy,
      plan,
      gas,
      slippageLimit,
      total: maxTotal,
    });

  const estimateGas = (calls: Calls, proxy: any, plan: Operation[]) =>
    calls.mtBuyEstimateGas({ proxy, plan });

  return {
    assets,
    targetDaiBalance,
    cashBalance,
    defaultTargetCash,
    createPlan,
    execute,
    estimateGas,
  };
}

export function planBuy(
  name: string,
  amount: BigNumber,
  maxTotal: BigNumber,
  debts: Array<Required<EditableDebt>>,
  slippageLimit: BigNumber
): Operation[] {

  // console.log(JSON.stringify(debts));

  const otherAllocations = debts.filter(a => a.name !== name);
  const otherOps: Operation[] = flatten(orderDeltas(otherAllocations).map(deltaToOps));

  return [
    ...otherOps,
    {
      maxTotal,
      name,
      amount,
      slippageLimit,
      kind: OperationKind.buyRecursively,
    },
  ];
}
