import { BigNumber } from 'bignumber.js';
import { isEqual } from 'lodash';
import { bindNodeCallback, combineLatest, forkJoin, from, Observable, of } from 'rxjs';
import { first } from 'rxjs/internal/operators';
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
import { Contract } from 'web3-eth-contract';
import * as dsProxy from '../../blockchain/abi/ds-proxy.abi.json';
import { ReadCalls, readCalls$, ReadCalls$ } from '../../blockchain/calls/calls';
import {
  AssetKind,
  getToken,
  NetworkConfig,
  tradingTokens
} from '../../blockchain/config';
import { MIN_ALLOWANCE } from '../../blockchain/network';
import { amountFromWei, nullAddress } from '../../blockchain/utils';
import { web3 } from '../../blockchain/web3';
import { Orderbook } from '../../exchange/orderbook/orderbook';
import { TradingPair } from '../../exchange/tradingPair/tradingPair';
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
    context.mcd.osms[token] ?
      readOsm(context, token).pipe(
        map(osm => ({ [token]: osm })),
      ) :
      of({}),
  )).pipe(
    concatAll(),
    reduce(
      (a, e) => ({ ...a, ...e }),
      {},
    ),
  );
}

function osmsParams$(context: NetworkConfig, assets: string[]) {
  return readCalls$.pipe(
    switchMap(calls => {
      return forkJoin(assets.map((token) =>
        context.mcd.osms[token] 
        ? calls.osmParams({ token })
        : of({}),
      )).pipe(
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

function orderbooks$(
  assetNames: string[],
  loadOrderbook: (pair: TradingPair) => Observable<Orderbook>
) {
  return forkJoin(assetNames.map((token) => {
    return loadOrderbook({ base: token, quote: 'DAI' }).pipe(
      first(),
      map(obk => ({ [obk.tradingPair.base]: obk })),
      );
  })).pipe(
    concatAll(),
    reduce(
      (a, e) => ({ ...a, ...e }),
      {},
    ),
  );
}

export function aggregateMTAccountState(
  context: NetworkConfig,
  proxy: Contract,
  calls: ReadCalls,
  daiAllowance: boolean,
  loadOrderbook: (pair: TradingPair) => Observable<Orderbook>
): Observable<MTAccount> {

  const assetNames: string[] = tradingTokens
    .map((symbol: string) => getToken(symbol))
    .filter((t: any) =>
      t.assetKind === AssetKind.marginable
    )
    .map(t => t.symbol);

  return combineLatest(
        calls.mtBalance({ tokens: assetNames, proxyAddress: proxy.options.address }),
        rawMTHistories$(context, proxy.options.address, assetNames),
        osms$(context, assetNames),
        osmsParams$(context, assetNames),
        orderbooks$(assetNames, loadOrderbook)
      ).pipe(
    map(([balanceResult, rawHistories, osmPrices, osmParams, orderbooks]) => {
      const marginables = assetNames
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
            liquidationPenalty: balanceResult[token].liquidationPenalty
          });
        });
      return calculateMTAccount(proxy, marginables, daiAllowance, orderbooks);
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
      proxyAddress ?
      from(context.tokens[token].contract.methods.allowance(
        account, proxyAddress
      ).call()).pipe(
        map((x: string) => new BigNumber(x)),
      ) : of(zero)
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
        return from(context.instantProxyRegistry.contract.methods.proxies(
          account
        ).call()).pipe(
          mergeMap((proxyAddress: string) => {
            if (proxyAddress === nullAddress) {
              return of(undefined);
            }
            const proxy = new web3.eth.Contract(dsProxy as any, proxyAddress);
            return from(proxy.methods.owner().call()).pipe(
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
  loadOrderbook: (pair: TradingPair) => Observable<Orderbook>
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

      const proxy = new web3.eth.Contract(dsProxy as any, proxyAddress);
      return aggregateMTAccountState(context, proxy, calls, daiAllowance, loadOrderbook);
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
