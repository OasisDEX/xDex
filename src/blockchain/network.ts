/*
 * Copyright (C) 2020 Maker Ecosystem Growth Holdings, INC.
 */

// tslint:disable:no-console
import { BigNumber } from 'bignumber.js';
import { bindNodeCallback, combineLatest, concat, from, interval, Observable, of } from 'rxjs';
import { takeWhileInclusive } from 'rxjs-take-while-inclusive';
import { ajax } from 'rxjs/ajax';
import {
  catchError,
  distinctUntilChanged,
  filter,
  first,
  last,
  map,
  mergeMap,
  shareReplay,
  skip,
  startWith,
  switchMap,
} from 'rxjs/operators';

import { trackingEvents } from '../analytics/analytics';
import { mixpanelIdentify } from '../analytics/mixpanel';
import { NetworkConfig, networks, tradingTokens } from './config';
import { amountFromWei } from './utils';
import { web3 } from './web3';

export const maxGasPerBlock = 8e6;
export const every3Seconds$ = interval(3000).pipe(startWith(0));
export const every5Seconds$ = interval(5000).pipe(startWith(0));
export const every10Seconds$ = interval(10000).pipe(startWith(0));
export const every30Seconds$ = interval(30000).pipe(startWith(0));

export const version$ = web3 && bindNodeCallback(web3.eth.getNodeInfo)();

export const networkId$ = every3Seconds$.pipe(
  startWith(0),
  switchMap(() => bindNodeCallback(web3.eth.net.getId)()),
  distinctUntilChanged(),
  shareReplay(1),
);

export const account$: Observable<string | undefined> = every3Seconds$.pipe(
  switchMap(() => bindNodeCallback(web3.eth.getAccounts)()),
  map(([account]) => account),
  distinctUntilChanged(),
  shareReplay(1),
);

export const initializedAccount$ = account$.pipe(
  filter((account: string | undefined) => account !== undefined),
) as Observable<string>;

export const context$: Observable<NetworkConfig> = networkId$.pipe(
  filter((id: string) => networks[id] !== undefined),
  map((id: string) => networks[id]),
  shareReplay(1),
);

combineLatest(account$, context$)
  .pipe(
    mergeMap(([account, network]) => {
      return of([account, network.name]);
    }),
  )
  .subscribe(([account, network]) => {
    if (account) {
      mixpanelIdentify(account, { walletType: 'metamask' });
      trackingEvents.accountChange(account, network!);
    }
  });

export const onEveryBlock$ = combineLatest(every5Seconds$, context$).pipe(
  switchMap(() => bindNodeCallback(web3.eth.getBlockNumber)()),
  catchError((error, source) => {
    console.log(error);
    return concat(every5Seconds$.pipe(skip(1), first()), source);
  }),
  distinctUntilChanged(),
  shareReplay(1),
);

type GetBalanceType = (account: string, callback: (err: any, r: BigNumber) => any) => any;

export const etherBalance$: Observable<BigNumber> = initializedAccount$.pipe(
  switchMap((address) =>
    onEveryBlock$.pipe(
      switchMap(
        (): Observable<BigNumber> =>
          bindNodeCallback(web3.eth.getBalance as GetBalanceType)(address).pipe(
            map((x: string) => new BigNumber(x)),
            map((balance) => {
              return amountFromWei(balance, 'ETH');
            }),
          ),
      ),
      distinctUntilChanged((a1: BigNumber, a2: BigNumber) => a1.comparedTo(a2) === 0),
    ),
  ),
  shareReplay(1),
);

export const MIN_ALLOWANCE = new BigNumber('0x845951614014880000000'); // 1e+25 = 10**25

export function allowance$(token: string, guy?: string): Observable<boolean> {
  return combineLatest(context$, initializedAccount$, onEveryBlock$).pipe(
    switchMap(([context, account]) =>
      from(context.tokens[token].contract.methods.allowance(account, guy ? guy : context.otc.address).call()),
    ),
    map((x: string) => new BigNumber(x)),
    map((x: BigNumber) => x.gte(MIN_ALLOWANCE)),
  );
}

export type GasPrice$ = Observable<BigNumber>;

export const gasPrice$: GasPrice$ = onEveryBlock$.pipe(
  switchMap(() => bindNodeCallback(web3.eth.getGasPrice)()),
  map((x) => new BigNumber(x)),
  map((x) => x.multipliedBy(1.25).decimalPlaces(0, 0)),
  distinctUntilChanged((x: BigNumber, y: BigNumber) => x.eq(y)),
  shareReplay(1),
);

export interface Ticker {
  [label: string]: BigNumber;
}

// TODO: This should be unified with fetching price for ETH.
// Either this logic should contain only fetching from 3rd party endpoint
// or we wait until all of the tokens have PIP deployed.
export const tokenPricesInUSD$: Observable<Ticker> = onEveryBlock$.pipe(
  switchMap(() =>
    ajax({
      url: `https://api.coinpaprika.com/v1/tickers`,
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
    }).pipe(
      map(({ response }) => response.filter(({ symbol }: { symbol: string }) => tradingTokens.includes(symbol))),
      map((supportedTokens) =>
        supportedTokens.map((token: any) => {
          return { [token.symbol]: new BigNumber(token.quotes.USD.price) } as Ticker;
        }),
      ),
      catchError((error) => {
        console.debug(`Error fetching price data: ${error}`);
        return of({});
      }),
    ),
  ),
  map((prices: Ticker[]) => prices.reduce((a, e) => ({ ...a, ...e }))),
  shareReplay(1),
);

function getPriceFeed(ticker: string): Observable<BigNumber | undefined> {
  return ajax({
    url: `https://api.coinpaprika.com/v1/tickers/${ticker}/`,
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
  }).pipe(
    map(({ response }) => new BigNumber(response.quotes.USD.price)),
    catchError((error) => {
      console.debug(`Error fetching price data: ${error}`);
      return of(undefined);
    }),
  );
}

export const etherPriceUsd$: Observable<BigNumber | undefined> = onEveryBlock$.pipe(
  switchMap(() => getPriceFeed('eth-ethereum')),
  distinctUntilChanged((x: BigNumber, y: BigNumber) => x?.eq(y)),
  shareReplay(1),
);
export const daiPriceUsd$: Observable<BigNumber | undefined> = onEveryBlock$.pipe(
  switchMap(() => getPriceFeed('dai-dai')),
  distinctUntilChanged((x: BigNumber, y: BigNumber) => x?.eq(y)),
  shareReplay(1),
);

export function waitUntil<T>(
  value: Observable<T>,
  condition: (v: T) => boolean,
  maxRetries = 5,
  generator$ = onEveryBlock$,
): Observable<T> {
  return generator$.pipe(
    switchMap(() => value),
    takeWhileInclusive((v, i) => i < maxRetries && !condition(v)),
    last(),
  );
}
