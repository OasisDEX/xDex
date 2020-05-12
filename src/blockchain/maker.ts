// @ts-ignore
import Maker from '@makerdao/dai';
// @ts-ignore
import walletConnectPlugin from '@makerdao/dai-plugin-walletconnect';
// @ts-ignore
import walletLinkPlugin from '@makerdao/dai-plugin-walletlink';
import { networksByName } from './config';
// @ts-ignore
// import trezorPlugin from '@makerdao/dai-plugin-trezor-web';

import Web3 from 'web3';
import { executeWeb3StatusCommand, WalletType, Web3StatusCommandKind } from './web3';

let maker: any; // TODO: is there a type def for Maker object?
export async function setupMaker(networkId: string): Promise<Web3> {
  const { infuraUrl, infuraUrlWS } = networksByName[networkId];
  const config = {
    log: false,
    plugins: [
      [walletLinkPlugin, { rpcUrl: infuraUrl, appName: 'Oasis' }],
      [walletConnectPlugin, { waitForInitialUpdateTime: 2000 }]
      // trezorPlugin
    ],
    provider: {
      url: infuraUrlWS,
      type: 'WEBSOCKET',
    },
    web3: {
      pollingInterval: null,
    },
    multicall: true,
  };

  maker = await Maker.create('http', config);
  window.maker = maker;

  console.log('Initialized maker instance');

  const accountsService = maker.service('accounts');
  const engine = accountsService.getProvider();

  // Prevent MetaMask from auto-refreshing on network change
  // See: https://metamask.github.io/metamask-docs/API_Reference/Ethereum_Provider#ethereum.autorefreshonnetworkchange'
  // if (window.ethereum) window.ethereum.autoRefreshOnNetworkChange = false;

  // Subscribe to accounts change
  engine.on('accountsChanged', (accounts: string[]) => {
    if (accounts.length !== 0) {
      const address = accounts[0].toLowerCase();
      console.log(`Active account address changed to ${address}`);
      executeWeb3StatusCommand({
        kind: Web3StatusCommandKind.accountChanged,
        address
      });
    }
  });
  // Subscribe to networkId change
  engine.on('networkChanged', (networkId: number) => {
    console.log(`Active networkId changed to ${networkId}`);
    executeWeb3StatusCommand({
      kind: Web3StatusCommandKind.chainChanged,
      chainId: networkId
    });
  });
  // Subscribe to chainId change
  engine.on('chainChanged', (chainId: number) => {
    console.log(`Active chainId changed to ${chainId}`);
    executeWeb3StatusCommand({
      kind: Web3StatusCommandKind.chainChanged,
      chainId
    });
  });

  return maker.service('web3')._web3 as Web3;
}

export async function connectAccount(type: WalletType): Promise<string> {
  // If connecting MetaMask (or another browser provider) we can immediately check
  // if the networkId is the same as the Maker instance one (set via network query param)
  if (type === 'browser') {
    if (!window.web3?.currentProvider?.networkVersion) throw new Error('Unable to find browser provider network id');
    const browserProviderNetworkId = parseInt(window.web3.currentProvider.networkVersion, 10);
    const networkId = maker.service('web3').networkId();
    if (browserProviderNetworkId !== networkId) {
      throw new Error('Browser provider network and URL network param do not match');
    }
  }

  const autoSwitch = type === 'browser';
  const account = await maker.service('accounts').addAccount({ type, autoSwitch });

  if (type !== 'browser') {
    const providerChainId = account.subprovider.chainId;
    const makerChainId = maker.service('web3').networkId();
    if (providerChainId !== makerChainId) {
      disconnectAccount(false);
      throw new Error("Network mismatch: The connected wallet provider's network is different than the current network");
    }
  }

  sessionStorage.setItem('lastConnectedWalletType', type);
  sessionStorage.setItem('lastConnectedWalletAddress', account.address);

  return account.address;
}

function removeSubprovider(subprovider: any) {
  // Remove subprovider from the engine
  maker.service('accounts').getProvider().removeProvider(subprovider);
  const account = maker.service('accounts').currentAccount();
  delete maker.service('accounts')._accounts[account.address];
  maker.service('accounts')._currentAccount = '';
}

export async function disconnectAccount(killSession: boolean = true) {
  if (!maker) return;

  sessionStorage.removeItem('lastConnectedWalletType');
  sessionStorage.removeItem('lastConnectedWalletAddress');

  const { address } = maker.service('accounts').currentAccount();
  const subprovider = maker.service('accounts').currentWallet();
  if (subprovider.isWalletLink) {
    return subprovider.resetAndReload();
  } else if (subprovider.isWalletConnect) {
    const wc = await subprovider.getWalletConnector();
    if (killSession) wc.killSession();
    else wc._transport.close();
  }
  removeSubprovider(subprovider);

  console.log(`Disconnected account: ${address}`);
}
