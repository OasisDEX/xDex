/*
 * Copyright (C) 2020 Maker Ecosystem Growth Holdings, INC.
 */
import { from, Observable } from 'rxjs';
import { map, shareReplay } from 'rxjs/operators';
// tslint:disable:import-name
import Web3 from 'web3';

const infuraProjectId = '021c1e62eeb3421cb58c34419bb6422e';
const infuraUrl = `https://mainnet.infura.io/v3/${infuraProjectId}`;
const ethereum = {
  url: infuraUrl,
};

export let web3: Web3;

export type Web3Status = 'ready' | 'readonly' | 'missing' | 'initializing';

export interface Web3Window {
  web3?: any;
  ethereum?: any;
}

export const web3Status$: Observable<Web3Status> = from(['initializing']).pipe(
  map(() => {
    const win = window as Web3Window;
    if (win.ethereum) {
      web3 = new Web3(win.ethereum);
      return 'ready';
    }
    web3 = new Web3(new Web3.providers.HttpProvider(ethereum.url));
    return 'readonly';
  }),
  shareReplay(1),
);
web3Status$.subscribe();

export function setupFakeWeb3ForTesting() {
  // This is a temporary workaround
  const Web3Mock = require('web3');
  web3 = new Web3Mock();
}
