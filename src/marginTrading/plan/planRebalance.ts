import { flatten } from 'lodash';

import {
  MTAccountSetup,
  Operation} from '../state/mtAccount';

import { Observable } from 'rxjs';
import { Calls } from '../../blockchain/calls/calls';
import { TxState } from '../../blockchain/transactions';
import { AllocationRequestAssetInfo, AllocationRequestPilot } from '../allocate/allocate';
import { EditableDebt } from '../allocate/mtOrderAllocateDebtForm';
import { deltaToOps, orderDeltas } from './planUtils';

export function prepareReAllocationRequest(
  mta: MTAccountSetup,
): AllocationRequestPilot {
  const cashBalance = mta.cash.balance;
  const totalDebt = mta.totalDebt;
  const targetDaiBalance = cashBalance.minus(totalDebt);
  const defaultTargetCash = cashBalance;

  const execute = (calls: Calls, proxy: any, plan: Operation[], gas: number): Observable<TxState> =>
    calls.mtReallocate({ proxy, plan, gas, });

  const estimateGas = (calls: Calls, proxy: any, plan: Operation[]) =>
    calls.mtReallocateEstimateGas({ proxy, plan });

  return {
    targetDaiBalance,
    cashBalance,
    defaultTargetCash,
    execute,
    estimateGas,
    assets: mta.marginableAssets as AllocationRequestAssetInfo[],
    createPlan: planReallocation,
  };

}

export function planReallocation(
  debts: Array<Required<EditableDebt>>
): Operation[] {
  return flatten(orderDeltas(debts).map(deltaToOps));
}
