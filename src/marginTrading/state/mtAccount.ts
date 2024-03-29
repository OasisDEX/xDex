/*
 * Copyright (C) 2020 Maker Ecosystem Growth Holdings, INC.
 */

import { BigNumber } from 'bignumber.js';
import { Observable } from 'rxjs';
import { first, switchMap } from 'rxjs/operators';
import { Calls$ } from '../../blockchain/calls/calls';
import { AssetKind } from '../../blockchain/config';
import { GasPrice$ } from '../../blockchain/network';
import { TxState } from '../../blockchain/transactions';
import { RawMTHistoryEvent } from './mtHistory';

export enum OperationKind {
  fundGem = 'fundGem',
  fundDai = 'fundDai',
  drawGem = 'drawGem',
  drawDai = 'drawDai',
  buyRecursively = 'buy',
  sellRecursively = 'sell',
}

export type Operation =
  | {
      kind: OperationKind.fundGem;
      name: string;
      amount: BigNumber;
    }
  | {
      kind: OperationKind.fundDai;
      name: string;
      amount: BigNumber;
    }
  | {
      kind: OperationKind.drawGem;
      name: string;
      amount: BigNumber;
    }
  | {
      kind: OperationKind.drawDai;
      name: string;
      amount: BigNumber;
    }
  | {
      kind: OperationKind.buyRecursively | OperationKind.sellRecursively;
      name: string;
      amount: BigNumber;
      maxTotal: BigNumber;
      slippageLimit: BigNumber;
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
  rawHistory: RawMTHistoryEvent[];
  // rawLiquidationHistory: RawMTLiquidationHistoryEvent[];
}

export interface CashAssetCore extends Core {
  assetKind: AssetKind.cash;
}

export interface CashAsset extends CashAssetCore {
  // calculated:
  availableActions: UserActionKind[];
}

export enum MTHistoryEventKind {
  fundGem = 'FundGem',
  fundDai = 'FundDai',
  drawGem = 'DrawGem',
  drawDai = 'DrawDai',
  adjust = 'Adjust',
  buy = 'Buy',
  sell = 'Sell',
  bite = 'Bite',
  kick = 'Kick',
  tend = 'Tend',
  dent = 'Dent',
  deal = 'Deal',
  redeem = 'Redeem',
}

export enum mtBitable {
  yes = 'yes',
  no = 'no',
  imminent = 'imminent',
}

export type MTHistoryEvent = {
  priceDai?: BigNumber;
  liquidationPrice?: BigNumber;
  liquidationPriceDelta?: BigNumber;
  debtDelta?: BigNumber;
  ddai?: BigNumber;
  dgem?: BigNumber;
  amount?: BigNumber;
  redeemable?: BigNumber;
  dAmount: BigNumber;
  dDAIAmount: BigNumber;
  price?: BigNumber;
  auctionId?: BigNumber;
  balance?: BigNumber;
  daiBalance?: BigNumber;
  equity?: BigNumber;
} & (MTMarginEvent | MTLiquidationEvent);

export type MTMarginEvent = {
  timestamp: number;
  token: string;
} & (
  | {
      kind:
        | MTHistoryEventKind.fundGem
        | MTHistoryEventKind.fundDai
        | MTHistoryEventKind.drawGem
        | MTHistoryEventKind.drawDai;
      amount: BigNumber;
    }
  | {
      kind: MTHistoryEventKind.adjust;
      dgem: BigNumber;
      ddai: BigNumber;
    }
  | {
      kind: MTHistoryEventKind.buy | MTHistoryEventKind.sell;
      amount: BigNumber;
      payAmount: BigNumber;
    }
);

export type MTLiquidationEvent = {
  // `lot` gems for sale
  // `bid` dai paid
  // `tab` total dai wanted

  timestamp: number;
  token: string;
  id: number;
} & (
  | {
      kind: MTHistoryEventKind.bite;
      ink: BigNumber;
      tab: BigNumber;
    }
  | {
      kind: MTHistoryEventKind.kick;
      lot: BigNumber;
      tab: BigNumber;
    }
  | {
      kind: MTHistoryEventKind.tend | MTHistoryEventKind.dent;
      lot: BigNumber;
      bid: BigNumber;
    }
  | {
      kind: MTHistoryEventKind.deal;
    }
  | {
      kind: MTHistoryEventKind.redeem;
      amount: BigNumber;
    }
);

export type MarginableAssetHistory = MTHistoryEvent[];

export interface MarginableAssetCore extends Core {
  assetKind: AssetKind.marginable;
  urnBalance: BigNumber;
  debt: BigNumber;
  dai: BigNumber;
  referencePrice: BigNumber;
  minCollRatio: BigNumber;
  safeCollRatio: BigNumber;
  fee: BigNumber;
  liquidationPenalty: BigNumber;
  osmPriceNext: BigNumber | undefined;
  zzz: BigNumber;
  redeemable: BigNumber;
  minDebt: BigNumber;
}

export interface MarginableAsset extends MarginableAssetCore {
  // balance: BigNumber;
  balanceInCash: BigNumber;
  balanceInDai?: BigNumber;
  midpointPrice?: BigNumber;
  currentCollRatio?: BigNumber;
  cash: BigNumber;
  // maxDebtForOther: BigNumber; // max possible debt for other assets
  maxDebt: BigNumber; // max possible targetDebt for this asset
  liquidationPrice: BigNumber;
  markPrice: BigNumber;
  multiple: BigNumber;
  availableDebt: BigNumber;
  maxSafeMultiply: BigNumber;
  availableActions: UserActionKind[];
  availableBalance: BigNumber;
  lockedBalance: BigNumber;
  safe?: boolean;
  liquidationInProgress: boolean;
  history: MarginableAssetHistory;
  pnl?: BigNumber;
  bitable: mtBitable.no | mtBitable.imminent | mtBitable.yes;
  runningAuctions: number;
  amountBeingLiquidated: BigNumber;
  nextPriceUpdateDelta: string;
  purchasingPower: BigNumber;
  equity?: BigNumber;
  isSafeCollRatio?: boolean;
  priceDropWarning: boolean;
}

// export interface NonMarginableAssetCore extends Core {
//   assetKind: AssetKind.nonMarginable;
//   // price: BigNumber;
//   referencePrice: BigNumber;
// }
//
// export interface NonMarginableAsset extends NonMarginableAssetCore {
//   balance: BigNumber;
//   balanceInCash: BigNumber;
//   availableActions: UserActionKind[];
// }

export type AssetCore = CashAssetCore | MarginableAssetCore; // | NonMarginableAssetCore;
export type Asset = CashAsset | MarginableAsset; // | NonMarginableAsset;

export enum MTAccountState {
  setup = 'setup',
  notSetup = 'notSetup',
}

export interface MTAccount {
  state: MTAccountState.setup | MTAccountState.notSetup;
  // cash: CashAsset;
  marginableAssets: MarginableAsset[];
  // nonMarginableAssets: NonMarginableAsset[];
  // calculated:
  totalAssetValue: BigNumber;
  totalDebt: BigNumber;
  totalAvailableDebt: BigNumber;
  daiAllowance: boolean;
  proxy: any;
}

export function createMTProxyApprove(gasPrice$: GasPrice$, calls$: Calls$) {
  return (args: { token: string; proxyAddress: string }): Observable<TxState> => {
    const r = calls$.pipe(
      first(),
      switchMap((calls) => {
        return calls.approveMTProxy(gasPrice$, args);
      }),
    );
    r.subscribe();
    return r;
  };
}

export function findAsset(
  name: string,
  mta?: MTAccount,
): MarginableAsset | /* | NonMarginableAsset | CashAsset */ undefined {
  if (!mta) {
    return undefined;
  }
  //
  // if (mta.cash && mta.cash.name === name) {
  //   return mta.cash;
  // }

  return mta.marginableAssets.find((a) => a.name === name);
  // || mta.nonMarginableAssets.find(a => a.name === name);
}

export function findMarginableAsset(name: string, mta?: MTAccount): MarginableAsset | undefined {
  if (!mta) {
    return undefined;
  }

  return mta.marginableAssets.find((a) => a.name === name);
}

// export function findNonMarginableAsset(
//   name: string, mta?: MTAccount
// ): NonMarginableAsset | undefined {
//   if (!mta) {
//     return undefined;
//   }
//
//   return mta.nonMarginableAssets.find(a => a.name === name);
// }
