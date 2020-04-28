import { Observable, Subject, of } from 'rxjs';
import { fromPromise } from 'rxjs/internal-compatibility';
import { catchError, distinctUntilChanged, map, shareReplay, startWith, switchMap } from 'rxjs/operators';
// tslint:disable:import-name
import Web3 from 'web3';
import { connectAccount, disconnectAccount, setupMaker } from './maker';

export let web3: Web3;

export enum Web3Status {
  ready = 'ready',
  readonly = 'readonly',
  // missing = 'missing',
  connecting = 'connecting',
  disconnecting = 'disconnecting',
}

export interface Web3Window {
  web3?: any;
  ethereum?: any;
}

export enum WalletType {
  browser = 'browser',
  walletLink = 'walletlink',
  walletConnect = 'walletconnect',
  trezor = 'trezor',
}

export enum Web3StatusCommandKind {
  connect = 'connect',
  connectReadOnly = 'connectReadOnly',
  accountChanged = 'accountChanged',
  disconnect = 'disconnect',
}

export type Web3StatusCommand =
  | {
      kind: Web3StatusCommandKind.connectReadOnly;
      network: string;
      // account?
    }
  | {
      kind: Web3StatusCommandKind.connect;
      network: string;
      type: WalletType;
    }
  | {
      kind: Web3StatusCommandKind.accountChanged;
    }
  | {
      kind: Web3StatusCommandKind.disconnect;
    };

const web3StatusCommand: Subject<Web3StatusCommand> = new Subject();

export function executeWeb3StatusCommand(command: Web3StatusCommand) {
  web3StatusCommand.next(command);
}

function setWeb3(newWeb3: Web3) {
  web3 = newWeb3;
  (window as any)._web3 = newWeb3;
}
// let networkReadOnly: string;
export const web3Status$: Observable<Web3Status> = web3StatusCommand.pipe(
  switchMap((command: Web3StatusCommand) => {
    if (command.kind === Web3StatusCommandKind.connectReadOnly) {
      return fromPromise(setupMaker(command.network)).pipe(
        map(connectedWeb3 => {
          setWeb3(connectedWeb3);
          return Web3Status.readonly;
        }),
      );
    } else if (command.kind === Web3StatusCommandKind.connect) {
      // networkReadOnly = command.network;
      return fromPromise(connectAccount(command.type)).pipe(
        map(address => {
          console.log(`Connected account: ${address}`);
          return Web3Status.ready;
        }),
        startWith(Web3Status.connecting),
        catchError(error => {
          console.error(`Error: ${error.message}`);
          alert(error.message);
          return Web3Status.readonly;
        }),
      );
    } else if (command.kind === Web3StatusCommandKind.disconnect) {
      return fromPromise(disconnectAccount()).pipe(
        map(() => {
          return Web3Status.readonly;
        }),
        // TODO: error handling if any
        startWith(Web3Status.disconnecting),
      );
    } else if (command.kind === Web3StatusCommandKind.accountChanged) {
      return of(Web3Status.ready).pipe(
        startWith(Web3Status.connecting)
      );
    }
    throw new Error('Should not get here!');
  }),
  startWith(Web3Status.connecting),
  distinctUntilChanged(),
  shareReplay(1),
);

function getParameterByName(name: string) {
  const match = RegExp('[?&]' + name + '=([^&]*)').exec(window.location.search);
  return match && decodeURIComponent(match[1].replace(/\+/g, ' '));
}

web3Status$.subscribe();

sessionStorage.setItem('network', getParameterByName('network') || 'main');
executeWeb3StatusCommand({
  kind: Web3StatusCommandKind.connectReadOnly,
  network: sessionStorage.getItem('network')!,
});

export function setupFakeWeb3ForTesting() {
  // This is a temporary workaround
  const Web3Mock = require('web3');
  web3 = new Web3Mock();
  (window as any)._web3 = web3;
}
