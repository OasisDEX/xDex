import { BigNumber } from 'bignumber.js';
import { bindNodeCallback, combineLatest, forkJoin, Observable, of } from 'rxjs';
import {
  concatAll,
  distinctUntilChanged,
  exhaustMap,
  map,
  mergeMap,
  reduce,
  shareReplay,
  startWith,
  switchMap,
} from 'rxjs/operators';
import * as dsProxy from '../../blockchain/abi/ds-proxy.abi.json';
import { AssetKind, NetworkConfig, tokens } from '../../blockchain/config';
import { every5Seconds$ } from '../../blockchain/network';
import { amountFromWei, nullAddress } from '../../blockchain/utils';
import { web3 } from '../../blockchain/web3';

import { ReadCalls, ReadCalls$ } from '../../blockchain/calls/calls';

import { isEqual } from 'lodash';
import {
  MTAccount,
  MTHistoryEvent
} from './mtAccount';
import { calculateMTAccount, } from './mtCalculate';
import {
  createRawMTHistoryFromCache, RawMTLiquidationHistoryEvent
} from './mtHistory';
import { getCashCore, getMarginableCore, getNonMarginableCore } from './mtTestUtils';

export function aggregateMTAccountState(
  context: NetworkConfig,
  proxy: any,
  calls: ReadCalls,
  rawHistories: MTHistoryEvent[][] | undefined
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
        forkJoin(assetNames.map((token, _i) =>
          (of([])
            // (balancesResult.assets[i].urn === nullAddress) ?
            // of([]) :
            // createRawMTLiquidationHistoryFromCache(context, balancesResult.assets[i].urn)
          ).pipe(
            map(history => ({ [token]: history })),
          )
        )).pipe(
          concatAll(),
          reduce<{ [key: string]: RawMTLiquidationHistoryEvent[] }>((a, e) => ({ ...a, ...e }), {}),
        ),
        forkJoin(assetNames.map((token) =>
          readOsm(context, token).pipe(
            map(osm => ({ [token]: osm })),
          )
        )).pipe(
          concatAll(),
          reduce<{ [key: string]: { current: BigNumber|undefined, next: BigNumber|undefined} }>(
            (a, e) => ({ ...a, ...e }),
            {},
          ),
        ),
      )
    ),
    map(([balanceResult, rawLiquidationHistory, osmPrices]) => {
      const marginables = [...tokenNames.entries()]
        .filter(([_i, token]) => tokens[token].assetKind === AssetKind.marginable)
        .map(([i, token]) => {
          return getMarginableCore({
            name: token,
            assetKind: AssetKind.marginable,
            balance: balanceResult.assets[i].urnBalance,
            ...balanceResult.assets[i],
            safeCollRatio: new BigNumber(tokens[token].safeCollRatio as number),
            rawHistory: (rawHistories ? rawHistories[i] : []),
            rawLiquidationHistory: rawLiquidationHistory[token],
            osmPriceCurrent: (osmPrices as any)[token].current,
            osmPriceNext: (osmPrices as any)[token].next,
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
    combineLatest(context$, proxyAddress$, onEveryBlock$, every5Seconds$).pipe(
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
    switchMap(([context, calls, proxyAddress]) => {

      if (proxyAddress === undefined) {
        proxyAddress = nullAddress;
      }

      const proxy = web3.eth.contract(dsProxy as any).at(proxyAddress);
      return combineLatest(mtRawHistory$, onEveryBlock$).pipe(
        switchMap(([rawHistory]) => aggregateMTAccountState(context, proxy, calls, rawHistory)),
        distinctUntilChanged(isEqual)
      );
    }),
    shareReplay(1)
  );
}

function readOsm(context: NetworkConfig, token: string):
Observable<{current: number|undefined, next: number|undefined}> {
  const hilo = (uint256: string): [BigNumber, BigNumber] => {
    const match = uint256.match(/^0x(\w+)$/);
    if (!match) {
      throw new Error(`invalid uint256: ${uint256}`);
    }
    return (match[0].length <= 32) ?
    [new BigNumber(0), new BigNumber(uint256)] :
    [
      new BigNumber(`0x${match[0].substr(0, match[0].length - 32)}`),
      new BigNumber(`0x${match[0].substr(match[0].length - 32, 32)}`)
    ];
  };
  const slotCurrent = 3;
  const slotNext = 4;
  return combineLatest(
    bindNodeCallback(web3.eth.getStorageAt)(context.osms[token], slotCurrent),
    bindNodeCallback(web3.eth.getStorageAt)(context.osms[token], slotNext),
  ).pipe(
    map(([cur, nxt]: [string, string]) => {
      const [current, next] = [hilo(cur), hilo(nxt)];
      return {
        current: current[0].isZero() ? undefined : amountFromWei(current[1], token),
        next: next[0].isZero() ? undefined : amountFromWei(next[1], token),
      };
    })
  );
}
