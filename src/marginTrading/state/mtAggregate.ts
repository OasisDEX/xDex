import { BigNumber } from 'bignumber.js';
import { bindNodeCallback, combineLatest, Observable, of } from 'rxjs';
import {
  distinctUntilChanged,
  exhaustMap,
  map,
  mergeMap,
  shareReplay, startWith,
  switchMap,
} from 'rxjs/operators';
import * as dsProxy from '../../blockchain/abi/ds-proxy.abi.json';
import { AssetKind, NetworkConfig, tokens } from '../../blockchain/config';
import { web3 } from '../../blockchain/web3';

import { ReadCalls, ReadCalls$ } from '../../blockchain/calls/calls';

import { isEqual } from 'lodash';
import {
  MTAccount,
  MTAccountNotSetup,
  MTAccountSetup,
  MTAccountState,
  MTHistoryEvent
} from './mtAccount';
import { calculateMTAccount, } from './mtCalculate';
import { createRawMTHistoryFromCache } from './mtHistory';
import { getCashCore, getMarginableCore, getNonMarginableCore } from './mtTestUtils';

export function aggregateMTAccountState(
  proxy: any,
  calls: ReadCalls,
  rawHistories: MTHistoryEvent[][] | undefined
): Observable<MTAccountSetup> {

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
  // const tokenNames = assetNames;

  // console.log('tokenNames', tokenNames);

  return calls.mtBalance({ tokens: tokenNames, proxyAddress: proxy.address }).pipe(
    map((balanceResult) => {
      const marginables = [...tokenNames.entries()]
        .filter(([_i, token]) => tokens[token].assetKind === AssetKind.marginable)
        .map(([i, token]) => {
          return getMarginableCore({
            name: token,
            assetKind: AssetKind.marginable,
            balance: balanceResult.assets[i].urnBalance,
            ...balanceResult.assets[i],
            safeCollRatio: new BigNumber(tokens[token].safeCollRatio as number),
            rawHistory: (rawHistories ? rawHistories[i] : [])
          });
        });

      const nonMarginables = [...tokenNames.entries()]
        .filter(([_i, token]) => tokens[token].assetKind === AssetKind.nonMarginable)
        .map(([i, token]) => {
          return getNonMarginableCore({
            name: token,
            assetKind: AssetKind.nonMarginable,
            balance: balanceResult.assets[i].marginBalance,
            walletBalance: balanceResult.assets[i].walletBalance,
            marginBalance: balanceResult.assets[i].marginBalance,
            referencePrice: balanceResult.assets[i].referencePrice,
            allowance: balanceResult.assets[i].allowance,
          });
        });

      const cashResult = balanceResult.assets[balanceResult.assets.length - 1];

      const cash = getCashCore({
        balance: cashResult.marginBalance,
        marginBalance: cashResult.marginBalance,
        allowance: cashResult.allowance,
        walletBalance: cashResult.walletBalance
      });

      return calculateMTAccount(proxy, cash, marginables, nonMarginables);
    })
  );
}

const notSetup: MTAccountNotSetup = { state: MTAccountState.notSetup };

const nullAddress = '0x0000000000000000000000000000000000000000';

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

  const marginableNames: string[] = Object.values(tokens)
    .filter((t: any) => t.assetKind === AssetKind.marginable)
    .map(t => t.symbol);

  // let's fetch history temporarily in a separate pipeline
  const mtRawHistory$: Observable<MTHistoryEvent[][] | undefined> =
    combineLatest(context$, proxyAddress$, onEveryBlock$).pipe(
      exhaustMap(([context, proxyAddress]) => {
        if (!proxyAddress) {
          return of(undefined);
        }
        const proxy = web3.eth.contract(dsProxy as any).at(proxyAddress);
        return combineLatest(
          // marginableNames.map(token => createRawMTHistory(proxy, context, token))
          marginableNames.map(token => createRawMTHistoryFromCache(proxy, context, token))
        );
      }),
      startWith(marginableNames.map(() => [] as MTHistoryEvent[])),
      shareReplay(1)
    );

  return combineLatest(context$, calls$, proxyAddress$).pipe(
    switchMap(([_context, calls, proxyAddress]) => {

      if (proxyAddress === undefined) {
        return of(notSetup);
      }
      const proxy = web3.eth.contract(dsProxy as any).at(proxyAddress);
      return combineLatest(mtRawHistory$, onEveryBlock$).pipe(
        switchMap(([rawHistory]) => aggregateMTAccountState(proxy, calls, rawHistory)),
        distinctUntilChanged(isEqual)
      );
    }),
    shareReplay(1)
  );
}
