import { BigNumber } from 'bignumber.js';
import { bindNodeCallback, combineLatest, forkJoin, Observable, of } from 'rxjs';
import {
  catchError,
  concatAll,
  distinctUntilChanged,
  exhaustMap,
  map,
  mergeMap,
  reduce,
  shareReplay,
  switchMap, tap,
} from 'rxjs/operators';
import * as dsProxy from '../../blockchain/abi/ds-proxy.abi.json';
import { MTBalanceResult } from '../../blockchain/calls/mtCalls';
import { AssetKind, NetworkConfig, tokens } from '../../blockchain/config';
import { nullAddress } from '../../blockchain/utils';
import { web3 } from '../../blockchain/web3';

import { ReadCalls, ReadCalls$ } from '../../blockchain/calls/calls';

import { isEqual } from 'lodash';
import {
  MTAccount,
} from './mtAccount';
import { calculateMTAccount, } from './mtCalculate';
import {
  createRawMTHistoryFromCache,
  createRawMTLiquidationHistoryFromCache$,
  RawMTHistoryEvent,
} from './mtHistory';
import { getCashCore, getMarginableCore } from './mtTestUtils';

interface MTHistories {
  [index: string]: RawMTHistoryEvent[];
}

function rawMTLiquidationHistories$(
  context: NetworkConfig, results: MTBalanceResult
): Observable<MTHistories> {
  return forkJoin(Object.entries(results).map(([token, result]) => {
    return (result.urn === nullAddress) ?
      of({ [token]: [] }) :
      createRawMTLiquidationHistoryFromCache$(context, result.urn, token).pipe(
        map(history => ({ [token]: history })),
      );
  })).pipe(
    concatAll(),
    catchError(error => {
      console.log('error', error);
      return of(Object.keys(results).reduce((r, t) => {
        r[t] = [];
        return r;
      },                         {} as MTHistories));
    }
    ),
    reduce((a, e) => ({ ...a, ...e }), {}),
  );
}

function rawMTHistories$(
  context: NetworkConfig, proxy: string, assets: string[]
): Observable<MTHistories> {
  return forkJoin(assets.map(token =>
    createRawMTHistoryFromCache(proxy, context, token).pipe(
      map(history => ({ [token]: history })),
    )
  )).pipe(
    concatAll(),
    catchError(error => {
      return of(assets.reduce((r, t) => {
        r[t] = [];
        return r;
      },                      {} as MTHistories));
    }
    ),
    reduce((a, e) => ({ ...a, ...e }), {}),
  );
}

export function aggregateMTAccountState(
  context: NetworkConfig,
  proxy: any,
  calls: ReadCalls,
): Observable<MTAccount> {

  const assetNames: string[] = Object.values(tokens)
    .filter((t: any) =>
      t.assetKind === AssetKind.marginable ||
      t.assetKind === AssetKind.nonMarginable // ||
      // t.symbol === 'DAI'
    )
    .map(t => t.symbol);

  // const marginableAssetNames: string[] = Object.values(tokens)
  //   .filter((t: any) => t.assetKind === AssetKind.marginable)
  //   .map(t => t.symbol);

  const tokenNames = [...assetNames, 'DAI'];

  return calls.mtBalance({ tokens: tokenNames, proxyAddress: proxy.address }).pipe(
    switchMap(balancesResult =>
      combineLatest(
        of(balancesResult),
        rawMTLiquidationHistories$(context, balancesResult),
        rawMTHistories$(context, proxy.address, assetNames),
      )
    ),
    map(([balanceResult, rawLiquidationHistories, rawHistories]) => {
      const marginables = [...tokenNames.entries()]
        .filter(([_i, token]) => tokens[token].assetKind === AssetKind.marginable)
        .map(([i, token]) => {
          return getMarginableCore({
            name: token,
            assetKind: AssetKind.marginable,
            balance: balanceResult[token].urnBalance,
            ...balanceResult[token],
            safeCollRatio: new BigNumber(tokens[token].safeCollRatio as number),
            rawHistory: [
              ...rawHistories[token],
              ...rawLiquidationHistories[token]
            ].sort((h1, h2) => h1.timestamp - h2.timestamp ),
          });
        });

      const cashResult = balanceResult.DAI;

      const cash = getCashCore({
        balance: cashResult.marginBalance,
        marginBalance: cashResult.marginBalance,
        allowance: cashResult.allowance,
        walletBalance: cashResult.walletBalance
      });

      return calculateMTAccount(proxy, cash, marginables, []);
    })
  );
}

export function createProxyAddress$(
  context$: Observable<NetworkConfig>,
  initializedAccount$: Observable<string>,
  onEveryBlock$: Observable<number>
): Observable<string | undefined> {
  return combineLatest(context$, initializedAccount$, onEveryBlock$).pipe(
    exhaustMap(
      ([context, account]) => {
        return bindNodeCallback(context.marginProxyRegistry.contract.proxies)(account).pipe(
          mergeMap((proxyAddress: string) => {
            if (proxyAddress === nullAddress) {
              return of(undefined);
            }
            const proxy = web3.eth.contract(dsProxy as any).at(proxyAddress);
            return bindNodeCallback(proxy.owner)().pipe(
              mergeMap((ownerAddress: string) =>
                ownerAddress === account ?
                  of(proxyAddress) :
                  of(undefined)
              )
            );
          }),
        );
      }
    ),
    distinctUntilChanged()
  );
}

export function createMta$(
  context$: Observable<NetworkConfig>,
  initializedAccount$: Observable<string>,
  onEveryBlock$: Observable<number>,
  calls$: ReadCalls$,
): Observable<MTAccount> {

  const proxyAddress$ = createProxyAddress$(context$, initializedAccount$, onEveryBlock$);

  return combineLatest(context$, calls$, proxyAddress$).pipe(
    switchMap(([context, calls, proxyAddress]) => {

      if (proxyAddress === undefined) {
        proxyAddress = nullAddress;
      }

      const proxy = web3.eth.contract(dsProxy as any).at(proxyAddress);
      return aggregateMTAccountState(context, proxy, calls);
    }),
    distinctUntilChanged(isEqual),
    shareReplay(1)
  );
}
