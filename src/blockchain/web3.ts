// @ts-ignore
import Maker from '@makerdao/dai';
// @ts-ignore
import walletLinkPlugin from '@makerdao/dai-plugin-walletlink';
import { Observable, of} from 'rxjs';
import {fromPromise} from 'rxjs/internal-compatibility';
import {map, shareReplay, switchMap} from 'rxjs/operators';
// tslint:disable:import-name
import Web3 from 'web3';

const infuraProjectId = 'd96fcc7c667e4a03abf1cecd266ade2d';
const infuraUrl = `https://mainnet.infura.io/v3/${infuraProjectId}`;
const ethereum = {
  url: infuraUrl,
};

export let web3 : Web3;

export enum Web3Status {
  ready = 'ready',
  readonly = 'readonly',
  missing = 'missing',
  initializing = 'initializing'
}

export interface Web3Window {
  web3?: any;
  ethereum?: any;
}

export const web3Status$: Observable<Web3Status> = of(Web3Status.initializing).pipe(
  switchMap(() => {
    // const win = window as Web3Window;
    // if (win.web3) {
    //   // TODO: temporary
    //   web3 = new Web3(win.web3.currentProvider);
    //   // implies metamask?
    //   console.log('*** auto connecting browser!')
    //   return fromPromise(connect('browser')).pipe(
    //     map(() => Web3Status.ready)
    //   );
    //   // web3 = new Web3(win.web3.currentProvider);
    //   // return Web3Status.ready;
    // }
    web3 = new Web3(new Web3.providers.HttpProvider(ethereum.url));
    return of(Web3Status.readonly);
  }),
  shareReplay(1),
);
web3Status$.subscribe();

export function setupFakeWeb3ForTesting() {
  // This is a temporary workaround
  const Web3Mock = require('web3');
  web3 = new Web3Mock();
}

export type WaletType = 'browser' | 'walletlink';

export async function connect(type: WaletType): Promise<string | undefined> {
  console.log('Instantiating Maker instance', type);
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
  // type: 'browser'

  const account = await maker.service('accounts').addAccount({ type });

  console.log('*** Connected account:', account);
  maker.useAccountWithAddress(account.address);
  // win.web3 = new Web3(win.ethereum);

  web3 = maker.service('web3')._web3;

  return account.address;
}
