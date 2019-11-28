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


export function planRedeem(
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
    { amount, name: token, kind: OperationKind.redeem },
  ];

  return [
    ...fundOps,
    ...flatten(orderDeltas(debts).filter(d => !d.delta.eq(zero)).map(deltaToOps))
  ];
}
