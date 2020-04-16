// @ts-ignore
import Maker from '@makerdao/dai';
import { networksByName } from './config';
// @ts-ignore
import walletConnectPlugin from '@makerdao/dai-plugin-walletconnect';
// @ts-ignore
import walletLinkPlugin from '@makerdao/dai-plugin-walletlink';
// @ts-ignore
// import trezorPlugin from '@makerdao/dai-plugin-trezor-web';

import { WalletType } from './web3';
import Web3 from 'web3';

let maker: any; // TODO: is there a type def for Maker object?
export async function connectMaker(type: WalletType, networkId: string): Promise<[Web3, string]> {
  console.log('Instantiating Maker instance', type);
  const { infuraUrl, infuraUrlWS } = networksByName[networkId];
  const config = {
    log: false,
    plugins: [
      [walletLinkPlugin, { rpcUrl: infuraUrl, appName: 'Oasis' }],
      walletConnectPlugin,
      // trezorPlugin
    ],
    provider: {
      url: infuraUrlWS,
      type: 'WEBSOCKET'
    },
    web3: {
      pollingInterval: null
    },
    multicall: true
  };

  maker = await Maker.create('http', config);
  window.maker = maker;

  const account = await maker.service('accounts').addAccount({ type });

  maker.useAccountWithAddress(account.address);

  return [maker.service('web3')._web3 as Web3, account.address];
}

export async function disconnectMaker() {
  if (!maker) {
    return;
  }

  const subprovider = maker.service('accounts').currentWallet();
  if (subprovider.isWalletLink) {
    subprovider.resetWallet();
  } else if (subprovider.isWalletConnect) {
    await subprovider.getWalletConnector().killSession();
  } else if (
    sessionStorage.getItem('lastConnectedWalletType') === WalletType.browser
  ) {
    ['lastConnectedWalletType',
      'lastConnectedWalletAddress'
    ].forEach(x =>
                sessionStorage.removeItem(x)
    );
  }
  maker.service('accounts')._accounts = {};
  maker.service('accounts')._currentAccount = '';
}
