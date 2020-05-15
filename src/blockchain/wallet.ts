import { isEqual } from 'lodash';
import { combineLatest, interval, Observable } from 'rxjs';
import { distinctUntilChanged, map, shareReplay, startWith } from 'rxjs/operators';
import { account$ } from './network';
// tslint:disable:import-name

import { Web3Status, web3Status$, Web3Window } from './web3';

const tosAccepted$: Observable<boolean> = interval(500).pipe(
  map(() => JSON.parse(localStorage.getItem('tos') || 'false')),
  startWith(JSON.parse(localStorage.getItem('tos') || 'false')),
  distinctUntilChanged(isEqual),
);

export enum WalletStatus {
  disconnected = 'disconnected',
  connecting = 'connecting',
  connected = 'connected',
  missing = 'missing',
}
export const walletStatus$: Observable<WalletStatus> = combineLatest(tosAccepted$, web3Status$, account$).pipe(
  map(([tosAccepted, web3Status, account]) =>
    [Web3Status.connecting, Web3Status.disconnecting].indexOf(web3Status.status) >= 0
      ? WalletStatus.connecting
      : tosAccepted
      ? account
        ? WalletStatus.connected
        : WalletStatus.disconnected
      : (window as Web3Window).ethereum
      ? WalletStatus.disconnected
      : WalletStatus.missing,
  ),
  shareReplay(1),
);

// walletStatus$.subscribe(console.log);
