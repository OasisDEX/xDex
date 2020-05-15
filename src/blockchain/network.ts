// tslint:disable:no-console
import { BigNumber } from 'bignumber.js';
import { bindNodeCallback, combineLatest, forkJoin, from, fromEvent, interval, Observable, of } from 'rxjs';
import { takeWhileInclusive } from 'rxjs-take-while-inclusive';
import { ajax } from 'rxjs/ajax';
import {
  catchError,
  distinctUntilChanged,
  filter,
  last,
  map,
  mergeMap,
  shareReplay,
  startWith,
  switchMap,
} from 'rxjs/operators';

import { trackingEvents } from '../analytics/analytics';
import { mixpanelIdentify } from '../analytics/mixpanel';
import { getToken, NetworkConfig, networks, tradingTokens } from './config';
import { amountFromWei } from './utils';
import { web3, Web3Status, web3Status$, web3StatusConnected$ } from "./web3";

export const maxGasPerBlock = 8e6;
export const every3Seconds$ = interval(3000).pipe(startWith(0));
export const every5Seconds$ = interval(5000).pipe(startWith(0));
export const every10Seconds$ = interval(10000).pipe(startWith(0));
export const every30Seconds$ = interval(30000).pipe(startWith(0));

export const networkId$ = every3Seconds$.pipe(
  startWith(0),
  switchMap(() =>
    web3StatusConnected$.pipe(
      switchMap(() => bindNodeCallback(web3.eth.net.getId)())
    )
  ),
  distinctUntilChanged(),
  shareReplay(1),
);

networkId$.subscribe( next => console.log('networkId$', next));

export const account$: Observable<string | undefined> = every3Seconds$.pipe(
  switchMap(() =>
    web3StatusConnected$.pipe(
      switchMap(() => bindNodeCallback(web3.eth.getAccounts)())
    )
  ),
  map(([account]) => account),
  distinctUntilChanged(),
  shareReplay(1),
)

account$.subscribe(console.log);

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
    mixpanelIdentify(account!, { wallet: 'metamask' });
    trackingEvents.accountChange(account!, network!);
  });

export const onEveryBlock$ = web3Status$.pipe(
  switchMap(() =>
    fromEvent(window.maker.service('accounts').getProvider(), 'block').pipe(
      map((block: any) => parseInt(block.number.toString('hex'), 16)),
      startWith(window.maker.service('web3')._currentBlock),
    ),
  ),
  distinctUntilChanged(),
  shareReplay(1),
);

type GetBalanceType = (account: string, callback: (err: any, r: BigNumber) => any) => any;

export const etherBalance$: Observable<BigNumber> = initializedAccount$.pipe(
  switchMap(address =>
    onEveryBlock$.pipe(
      switchMap(
        (): Observable<BigNumber> =>
          bindNodeCallback(web3.eth.getBalance as GetBalanceType)(address).pipe(
            map((x: string) => new BigNumber(x)),
            map(balance => {
              return amountFromWei(balance, 'ETH');
            }),
          ),
      ),
      distinctUntilChanged((a1: BigNumber, a2: BigNumber) => a1.comparedTo(a2) === 0),
    ),
  ),
  shareReplay(1),
);

export const MIN_ALLOWANCE = new BigNumber('0xffffffffffffffffffffffffffffffff');

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
  map(x => new BigNumber(x)),
  map(x => x.multipliedBy(1.25).decimalPlaces(0, 0)),
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
    forkJoin(
      tradingTokens.map(token =>
        ajax({
          url: `https://api.coinpaprika.com/v1/tickers/${getToken(token).ticker}/`,
          method: 'GET',
          headers: {
            Accept: 'application/json',
          },
        }).pipe(
          map(({ response }) => ({
            [token]: new BigNumber(response.quotes.USD.price),
          })),
          catchError(error => {
            console.debug(`Error fetching price data: ${error}`);
            return of({});
          }),
        ),
      ),
    ),
  ),
  map(prices => prices.reduce((a, e) => ({ ...a, ...e }))),
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
    catchError(error => {
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
