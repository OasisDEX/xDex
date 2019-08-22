import { BigNumber } from 'bignumber.js';
import { flatten } from 'lodash';
import { Observable } from 'rxjs';
import { Calls } from '../../blockchain/calls/calls';
import { AssetKind } from '../../blockchain/config';
import { TxState } from '../../blockchain/transactions';
import { impossible } from '../../utils/impossible';
import { minusOne, zero } from '../../utils/zero';
import { AllocationRequestAssetInfo, AllocationRequestPilot } from '../allocate/allocate';
import { EditableDebt } from '../allocate/mtOrderAllocateDebtForm';
import {
  findAsset,
  MarginableAssetCore,
  MTAccountSetup, Operation,
  OperationKind
} from '../state/mtAccount';
import { calculateMarginable } from '../state/mtCalculate';
import { deltaToOps, Operations, orderDeltas } from './planUtils';

export function prepareDrawRequest(
  amount: BigNumber,
  token: string,
  mta: MTAccountSetup,
): AllocationRequestPilot {

  const cashBalance = mta.cash.balance;
  const totalDebt = mta.totalDebt;
  const targetDaiBalance = mta.cash.name === token ?
    cashBalance.minus(totalDebt).minus(amount) :
    cashBalance.minus(totalDebt);
  const defaultTargetCash = cashBalance;

  const assets: AllocationRequestAssetInfo[] = mta.marginableAssets
    .map(ma => (calculateMarginable({
      ...ma,
      balance: ma.name === token ?
        ma.balance.minus(amount) :
        ma.balance,
    } as MarginableAssetCore)));

  const execute = (calls: Calls, proxy: any, plan: Operation[], gas: number): Observable<TxState> =>
    calls.mtDraw({ proxy, plan, gas, token, amount });

  const estimateGas = (calls: Calls, proxy: any, plan: Operation[]) =>
    calls.mtDrawEstimateGas({ proxy, plan });

  const createPlan = (debts: Array<Required<EditableDebt>>): Operations =>
      planDraw(mta, token, amount, debts);

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

export function planDraw(
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
    asset.assetKind !== AssetKind.nonMarginable &&
    asset.assetKind !== AssetKind.marginable &&
    asset.assetKind !== AssetKind.cash
  ) {
    return impossible(`can't draw with ${token}`);
  }

  if (amount.gt(asset.balance)) {
    return impossible(`not enough of ${token}`);
  }

  const drawOps: Operation[] = asset.assetKind === AssetKind.marginable ?
  [
    { name: asset.name, dgem: minusOne.times(amount), kind: OperationKind.adjust },
    {
      amount,
      name: asset.name,
      kind: asset.name === 'DAI' ? OperationKind.drawDai : OperationKind.drawGem,
    },
  ] : [
    {
      amount,
      name: token,
      kind: asset.name === 'DAI' ? OperationKind.drawDai : OperationKind.drawGem,
    },
  ];

  return [
    ...drawOps,
    ...flatten(orderDeltas(debts).filter(d => !d.delta.eq(zero)).map(deltaToOps))
  ];
}
