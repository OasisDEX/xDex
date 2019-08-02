import { BigNumber } from 'bignumber.js';
import { Observable } from 'rxjs';
import {
  first,
  switchMap,
} from 'rxjs/operators';
import { Calls$ } from '../../blockchain/calls/calls';
import { AssetKind } from '../../blockchain/config';
import { TxState } from '../../blockchain/transactions';
import { MTHistoryEvent } from './mtHistory';

export enum OperationKind {
  fund = 'fund',
  draw = 'draw',
  adjust = 'adjust',
  buy = 'buy',
  buyRecursively = 'buyLev',
  sell = 'sell',
  sellRecursively = 'sellLev',
}

export type Operation = {
  kind: OperationKind.fund;
  name: string;
  amount: BigNumber;
} | {
  kind: OperationKind.draw;
  name: string;
  amount: BigNumber;
} | {
  kind: OperationKind.adjust;
  name: string;
  dgem?: BigNumber;
  ddai?: BigNumber;
} | {
  kind:
    OperationKind.buy | OperationKind.sell |
    OperationKind.buyRecursively | OperationKind.sellRecursively;
  name: string;
  amount: BigNumber;
  maxTotal: BigNumber;
};

export enum UserActionKind {
  buy = 'buy',
  sell = 'sell',
  fund = 'fund',
  draw = 'draw',
}

export interface Core {
  name: string;
  balance: BigNumber;
  walletBalance: BigNumber;
  marginBalance: BigNumber;
  allowance: boolean;
}

export interface CashAssetCore extends Core {
  assetKind: AssetKind.cash;
}

export interface CashAsset extends CashAssetCore {
  // calculated:
  availableActions: UserActionKind[];
}

export type MarginableAssetHistory = MTHistoryEvent[];

export interface MarginableAssetCore extends Core {
  assetKind: AssetKind.marginable;
  urnBalance: BigNumber;
  debt: BigNumber;
  referencePrice: BigNumber;
  minCollRatio: BigNumber;
  safeCollRatio: BigNumber;
  rate?: BigNumber;
  history: MarginableAssetHistory;
}

export interface MarginableAsset extends MarginableAssetCore {
  balance: BigNumber;
  balanceInCash: BigNumber;
  // totalPurchasingPower: BigNumber; // total purchasing power for this asset
  purchasingPower: BigNumber; // remaining purchasing power for this asset
  lonelyPurchasingPower: BigNumber;
  currentCollRatio?: BigNumber;
  // maxDebtForOther: BigNumber; // max possible debt for other assets
  maxDebt: BigNumber; // max possible targetDebt for this asset
  liquidationPrice: BigNumber;
  // leverage: BigNumber;
  availableDebt: BigNumber;
  maxSafeLeverage: BigNumber;
  availableActions: UserActionKind[];
  availableBalance: BigNumber;
  lockedBalance: BigNumber;
  safe?: boolean;
  liquidationInProgress: boolean;
}

export interface NonMarginableAssetCore extends Core {
  assetKind: AssetKind.nonMarginable;
  // price: BigNumber;
  referencePrice: BigNumber;
}

export interface NonMarginableAsset extends NonMarginableAssetCore {
  balance: BigNumber;
  balanceInCash: BigNumber;
  purchasingPower: BigNumber;
  lonelyPurchasingPower: BigNumber;
  availableActions: UserActionKind[];
}

export type AssetCore = CashAssetCore | MarginableAssetCore | NonMarginableAssetCore;
export type Asset = CashAsset | MarginableAsset | NonMarginableAsset;

export enum MTAccountState {
  setup = 'setup',
  notSetup = 'notSetup',
}

export interface MTAccountNotSetup {
  state: MTAccountState.notSetup;
}

export interface MTAccountSetup {
  state: MTAccountState.setup;
  cash: CashAsset;
  marginableAssets: MarginableAsset[];
  nonMarginableAssets: NonMarginableAsset[];
  // calculated:
  totalAssetValue: BigNumber;
  totalDebt: BigNumber;
  totalAvailableDebt: BigNumber;
  proxy: any;
}

export type MTAccount =  MTAccountNotSetup | MTAccountSetup;

export function createMTProxyApprove(calls$: Calls$) {
  return (args: {token: string; proxyAddress: string}): Observable<TxState> => {
    const r = calls$.pipe(
      first(),
      switchMap(calls => {
        return calls.approveMTProxy(args);
      })
    );
    r.subscribe();
    return r;
  };
}

export function findAsset(
  name: string, mta?: MTAccount
): MarginableAsset | NonMarginableAsset | CashAsset | undefined {
  if (!mta || mta.state !== MTAccountState.setup) {
    return undefined;
  }

  if (mta.cash && mta.cash.name === name) {
    return mta.cash;
  }

  return mta.marginableAssets.find(a => a.name === name) ||
    mta.nonMarginableAssets.find(a => a.name === name);
}

export function findMarginableAsset(
  name: string, mta?: MTAccount
): MarginableAsset | undefined {
  if (!mta || mta.state !== MTAccountState.setup) {
    return undefined;
  }

  return mta.marginableAssets.find(a => a.name === name);
}

export function findNonMarginableAsset(
  name: string, mta?: MTAccount
): NonMarginableAsset | undefined {
  if (!mta || mta.state !== MTAccountState.setup) {
    return undefined;
  }

  return mta.nonMarginableAssets.find(a => a.name === name);
}
