/*
 * Copyright (C) 2020 Maker Ecosystem Growth Holdings, INC.
 */

import { BigNumber } from 'bignumber.js';
import { Observable } from 'rxjs';
import { Calls } from '../../blockchain/calls/calls';
import { TxState } from '../../blockchain/transactions';
import { Operations } from '../plan/planUtils';
import { Operation } from '../state/mtAccount';
import { EditableDebt } from './mtOrderAllocateDebtForm';

export interface AllocationRequest {
  cashBalance: BigNumber;
  defaultTargetCash: BigNumber;
  targetDaiBalance: BigNumber;
  assets: AllocationRequestAssetInfo[];
}

export interface AllocationRequestPilot extends AllocationRequest {
  createPlan: (debts: Array<Required<EditableDebt>>) => Operations;
  execute: (calls: Calls, proxy: any, plan: Operation[], gas: number) => Observable<TxState>;
  estimateGas: (calls: Calls, proxy: any, plan: Operation[]) => Observable<number>;
}

export interface AllocationRequestAssetInfo {
  name: string;
  balance: BigNumber;
  debt: BigNumber;
  maxDebt: BigNumber;
  minCollRatio: BigNumber;
  safeCollRatio: BigNumber;
  referencePrice: BigNumber;
  targetDebt?: BigNumber;
}

export interface DebtDelta {
  name: string;
  delta: BigNumber;
}

export function hintLast(temporaryHint?: string) {
  return (a1: AllocationRequestAssetInfo, a2: AllocationRequestAssetInfo) =>
    a1.name === temporaryHint ? -1 : a1 === a2 ? 0 : a1 > a2 ? -1 : 1;
}
