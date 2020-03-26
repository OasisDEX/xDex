import { BigNumber } from 'bignumber.js';
import { flatten } from 'lodash';
import { AssetKind } from '../../blockchain/config';
import { impossible } from '../../utils/impossible';
import { zero } from '../../utils/zero';
import { EditableDebt } from '../allocate/mtOrderAllocateDebtForm';
import {
  findAsset, MTAccount,
  Operation,
  OperationKind
} from '../state/mtAccount';
import { deltaToOps, Operations, orderDeltas } from './planUtils';

// export function prepareFundRequest(
//   ilk: string | undefined,
//   amount: BigNumber,
//   token: string,
//   mta: MTAccount,
// ): AllocationRequestPilot {
//
//   const cashBalance = mta.cash.balance;
//   const totalDebt = mta.totalDebt;
//   const targetDaiBalance = mta.cash.name === token ?
//     cashBalance.minus(totalDebt).plus(amount) :
//     cashBalance.minus(totalDebt);
//   const defaultTargetCash = cashBalance;
//
//   const assets: AllocationRequestAssetInfo[] = mta.marginableAssets
//     .map(ma => (calculateMarginable({
//       ...ma,
//       balance: ma.name === token ?
//         ma.balance.plus(amount) :
//         ma.balance,
//     } as MarginableAssetCore)));
//
//   const execute =
//     (calls: Calls, proxy: any, plan: Operation[], gas: number): Observable<TxState> =>
//     calls.mtFund({ proxy, plan, gas, token, amount });
//
//   const estimateGas = (calls: Calls, proxy: any, plan: Operation[]) =>
//     calls.mtFundEstimateGas({ proxy, plan });
//
//   const createPlan = (debts: Array<Required<EditableDebt>>): Operations =>
//       planFund(mta, token, amount, debts);
//
//   return {
//     targetDaiBalance,
//     cashBalance,
//     defaultTargetCash,
//     execute,
//     estimateGas,
//     assets,
//     createPlan,
//   };
// }

export function planFund(
  mta: MTAccount,
  token: string,
  amount: BigNumber,
  debts: Array<Required<EditableDebt>>,
): Operations {

  const asset = findAsset(token, mta);

  if (asset === undefined) {
    return impossible('asset not setup');
  }

  if (
    asset.assetKind !== AssetKind.marginable
  ) {
    return impossible(`can\'t fund with ${token}`);
  }

  const fundOps: Operation[] = [
    { amount, name: token, kind: OperationKind.fundGem },
  ];

  return [
    ...fundOps,
    ...flatten(orderDeltas(debts).filter(d => !d.delta.eq(zero)).map(deltaToOps))
  ];
}

export function planFundDai(
  mta: MTAccount,
  token: string,
  amount: BigNumber,
  debts: Array<Required<EditableDebt>>,
): Operations {

  const asset = findAsset(token, mta);

  if (asset === undefined) {
    return impossible('asset not setup');
  }

  if (
    asset.assetKind !== AssetKind.marginable
    // asset.assetKind !== AssetKind.nonMarginable &&
    // asset.assetKind !== AssetKind.cash
  ) {
    return impossible(`can\'t fund with ${token}`);
  }

  const fundOps: Operation[] = [
    { amount, name: token, kind: OperationKind.fundDai },
  ];

  return [
    ...fundOps,
    ...flatten(orderDeltas(debts).filter(d => !d.delta.eq(zero)).map(deltaToOps))
  ];
}
