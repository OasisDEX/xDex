import { BigNumber } from 'bignumber.js';
import { flatten } from 'lodash';

import { AssetKind, tokens } from '../../blockchain/config';
import { Offer } from '../../exchange/orderbook/orderbook';
import {
  findAsset, MarginableAsset, MarginableAssetCore, MTAccountSetup,
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
  mta: MTAccountSetup,
  sellOffers: Offer[],
  baseToken: string,
  amount: BigNumber,
  price: BigNumber,
  realPurchasingPower: BigNumber
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
      } as MarginableAssetCore);
  });

  const cashBalance = mta.cash.balance;
  const totalDebt = assets.reduce((sum, a) => sum.plus(a.debt), zero);
  const targetDaiBalance = cashBalance.minus(maxTotal).minus(totalDebt);
  const defaultTargetCash = cashBalance; // BigNumber.max(zero, cashBalance.minus(maxTotal));

  const createPlan = (debts: Array<Required<EditableDebt>>): Operations =>
    planBuy(baseToken, amount, maxTotal, debts);

  const execute = (calls: Calls, proxy: any, plan: Operation[], gas: number): Observable<TxState> =>
    calls.mtBuy({
      amount,
      baseToken,
      price,
      proxy,
      plan,
      gas,
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
  debts: Array<Required<EditableDebt>>
): Operation[] {

  // console.log(JSON.stringify(debts));

  const otherAllocations = debts.filter(a => a.name !== name);
  const otherOps: Operation[] = flatten(orderDeltas(otherAllocations).map(deltaToOps));

  const totalDebtDelta = debts.reduce((s, d) => s.plus(d.delta), zero);
  const extraCash = totalDebtDelta.minus(maxTotal);

  // console.log(totalDebtDelta.toString(), maxTotal.toString(), extraCash.toString());

  const extraAdjust: Operation[] = extraCash.gt(zero) ?
    [{ name, kind: OperationKind.adjust, ddai: extraCash }] : [];

  return [
    ...otherOps,
    {
      maxTotal,
      name,
      amount,
      kind: tokens[name].assetKind === AssetKind.nonMarginable ?
        OperationKind.buy : OperationKind.buyRecursively
    },
    ...extraAdjust
  ];
}
