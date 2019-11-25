// tslint:disable:no-console

import { BigNumber } from 'bignumber.js';
import { isEqual } from 'lodash';
import { bindNodeCallback, combineLatest, forkJoin, Observable, of } from 'rxjs';
import {
  concatAll,
  distinctUntilChanged,
  first,
  last,
  map,
  scan, shareReplay, switchMap
} from 'rxjs/operators';
import { Allowances } from '../balances-nomt/balances';

import { AssetKind, NetworkConfig, tradingTokens } from '../blockchain/config';
import { account$, context$, onEveryBlock$ } from '../blockchain/network';
import { amountFromWei } from '../blockchain/utils';
import {
  CashAsset,
  MarginableAsset,
  MTAccount,
  NonMarginableAsset,
} from '../marginTrading/state/mtAccount';
import { one, zero } from '../utils/zero';

export interface Balances {
  [token: string]: BigNumber;
}

export interface DustLimits {
  [token: string]: BigNumber;
}

type BalanceOf = (account: string, callback: (err: any, r: BigNumber) => any) => any;

export function balance$(
  context: NetworkConfig,
  token: string,
  account?: string
): Observable<BigNumber> {
  if (account === undefined) {
    return account$.pipe(
      switchMap(theAccount => balance$(context, token, theAccount)),
      first(),
    );
  }
  return bindNodeCallback(context.tokens[token].contract.balanceOf as BalanceOf)(
    account
  ).pipe(
    map(balance => {
      return amountFromWei(balance, token);
    }),
  );
}

export const balances$: Observable<Balances> = combineLatest(
  context$,
  account$,
  onEveryBlock$
).pipe(
  switchMap(([context, account]) =>
    !account ? of({}) :
      forkJoin(
        tradingTokens.map((token: string) =>
          balance$(context, token, account).pipe(
            map(balance => ({
              [token]: balance
            }))
          )
        )
      ).pipe(concatAll(), scan((a, e) => ({ ...a, ...e }), {}), last())
  ),
  distinctUntilChanged(isEqual)
);

context$.subscribe(context => {
  Object.assign(window, { context });
});

type Dust = (token: string, callback: (err: any, r: BigNumber) => any) => any;

export const dustLimits$: Observable<DustLimits> = combineLatest(context$).pipe(
  switchMap(([context]) =>
    forkJoin(
      tradingTokens
      .filter(token => context.tokens[token])
      .map((token: string) => {
        return bindNodeCallback(context.otc.contract.getMinSell as Dust)(
          context.tokens[token].address
        ).pipe(
          map(dustLimit => ({
            [token]: amountFromWei(dustLimit, token)
          }))
        );
      })
    ).pipe(concatAll(), scan((a, e) => ({ ...a, ...e }), {}), last())
  ),
  distinctUntilChanged(isEqual)
);

export interface CombinedBalance {
  name: string;
  walletBalance: BigNumber;
  asset?: CashAsset | MarginableAsset | NonMarginableAsset;
  mtAssetValueInDAI: BigNumber;
  cashBalance?: BigNumber;
  allowance: boolean;
}

export interface CombinedBalances {
  balances: CombinedBalance[];
  mta: MTAccount;
}

export function combineBalances(
  etherBalance: BigNumber, walletBalances: Balances, allowances: Allowances, mta: MTAccount
): CombinedBalances {

  const balances = tradingTokens
    .map(name => {
      const walletBalance = name === 'ETH' ? etherBalance : walletBalances[name];

      const asset =
        mta.cash.name === name ?
          mta.cash :
          mta.marginableAssets.find(ma => ma.name === name) ||
          mta.nonMarginableAssets.find(ma => ma.name === name);

      const mtAssetValueInDAI = asset ?
        // walletBalance.plus(asset.balance).times(
          asset.balance.times(
          asset.assetKind === AssetKind.marginable ||
          asset.assetKind === AssetKind.nonMarginable ?
          asset.referencePrice : one
        ) :
        zero;

      const cashBalance = asset && asset.assetKind === AssetKind.marginable ? asset.dai : zero;

      const allowance = allowances[name];

      return {
        name,
        asset,
        walletBalance,
        mtAssetValueInDAI,
        cashBalance,
        allowance
      };
    });

  return { mta, balances };

  // const mtaCash = mta.state === MTAccountState.setup && mta.cash ?
  //   mta.cash.balance : new BigNumber(0);
  // const mtaAssets = mta.state === MTAccountState.setup && mta.marginableAssets ?
  //   mta.marginableAssets : [];
  //
  // const combinedBalances = Object.keys(tokens).map(name => {
  //   const walletBalance =  (walletBalances && walletBalances[name]) || new BigNumber(0);
  //   const asset = mtaAssets.find(a => a.name === name);
  //   const mtaAssetBalance = asset ? asset.balance : new BigNumber(0);
  //   const mtaMarginableAssetValue = asset ? asset.balanceInCash : new BigNumber(0);
  //   const marginBalance = name === 'DAI' ? mtaCash : mtaAssetBalance;
  //   const allowance = asset ? asset.allowance : false;
  //
  //   const walletValue = name === 'DAI' ? walletBalance : walletBalance.times(1.5);
  //   const marginValue = name === 'DAI' ? mtaCash : mtaMarginableAssetValue;
  //   return {
  //     name,
  //     walletBalance,
  //     marginBalance,
  //     allowance,
  //     value: walletValue.plus(marginValue),
  //   };
  // }).filter(combinedBalance =>
  //   combinedBalance.walletBalance.gt(0) || combinedBalance.marginBalance.gt(0));
  //
  // return { mta, balances: combinedBalances };
}

export function createCombinedBalances(
  etherBalance$$: Observable<BigNumber>,
  balances$$: Observable<Balances>,
  allowances$: Observable<Allowances>,
  mta$: Observable<MTAccount>): Observable<CombinedBalances> {
  return combineLatest(etherBalance$$, balances$$, allowances$, mta$).pipe(
    map(([etherBalance, balances, allowances, mta]) =>
      combineBalances(etherBalance, balances, allowances, mta)),
    shareReplay(1)
  );
}
