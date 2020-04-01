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
import { Web3Window } from './web3';

// @ts-ignore
import Maker, { USD, DAI } from '@makerdao/dai';
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

const connectToWallet$: Subject<number> = new Subject();

export function connectToWallet() {
  connectToWallet$.next(1);
}

const connecting$ = connectToWallet$.pipe(
  switchMap(() => {
    const win = window as Web3Window;
    window.localStorage.setItem('tos', 'true');
    if (win.ethereum) {

    const setupMaker = async () => {
      console.log('Instantiating Maker instance');
      const rpcUrl = 'wss://kovan.infura.io/ws/v3/58073b4a32df4105906c702f167b91d2';
      const config = {
        log: false,
        plugins: [
          [walletLinkPlugin, { rpcUrl: 'https://kovan.infura.io/v3/58073b4a32df4105906c702f167b91d2' }]
        ],
        provider: {
          url: rpcUrl,
          type: 'WEBSOCKET'
        },
        web3: {
          pollingInterval: null
        },
        multicall: true
      };
      const maker = await Maker.create('http', config);
      window.maker = maker;

      // maker.service('transactionManager')
      //   .onTransactionUpdate((tx: any, state: any) => {
      //     console.log('Tx ' + state, tx.metadata);
      //   });

      const account = await maker.service('accounts').addAccount({
        // type: 'browser'
        type: 'walletlink'
      });
      maker.useAccountWithAddress(account.address);
      console.log('*** Connected account:', account);
      // win.web3 = new Web3(win.ethereum);
      win.web3 = maker.service('web3')._web3;
      return [account.address];
    }

    return from(setupMaker()).pipe(
      switchMap(([enabled]) => account$.pipe(
        // @ts-ignore
        filter(account => {
          console.log('account$:', account);
          return (account && account.toLowerCase()) === enabled
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
