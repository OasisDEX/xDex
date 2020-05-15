import { Observable, of, Subject } from 'rxjs';
import { fromPromise } from 'rxjs/internal-compatibility';
import { catchError, distinctUntilChanged, filter, map, shareReplay, startWith, switchMap } from "rxjs/operators";
// tslint:disable:import-name
import Web3 from 'web3';
import { networks } from './config'
import { connectAccount, disconnectAccount, setupMaker } from './maker';
import { getCurrentProviderName } from "./providers";

export let web3: Web3;

export enum Web3Status {
  ready = 'ready',
  readonly = 'readonly',
  // missing = 'missing',
  connecting = 'connecting',
  disconnecting = 'disconnecting',
}

export type Web3ObjectConnected = {
  status: Web3Status.readonly;
  network: string;
  web3: Web3;
  walletType: WalletType,
  walletName?: string,
  walletIcon?: string
} | {
  status: Web3Status.ready;
  network: string;
  account: string;
  web3: Web3
  walletType: WalletType,
  walletName?: string,
  walletIcon?: string
};

export type Web3Object = Web3ObjectConnected | {
  status: Web3Status.connecting | Web3Status.disconnecting;
};

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
  chainChanged = 'chainChanged',
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
      address: string;
    }
  | {
      kind: Web3StatusCommandKind.chainChanged;
      chainId: number;
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
export const web3Status$: Observable<Web3Object> = web3StatusCommand.pipe(
  switchMap((command: Web3StatusCommand) => {
    if (command.kind === Web3StatusCommandKind.connectReadOnly) {
      return fromPromise(setupMaker(command.network)).pipe(
        map(connectedWeb3 => {
          setWeb3(connectedWeb3);
          return {
            status: Web3Status.readonly,
            network: command.network,
            walletType: WalletType.browser,
          };
        }),
      );
    } else if (command.kind === Web3StatusCommandKind.connect) {
      return fromPromise(connectAccount(command.type)).pipe(
        map(address => {
          const provider = window.maker.service('accounts')._engine._providers[0];
          const providerParams = getCurrentProviderName(provider);
          return {
            status: Web3Status.ready,
            network: command.network,
            walletType: WalletType.browser,
            walletName: providerParams.name,
            walletIcon: providerParams.icon,
          }
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
        map(([networkId]) => {
          return {
            status: Web3Status.readonly,
            network: networks[networkId].name,
            walletType: WalletType.browser,
          }
        }),
        startWith(Web3Status.disconnecting),
      );
    } else if (command.kind === Web3StatusCommandKind.accountChanged) {
      sessionStorage.setItem('lastConnectedWalletAddress', command.address);
      return of(Web3Status.ready);
    } else if (command.kind === Web3StatusCommandKind.chainChanged) {
      if (document.location.href.indexOf('network=') !== -1) document.location.href = document.location.href.replace(/network=[a-z]+/i, 'network=' + (command.chainId === 1 ? 'main' : 'kovan'));
      else document.location.href = document.location.href + '?network=' + (command.chainId === 1 ? 'main' : 'kovan');
      return of(Web3Status.disconnecting);
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

export const web3StatusConnected$: Observable<Web3ObjectConnected> = web3Status$.pipe(
  filter(web3Status =>
    web3Status.status === Web3Status.readonly || web3Status.status === Web3Status.ready
  )
) as Observable<Web3ObjectConnected>;

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
