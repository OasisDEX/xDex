import { BigNumber } from 'bignumber.js'
import { flatten } from 'lodash'
import { AssetKind } from '../../blockchain/config'
import { impossible } from '../../utils/impossible'
import { zero } from '../../utils/zero'
import { EditableDebt } from '../allocate/mtOrderAllocateDebtForm'
import { findAsset, MTAccount, Operation, OperationKind } from '../state/mtAccount'
import { deltaToOps, Operations, orderDeltas } from './planUtils'

// export function prepareDrawRequest(
//   ilk: string | undefined,
//   amount: BigNumber,
//   token: string,
//   mta: MTAccount,
// ): AllocationRequestPilot {
//
//   const cashBalance = mta.cash.balance;
//   const totalDebt = mta.totalDebt;
//   const targetDaiBalance = mta.cash.name === token ?
//     cashBalance.minus(totalDebt).minus(amount) :
//     cashBalance.minus(totalDebt);
//   const defaultTargetCash = cashBalance;
//
//   const assets: AllocationRequestAssetInfo[] = mta.marginableAssets
//     .map(ma => (calculateMarginable({
//       ...ma,
//       balance: ma.name === token ?
//         ma.balance.minus(amount) :
//         ma.balance,
//     } as MarginableAssetCore)));
//
//   const execute =
//   (calls: Calls, proxy: any, plan: Operation[], gas: number): Observable<TxState> =>
//     calls.mtDraw({ proxy, plan, gas, token, amount });
//
//   const estimateGas = (calls: Calls, proxy: any, plan: Operation[]) =>
//     calls.mtDrawEstimateGas({ proxy, plan });
//
//   const createPlan = (debts: Array<Required<EditableDebt>>): Operations =>
//       planDraw(mta, token, amount, debts);
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

export function planDraw(
  mta: MTAccount,
  token: string,
  amount: BigNumber,
  debts: Array<Required<EditableDebt>>,
): Operations {
  const asset = findAsset(token, mta)

  if (asset === undefined) {
    return impossible('asset not setup')
  }

  if (asset.assetKind !== AssetKind.marginable) {
    return impossible(`can't draw with ${token}`)
  }

  if (amount.gt(asset.balance)) {
    return impossible(`not enough of ${token}`)
  }

  const drawOps: Operation[] = [{ amount, name: asset.name, kind: OperationKind.drawGem }]

  return [
    ...drawOps,
    ...flatten(
      orderDeltas(debts)
        .filter((d) => !d.delta.eq(zero))
        .map(deltaToOps),
    ),
  ]
}

export function planDrawDai(
  mta: MTAccount,
  token: string,
  amount: BigNumber,
  debts: Array<Required<EditableDebt>>,
): Operations {
  const asset = findAsset(token, mta)

  if (asset === undefined) {
    return impossible('asset not setup')
  }

  if (asset.assetKind !== AssetKind.marginable) {
    return impossible(`can't draw dai with ${token}`)
  }

  if (amount.gt(asset.dai)) {
    return impossible(`not enough of DAI on ${token}`)
  }

  const drawOps: Operation[] = [{ amount, name: asset.name, kind: OperationKind.drawDai }]

  return [
    ...drawOps,
    ...flatten(
      orderDeltas(debts)
        .filter((d) => !d.delta.eq(zero))
        .map(deltaToOps),
    ),
  ]
}
