import { combineLatest, from, interval, Observable, of, Subject } from 'rxjs';
import {
  catchError,
  distinctUntilChanged,
  filter,
  first,
  map,
  shareReplay,
  startWith,
  switchMap,
  tap
} from 'rxjs/operators';
// tslint:disable:import-name
import Web3 from 'web3';

import { isEqual } from 'lodash';
import { account$ } from './network';
import {connect, WaletType, Web3Window} from './web3';

// @ts-ignore
import Maker, { DAI, USD } from '@makerdao/dai';
// @ts-ignore
import walletLinkPlugin from '@makerdao/dai-plugin-walletlink';
// @ts-ignore
// import McdPlugin, { ETH, BAT, MDAI, USDC } from '@makerdao/dai-plugin-mcd';

export type WalletStatus = 'disconnected' | 'connecting' | 'connected' | 'denied' | 'missing';

export const accepted$ = interval(500).pipe(
  map(() => JSON.parse(localStorage.getItem('tos') || 'false')),
  startWith(JSON.parse(localStorage.getItem('tos') || 'false')),
  distinctUntilChanged(isEqual)
);

const connectToWallet$: Subject<WaletType> = new Subject();

export function connectToWallet(type: WaletType) {
  connectToWallet$.next(type);
}

const connecting$ = connectToWallet$.pipe(
  switchMap((type) => {
    const win = window as Web3Window;
    window.localStorage.setItem('tos', 'true');
    if (win.ethereum) {
      return from(connect(type)).pipe(
        switchMap((connectedAccount) => account$.pipe(
          // @ts-ignore
          filter(account => {
            console.log('account$:', account);
            return (account && account.toLowerCase()) === connectedAccount;
          }),
          first(),
          map(() => {
            return undefined;
          }),
        )),
        startWith('connecting'),
        catchError(() => of('denied')),
      );
    }
    return of();
  }),
  startWith(undefined)
);

export const walletStatus$: Observable<WalletStatus> = combineLatest(
  account$,
  accepted$,
  connecting$
).pipe(
  map(([account, hasAcceptedToS, connecting]) =>
    connecting ? connecting :
      account && hasAcceptedToS ?
        'connected' :
        (window as Web3Window).ethereum ?
          'disconnected' :
          'missing'
  ),
  tap(console.log),
  shareReplay(1),
);

// walletStatus$.subscribe(console.log);
