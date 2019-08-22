import { BigNumber } from 'bignumber.js';
import { flatten } from 'lodash';
import { Observable } from 'rxjs';
import { Calls } from '../../blockchain/calls/calls';
import { AssetKind } from '../../blockchain/config';
import { TxState } from '../../blockchain/transactions';
import { impossible } from '../../utils/impossible';
import { zero } from '../../utils/zero';
import { AllocationRequestAssetInfo, AllocationRequestPilot } from '../allocate/allocate';
import { EditableDebt } from '../allocate/mtOrderAllocateDebtForm';
import {
  findAsset, MarginableAssetCore,
  MTAccountSetup,
  Operation,
  OperationKind
} from '../state/mtAccount';
import { calculateMarginable } from '../state/mtCalculate';
import { deltaToOps, Operations, orderDeltas } from './planUtils';

export function prepareFundRequest(
  amount: BigNumber,
  token: string,
  mta: MTAccountSetup,
): AllocationRequestPilot {

  const cashBalance = mta.cash.balance;
  const totalDebt = mta.totalDebt;
  const targetDaiBalance = mta.cash.name === token ?
    cashBalance.minus(totalDebt).plus(amount) :
    cashBalance.minus(totalDebt);
  const defaultTargetCash = cashBalance;

  const assets: AllocationRequestAssetInfo[] = mta.marginableAssets
    .map(ma => (calculateMarginable({
      ...ma,
      balance: ma.name === token ?
        ma.balance.plus(amount) :
        ma.balance,
    } as MarginableAssetCore)));

  const execute = (calls: Calls, proxy: any, plan: Operation[], gas: number): Observable<TxState> =>
    calls.mtFund({ proxy, plan, gas, token, amount });

  const estimateGas = (calls: Calls, proxy: any, plan: Operation[]) =>
    calls.mtFundEstimateGas({ proxy, plan });

  const createPlan = (debts: Array<Required<EditableDebt>>): Operations =>
      planFund(mta, token, amount, debts);

  return {
    targetDaiBalance,
    cashBalance,
    defaultTargetCash,
    execute,
    estimateGas,
    assets,
    createPlan,
  };
}

export function planFund(
  mta: MTAccountSetup,
  token: string,
  amount: BigNumber,
  debts: Array<Required<EditableDebt>>,
): Operations {

  const asset = findAsset(token, mta);

  if (asset === undefined) {
    return impossible('asset not setup');
  }

  if (
    asset.assetKind !== AssetKind.marginable &&
    asset.assetKind !== AssetKind.nonMarginable &&
    asset.assetKind !== AssetKind.cash
  ) {
    return impossible(`can\'t fund with ${token}`);
  }

  const fundOps: Operation[] = asset.assetKind === AssetKind.marginable ?
  [
    { amount, name: token, kind: token === 'DAI' ? OperationKind.fundDai : OperationKind.fundGem },
    { name: token, dgem: amount, kind: OperationKind.adjust },
  ] : [
    { amount, name: token, kind: token === 'DAI' ? OperationKind.fundDai : OperationKind.fundGem },
  ];

  return [
    ...fundOps,
    ...flatten(orderDeltas(debts).filter(d => !d.delta.eq(zero)).map(deltaToOps))
  ];
}
