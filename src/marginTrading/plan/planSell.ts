/*
 * Copyright (C) 2020 Maker Ecosystem Growth Holdings, INC.
 */

import { BigNumber } from 'bignumber.js';

import { AssetKind, getToken } from '../../blockchain/config';
import { gasPrice$ } from '../../blockchain/network';
import { Offer, Orderbook } from '../../exchange/orderbook/orderbook';
import { findMarginableAsset, MarginableAssetCore, MTAccount, Operation, OperationKind } from '../state/mtAccount';

import { Impossible, impossible, isImpossible } from '../../utils/impossible';
import { AllocationRequestAssetInfo, AllocationRequestPilot } from '../allocate/allocate';
import { EditableDebt } from '../allocate/mtOrderAllocateDebtForm';

import { flatten } from 'lodash';
import { Observable } from 'rxjs';
import { Calls } from '../../blockchain/calls/calls';
import { TxState } from '../../blockchain/transactions';
import { zero } from '../../utils/zero';
import { calculateMarginable } from '../state/mtCalculate';
import { deltaToOps, getTotal, Operations, orderDeltas } from './planUtils';

export function prepareSellAllocationRequest(
  mta: MTAccount,
  buyOffers: Offer[],
  baseToken: string,
  amount: BigNumber,
  price: BigNumber,
  slippageLimit: BigNumber,
): AllocationRequestPilot | Impossible {
  const asset = findMarginableAsset(baseToken, mta);

  if (asset === undefined) {
    return impossible('asset not setup');
  }

  if (asset.balance.lt(amount)) {
    return impossible('balance too small');
  }

  if (
    asset.assetKind === AssetKind.marginable &&
    asset.balance.times(asset.referencePrice).div(asset.debt).lte(asset.minCollRatio)
  ) {
    return impossible('debt at max possible value');
  }

  const maxTotal = getTotal(amount, buyOffers);

  if (isImpossible(maxTotal)) {
    return maxTotal;
  }

  const avgPrice = maxTotal.div(amount);

  if (price.gt(avgPrice)) {
    return impossible('price too high');
  }

  const assets: AllocationRequestAssetInfo[] = mta.marginableAssets
    .map((ma) =>
      calculateMarginable(
        {
          ...ma,
          balance: ma.name === baseToken ? ma.balance.minus(amount) : ma.balance,
        } as MarginableAssetCore,
        { buy: [], sell: [], tradingPair: { base: '', quote: '' }, blockNumber: 0 } as Orderbook,
      ),
    )
    .map((ai) => ({
      ...ai,
      ...{
        targetDebt: ai.name === baseToken ? BigNumber.min(ai.maxDebt, ai.debt) : ai.debt,
      },
    }));

  const cashBalance = asset.dai; // mta.cash.balance;

  const totalDebt = assets.reduce((sum, a) => sum.plus(a.debt), zero);
  const totalTargetDebt = assets.reduce((sum, a) => sum.plus(a.targetDebt || zero), zero);

  const targetDaiBalance = cashBalance.minus(totalDebt).plus(maxTotal);

  const defaultTargetCash = cashBalance.plus(maxTotal).minus(BigNumber.max(zero, totalDebt.minus(totalTargetDebt)));

  const createPlan = (debts: Array<Required<EditableDebt>>): Operations =>
    planSell(baseToken, amount, maxTotal, debts, slippageLimit);

  const execute = (calls: Calls, proxy: any, plan: Operation[], gas: number): Observable<TxState> =>
    calls.mtSell(gasPrice$, {
      amount,
      baseToken,
      price,
      proxy,
      plan,
      gas,
      slippageLimit,
      total: maxTotal,
    });

  const estimateGas = (calls: Calls, proxy: any, plan: Operation[]) => calls.mtSellEstimateGas({ proxy, plan });

  return {
    assets,
    cashBalance,
    targetDaiBalance,
    defaultTargetCash,
    createPlan,
    execute,
    estimateGas,
  };
}

export function planSell(
  name: string,
  amount: BigNumber,
  maxTotal: BigNumber,
  debts: Array<Required<EditableDebt>>,
  slippageLimit: BigNumber,
): Operation[] {
  return [
    {
      maxTotal,
      amount,
      name,
      slippageLimit,
      kind: OperationKind.sellRecursively,
    },
    ...flatten(
      orderDeltas(
        debts.map((d) => {
          if (getToken(name).assetKind === AssetKind.marginable && d.name === name) {
            return { ...d, delta: BigNumber.min(d.debt, maxTotal).plus(d.delta) };
          }
          return d;
        }),
      )
        .filter((d) => !d.delta.eq(zero))
        .map(deltaToOps),
    ),
  ];
}
