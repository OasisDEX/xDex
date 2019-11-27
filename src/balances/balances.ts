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
import { Calls$ } from '../blockchain/calls/calls';

import { AssetKind, NetworkConfig, tradingTokens } from '../blockchain/config';
import { account$, GasPrice$, MIN_ALLOWANCE } from '../blockchain/network';
import { TxState } from '../blockchain/transactions';
import { amountFromWei } from '../blockchain/utils';
import {
  CashAsset,
  MarginableAsset,
  MTAccount,
  // NonMarginableAsset,
} from '../marginTrading/state/mtAccount';
import { one, zero } from '../utils/zero';

export interface Balances {
  [token: string]: BigNumber;
}

export interface Allowances {
  [token: string]: boolean;
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

export function createBalances$(
  context$: Observable<NetworkConfig>,
  initializedAccount$: Observable<string>,
  onEveryBlock$: Observable<number>,
): Observable<Balances> {
  return combineLatest(
    context$,
    initializedAccount$,
    onEveryBlock$
  ).pipe(
    switchMap(([context, account]) =>
                !account ? of({}) :
                  forkJoin(
                    tradingTokens.filter(name => name !== 'ETH').map((token: string) =>
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
}

export interface CombinedBalance {
  name: string;
  walletBalance: BigNumber;
  asset?: MarginableAsset; // CashAsset | MarginableAsset | NonMarginableAsset;
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
        // mta.cash.name === name ?
        //   mta.cash :
          mta.marginableAssets.find(ma => ma.name === name);
      // || mta.nonMarginableAssets.find(ma => ma.name === name);

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

// export interface Balances {
//   [token: string]: BigNumber;
// }
//
// export interface Allowances {
//   [token: string]: boolean;
// }
//
// export interface DustLimits {
//   [token: string]: BigNumber;
// }

export function  createTokenBalances$(
  context$: Observable<NetworkConfig>,
  initializedAccount$: Observable<string>,
  onEveryBlock$: Observable<number>,
  token: string
) {
  return combineLatest(
    context$,
    initializedAccount$,
    onEveryBlock$
  ).pipe(
    switchMap(([context, account]) =>
                balance$(context, token, account)),
    distinctUntilChanged(isEqual)
  );
}

type Dust = (token: string, callback: (err: any, r: BigNumber) => any) => any;

export function createDustLimits$(context$: Observable<NetworkConfig>): Observable<DustLimits> {
  return combineLatest(context$).pipe(
    switchMap(([context]) =>
                forkJoin(
                  tradingTokens.filter(name => name !== 'ETH').map((token: string) => {
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
    distinctUntilChanged(isEqual),
    shareReplay(1)
  );
}

type Allowance = (
  account: string,
  contract: string,
  callback: (err: any, r: BigNumber) => any
) => any;

export function createAllowances$(
  context$: Observable<NetworkConfig>,
  initializedAccount$: Observable<string>,
  onEveryBlock$: Observable<number>
): Observable<Allowances> {
  return combineLatest(context$, initializedAccount$, onEveryBlock$).pipe(
    switchMap(([context, account]) =>
                forkJoin(
                  tradingTokens
                    .filter(token => token !== 'ETH')
                    .map((token: string) =>
                           bindNodeCallback(context.tokens[token].contract.allowance as Allowance)(
                             account, context.otc.address
                           ).pipe(
                             map((x: BigNumber) => ({ [token]: x.gte(MIN_ALLOWANCE) }))
                           )
                    )
                ).pipe(concatAll(), scan((a, e) => ({ ...a, ...e }), {}), last())
    ),
    distinctUntilChanged(isEqual)
  );
}

export function createProxyAllowances$(
  context$: Observable<NetworkConfig>,
  initializedAccount$: Observable<string>,
  proxyAccount$: Observable<string | undefined>,
  onEveryBlock$: Observable<number>,
): Observable<Allowances> {
  return combineLatest(context$, initializedAccount$, proxyAccount$, onEveryBlock$).pipe(
    switchMap(([context, account, proxy]) =>
                forkJoin(
                  Object.keys(context.tokens)
                    .filter(token => token !== 'ETH')
                    .map((token: string) =>
                      proxy ?
                        bindNodeCallback(context.tokens[token].contract.allowance as Allowance)(
                          account, proxy
                        ).pipe(
                          map((x: BigNumber) => ({ [token]: x.gte(MIN_ALLOWANCE) }))
                        )
                      :
                        of({ [token]: false })
                    )
                ).pipe(concatAll(), scan((a, e) => ({ ...a, ...e }), {}), last())
    ),
    distinctUntilChanged(isEqual)
  );
}

export function createWalletApprove(calls$: Calls$, gasPrice$: GasPrice$) {
  return (token: string): Observable<TxState> => {
    const r = calls$.pipe(
      first(),
      switchMap(calls => {
        return calls.approveWallet(gasPrice$, { token });
      })
    );
    r.subscribe();
    return r;
  };
}

export function createWalletDisapprove(calls$: Calls$, gasPrice$: GasPrice$) {
  return (token: string): Observable<TxState> => {
    const r = calls$.pipe(
      first(),
      switchMap(calls => {
        return calls.disapproveWallet(gasPrice$, { token });
      })
    );
    r.subscribe();
    return r;
  };
}