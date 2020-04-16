import { combineLatest, Observable, of, Subject } from 'rxjs';
import { fromPromise } from 'rxjs/internal-compatibility';
import { distinctUntilChanged, map, shareReplay, startWith, switchMap } from 'rxjs/operators';
// tslint:disable:import-name
import Web3 from 'web3';
import { networks, networksByName } from './config';
import { connectMaker, disconnectMaker } from './maker';

export let web3 : Web3;

export enum Web3Status {
  ready = 'ready',
  readonly = 'readonly',
  // missing = 'missing',
  connecting = 'connecting',
  disconnecting = 'disconnecting'
}

export interface Web3Window {
  web3?: any;
  ethereum?: any;
}

export enum WalletType {
  browser = 'browser',
  walletLink = 'walletlink',
  walletConnect = 'walletconnect',
  trezor = 'trezor'
}

export enum Web3StatusCommandKind {
  connect = 'connect',
  connectReadOnly = 'connectReadOnly',
  disconnect = 'disconnect'
}

export type Web3StatusCommand = {
  kind: Web3StatusCommandKind.connectReadOnly
  network: string,
  // account?
} | {
  kind: Web3StatusCommandKind.connect;
  network: string,
  type: WalletType,
} | {
  kind: Web3StatusCommandKind.disconnect
};

const web3StatusCommand: Subject<Web3StatusCommand> = new Subject();

export function executeWeb3StatusCommand(command: Web3StatusCommand) {
  web3StatusCommand.next(command);
}

function readOnlyWeb3(networkId: string) {
  return new Web3(new Web3.providers.HttpProvider(
    networksByName[networkId].infuraUrl
  ));
}

function setWeb3(newWeb3: Web3) {
  web3 = newWeb3;
  (window as any)._web3 = newWeb3;
}
let networkReadOnly: string;
export const web3Status$: Observable<Web3Status> = web3StatusCommand.pipe(
  switchMap((command: Web3StatusCommand) => {
    if (command.kind === Web3StatusCommandKind.connectReadOnly) {
      console.log('*** connectReadOnly');
      networkReadOnly = command.network;
      setWeb3(readOnlyWeb3(command.network));
      return of(Web3Status.readonly);
    }

    if (command.kind === Web3StatusCommandKind.connect) {
      networkReadOnly = command.network;
      return fromPromise(connectMaker(command.type, command.network)).pipe(
        map(([connectedWeb3]) => {
          setWeb3(connectedWeb3);
          (window as any)._web3 = web3;
          return Web3Status.ready;
        }),
        startWith(Web3Status.connecting),
      );
    }

    if (command.kind === Web3StatusCommandKind.disconnect) {
      return fromPromise(disconnectMaker()).pipe(
        map(() => {
          setWeb3(readOnlyWeb3(networkReadOnly));
          return Web3Status.readonly;
        }),
        // TODO: error handling if any
        startWith(Web3Status.disconnecting),
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
  network: sessionStorage.getItem('network')!
});

export function setupFakeWeb3ForTesting() {
  // This is a temporary workaround
  const Web3Mock = require('web3');
  web3 = new Web3Mock();
  (window as any)._web3 = web3;
}
