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

async function checkEthereumProvider() {
  let provider;
  if (typeof window.ethereum !== 'undefined') {
    await window.ethereum.enable();
    provider = window.ethereum;
  } else if (window.web3) {
    provider = window.web3.currentProvider;
  } else {
    throw new Error('No web3 provider detected');
  }

  const web3 = new Web3(provider);
  const networkId = await web3.eth.net.getId();
  const address = (await web3.eth.getAccounts())[0];

  return { networkId, address };
}

export async function connectAccount(type: WalletType): Promise<string> {
  const makerNetworkId = maker.service('web3').networkId();

  if (type === 'browser') {
    const browserProvider = await checkEthereumProvider();
    if (browserProvider.networkId !== makerNetworkId) throw new Error('Browser provider network and URL network param do not match.');
  }

  const autoSwitch = type === 'browser';
  const account = await maker.service('accounts').addAccount({ type, autoSwitch });

  if (type !== 'browser') {
    const providerChainId = account.subprovider.chainId;
    if (providerChainId !== makerNetworkId) {
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
  return [maker.service('web3').networkId()];
}
