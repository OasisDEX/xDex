import { BigNumber } from 'bignumber.js';
import { isEqual } from 'lodash';
import { bindNodeCallback, combineLatest, forkJoin, Observable, of } from 'rxjs';
import {
  catchError,
  concatAll,
  distinctUntilChanged,
  exhaustMap,
  map,
  mergeMap,
  reduce,
  shareReplay, startWith,
  switchMap,
} from 'rxjs/operators';
import * as dsProxy from '../../blockchain/abi/ds-proxy.abi.json';
import { ReadCalls, readCalls$, ReadCalls$ } from '../../blockchain/calls/calls';
import {
  AssetKind,
  getToken,
  NetworkConfig,
  tradingTokens
} from '../../blockchain/config';
import { Allowance, MIN_ALLOWANCE } from '../../blockchain/network';
import { amountFromWei, nullAddress } from '../../blockchain/utils';
import { web3 } from '../../blockchain/web3';
import { zero } from '../../utils/zero';
import {
  MTAccount,
} from './mtAccount';
import { calculateMTAccount, } from './mtCalculate';
import {
  createRawMTHistoryFromCache,
  RawMTHistoryEvent,
} from './mtHistory';
import { getMarginableCore } from './mtTestUtils';

interface MTHistories {
  [index: string]: RawMTHistoryEvent[];
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
      console.log('error', error);
      return of(assets.reduce((r, t) => {
        r[t] = [];
        return r;
      },
                              {} as MTHistories));
    }
    ),
    reduce((a, e) => ({ ...a, ...e }), {}),
  );
}

function osms$(context: NetworkConfig, assets: string[]) {
  return forkJoin(assets.map((token) =>
    readOsm(context, token).pipe(
      map(osm => ({ [token]: osm })
      ),
    )
  )).pipe(
    concatAll(),
    reduce(
      (a, e) => ({ ...a, ...e }),
      {},
    ),
  );
}

function osmsParams$(assets: string[]) {
  return readCalls$.pipe(
    switchMap(calls => {
      return forkJoin(assets.map((token) => {
        return calls.osmParams({ token });
      })).pipe(
          concatAll(),
          reduce(
            (a, e) => ({ ...a, ...e }),
            {},
          )
        );
    }
    ),
  );
}

export function aggregateMTAccountState(
  context: NetworkConfig,
  proxy: any,
  calls: ReadCalls,
  daiAllowance: boolean,
): Observable<MTAccount> {

  const assetNames: string[] = tradingTokens
    .map((symbol: string) => getToken(symbol))
    .filter((t: any) =>
      t.assetKind === AssetKind.marginable ||
      t.assetKind === AssetKind.nonMarginable // ||
      // t.symbol === 'DAI'
    )
    .map(t => t.symbol);

  const tokenNames = [...assetNames];

  return combineLatest(
        calls.mtBalance({ tokens: tokenNames, proxyAddress: proxy.address }),
        rawMTHistories$(context, proxy.address, assetNames),
        osms$(context, assetNames),
        osmsParams$(assetNames),
      ).pipe(
    map(([balanceResult, rawHistories, osmPrices, osmParams]) => {
      const marginables = tokenNames
        .filter(token => getToken(token).assetKind === AssetKind.marginable)
        .map(token => {
          return getMarginableCore({
            name: token,
            assetKind: AssetKind.marginable,
            balance: balanceResult[token].urnBalance,
            redeemable: balanceResult[token].marginBalance,
            ...balanceResult[token],
            safeCollRatio: new BigNumber(getToken(token).safeCollRatio as number),
            osmPriceNext: (osmPrices as any)[token].next,
            zzz: (osmParams as any)[token] as BigNumber,
            rawHistory: rawHistories[token].sort((h1, h2) => h1.timestamp - h2.timestamp),
            minDebt: new BigNumber(20) // todo: take this value from mt balance
          });
        });
      return calculateMTAccount(proxy, marginables, daiAllowance);
    })
  );
}

export function createProxyAllowance$(
  context$: Observable<NetworkConfig>,
  initializedAccount$: Observable<string>,
  onEveryBlock$: Observable<number>,
  proxyAddress$:  Observable<string | undefined>,
  token: string,
): Observable<boolean> {

  return combineLatest(
      context$,
      initializedAccount$,
      proxyAddress$,
      onEveryBlock$
    ).pipe(
    switchMap(([context, account, proxyAddress]) =>
      proxyAddress ? bindNodeCallback(context.tokens[token].contract.allowance as Allowance)(
        account, proxyAddress) : of(zero)
    ),
    map((x: BigNumber) => x.gte(MIN_ALLOWANCE)),
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

  const daiAllowance$ = createProxyAllowance$(
    context$,
    initializedAccount$,
    onEveryBlock$,
    proxyAddress$,
    'DAI',
  );
  return combineLatest(context$, calls$, proxyAddress$, daiAllowance$, onEveryBlock$).pipe(
    switchMap(([context, calls, proxyAddress, daiAllowance]) => {

      if (proxyAddress === undefined) {
        proxyAddress = nullAddress;
      }

      const proxy = web3.eth.contract(dsProxy as any).at(proxyAddress);
      return aggregateMTAccountState(context, proxy, calls, daiAllowance);
    }),
    distinctUntilChanged(isEqual),
    shareReplay(1)
  );
}

export function readOsm(context: NetworkConfig, token: string):
  Observable<{next: number|undefined}> {
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
  // const slotCurrent = 3;
  const slotNext = 4;
  return combineLatest(
    bindNodeCallback(web3.eth.getStorageAt)(context.mcd.osms[token].address, slotNext),
  ).pipe(
    map(([nxt]: [string, string]) => {
      const next = hilo(nxt);
      return {
        // current: current[0].isZero() ? undefined : amountFromWei(current[1], token),
        next: next[0].isZero() ? undefined : amountFromWei(next[1], token),
      };
    }),
    startWith({})
  );
}
