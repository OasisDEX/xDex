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
export async function setupMaker(networkId: string): Promise<Web3> {
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

  console.log('Initialized maker instance');

  // maker.on('accounts/CHANGE', (e: any) => {
  //   const { account } = e.payload;
  //   sessionStorage.setItem('lastConnectedWalletType', account.type);
  //   sessionStorage.setItem('lastConnectedWalletAddress', account.address.toLowerCase());
  //   console.log(`Account changed to: ${account.address}`);
  // });

  return maker.service('web3')._web3 as Web3;
}

export async function connectAccount(type: WalletType): Promise<string> {
  // If connecting MetaMask (or another browser provider) check the networkId
  // is the same as the Maker instance one (set via network query param)
  if (type === 'browser') {
    if (!window.web3?.currentProvider?.networkVersion) throw new Error('Unable to find browser provider network id');
    const browserProviderNetworkId = parseInt(window.web3.currentProvider.networkVersion);
    const networkId = maker.service('web3').networkId();
    if (browserProviderNetworkId !== networkId) throw new Error('Browser provider network and URL network param do not match');
  }

  const autoSwitch = type === 'browser';
  const account = await maker.service('accounts').addAccount({ type, autoSwitch });
  maker.useAccountWithAddress(account.address);
  return account.address;
}

export async function disconnectAccount() {
  if (!maker) return;

  const subprovider = maker.service('accounts').currentWallet();
  if (subprovider.isWalletLink) {
    subprovider.resetAndReload();
    return;
  } else if (subprovider.isWalletConnect) {
    await subprovider.getWalletConnector().killSession();
  } else if (
    sessionStorage.getItem('lastConnectedWalletType') === WalletType.browser
  ) {
    ['lastConnectedWalletType', 'lastConnectedWalletAddress'].forEach((x) =>
      sessionStorage.removeItem(x)
    );
  }
  // Remove this subprovider from the engine
  maker.service('accounts').getProvider().removeProvider(subprovider);

  const account = maker.service('accounts').currentAccount();
  delete maker.service('accounts')._accounts[account.address];
  maker.service('accounts')._currentAccount = '';

  console.log(`Disconnected account: ${account.address}`);
}
