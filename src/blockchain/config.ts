import { fromPairs, memoize, zip } from 'lodash';

import { TradingPair } from '../exchange/tradingPair/tradingPair';
import daiCircleSvg from '../icons/coins/dai-circle.svg';
import daiColorSvg from '../icons/coins/dai-color.svg';
import daiSvg from '../icons/coins/dai.svg';
import ethCircleSvg from '../icons/coins/eth-circle.svg';
import ethColorSvg from '../icons/coins/eth-color.svg';
import ethSvg from '../icons/coins/eth.svg';

import { SvgImageSimple } from '../utils/icons/utils';
import * as eth from './abi/ds-eth-token.abi.json';
import * as dsProxyFactory from './abi/ds-proxy-factory.abi.json';
import * as dsValue from './abi/ds-value.abi.json';
import * as erc20 from './abi/erc20.abi.json';
import * as otc from './abi/matching-market.abi.json';
import * as mcdCat from './abi/mcd-cat.abi.json';
import * as mcdFlipper from './abi/mcd-flipper.abi.json';
import * as otcSupport from './abi/otc-support-methods.abi.json';
import * as proxyActions from './abi/proxy-actions.abi.json';
import * as proxyCreationAndExecute from './abi/proxy-creation-and-execute.abi.json';
import * as proxyRegistry from './abi/proxy-registry.abi.json';
import { web3 } from './web3';

export const tradingPairs: TradingPair[] = [
  { base: 'WETH', quote: 'DAI' },
  // ...process.env.REACT_APP_OASIS_DEX_ENABLED !== '1' ? [] : [
  //   // { base: 'MKR', quote: 'DAI' },
  //   // { base: 'MKR', quote: 'WETH' },
  //   { base: 'DGD', quote: 'DAI' },
  //   { base: 'REP', quote: 'DAI' },
  //   { base: 'OMG', quote: 'DAI' },
  //   { base: 'ZRX', quote: 'DAI' }
  // ]
];

function asMap<D>(key: string, data: D[]): { [key: string]: D } {
  return fromPairs(zip(data.map((row: D) => (row as any)[key]), data));
}

export enum AssetKind {
  unknown = 'unknown',
  cash = 'cash',
  marginable = 'marginable',
  nonMarginable = 'nonMarginable'
}

export const tokens = asMap('symbol', [
  {
    symbol: 'ETH',
    precision: 18,
    digits: 5,
    digitsInstant: 3,
    safeCollRatio: undefined,
    maxSell: '10000000',
    name: 'Ether',
    icon: SvgImageSimple(ethSvg),
    // iconInverse: SvgImageSimple(ethInverseSvg),
    iconCircle: SvgImageSimple(ethCircleSvg),
    iconColor: SvgImageSimple(ethColorSvg),
    assetKind: AssetKind.unknown,
  },
  // ...process.env.REACT_APP_OASIS_DEX_ENABLED !== '1' ? [] : [{
  //   symbol: 'MKR',
  //   precision: 18,
  //   digits: 5,
  //   digitsInstant: 3,
  //   maxSell: '10000000',
  //   name: 'Maker',
  //   icon: SvgImageSimple(mkrSvg),
  //   // iconInverse: SvgImageSimple(mkrInverseSvg),
  //   iconCircle: SvgImageSimple(mkrInverseSvg),
  //   iconColor: SvgImageSimple(mkrInverseSvg),
  // }],
  {
    symbol: 'WETH',
    precision: 18,
    digits: 5,
    digitsInstant: 3,
    safeCollRatio: 2,
    maxSell: '10000000',
    name: 'Wrapped Ether',
    icon: SvgImageSimple(ethSvg),
    // iconInverse: SvgImageSimple(ethCircleSvg),
    iconCircle: SvgImageSimple(ethCircleSvg),
    iconColor: SvgImageSimple(ethColorSvg),
    assetKind: AssetKind.marginable,
  },
  {
    symbol: 'DAI',
    precision: 18,
    digits: 2,
    digitsInstant: 2,
    safeCollRatio: undefined,
    maxSell: '10000000',
    name: 'Dai',
    icon: SvgImageSimple(daiSvg),
    // iconInverse: SvgImageSimple(daiInverseSvg),
    iconCircle: SvgImageSimple(daiCircleSvg),
    iconColor: SvgImageSimple(daiColorSvg),
  },
  // {
  //   symbol: 'DGX',
  //   precision: 18,
  //   digits: 5,
  //   safeCollRatio: 1.5,
  //   maxSell: '1000000000000000',
  //   name: 'Digix',
  //   icon: SvgImageSimple(mkrSvg),
  //   iconInverse: SvgImageSimple(mkrInverseSvg),
  //   iconCircle: SvgImageSimple(mkrSvg),
  //   iconColor: SvgImageSimple(mkrInverseSvg),
  // },
  // {
  //   symbol: 'DGD',
  //   precision: 9,
  //   digits: 5,
  //   safeCollRatio: 1.5,
  //   maxSell: '1000000000000000',
  //   name: 'DigixDAO',
  //   icon: SvgImageSimple(dgdSvg),
  //   // iconInverse: SvgImageSimple(dgdInverseSvg),
  //   iconCircle: SvgImageSimple(dgdCircleSvg),
  //   iconColor: SvgImageSimple(dgdColorSvg),
  //   assetKind: AssetKind.marginable,
  // },
  // {
  //   symbol: 'REP',
  //   precision: 18,
  //   digits: 5,
  //   safeCollRatio: 1.5,
  //   maxSell: '1000000000000000',
  //   name: 'Augur',
  //   icon: SvgImageSimple(repSvg),
  //   // iconInverse: SvgImageSimple(repInverseSvg),
  //   iconCircle: SvgImageSimple(repCircleSvg),
  //   iconColor: SvgImageSimple(repColorSvg),
  //   assetKind: AssetKind.marginable,
  // },
  // {
  //   symbol: 'OMG',
  //   precision: 18,
  //   digits: 5,
  //   safeCollRatio: 1.5,
  //   maxSell: '1000000000000000',
  //   name: 'OmniseGO',
  //   icon: SvgImageSimple(omgSvg),
  //   // iconInverse: SvgImageSimple(mkrInverseSvg),
  //   iconCircle: SvgImageSimple(omgCircleSvg),
  //   iconColor: SvgImageSimple(omgColorSvg),
  //   assetKind: AssetKind.marginable,
  // },
  // {
  //   symbol: 'ZRX',
  //   precision: 18,
  //   digits: 5,
  //   safeCollRatio: 1.5,
  //   maxSell: '1000000000000000',
  //   name: '0x',
  //   icon: SvgImageSimple(zrxSvg),
  //   // iconInverse: SvgImageSimple(mkrInverseSvg),
  //   iconCircle: SvgImageSimple(zrxCircleSvg),
  //   iconColor: SvgImageSimple(zrxColorSvg),
  //   assetKind: AssetKind.marginable,
  // },
  // {
  //   symbol: 'BAT',
  //   precision: 18,
  //   digits: 5,
  //   safeCollRatio: 1.5,
  //   maxSell: '1000000000000000',
  //   name: 'Basic Attention Token',
  //   icon: SvgImageSimple(batSvg),
  //   // iconInverse: SvgImageSimple(batInverseSvg),
  //   iconCircle: SvgImageSimple(batCircleSvg),
  //   iconColor: SvgImageSimple(batColorSvg),
  //   assetKind: AssetKind.marginable,
  // },
  // {
  //   symbol: 'USDC',
  //   precision: 6,
  //   digits: 5,
  //   safeCollRatio: 1.5,
  //   maxSell: '1000000000000000',
  //   name: 'USD Coin',
  //   icon: SvgImageSimple(usdcSvg),
  //   // iconInverse: SvgImageSimple(usdcInverseSvg),
  //   iconCircle: SvgImageSimple(usdcCircleSvg),
  //   iconColor: SvgImageSimple(usdcColorSvg),
  //   assetKind: AssetKind.marginable,
  //   // address: 0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48
  // },
  // {
  //   symbol: 'WBTC',
  //   precision: 8,
  //   digits: 5,
  //   safeCollRatio: 1.5,
  //   maxSell: '1000000000000000',
  //   name: 'Wrapped Bitcoin',
  //   icon: SvgImageSimple(wbtcSvg),
  //   // iconInverse: SvgImageSimple(wbtcInverseSvg),
  //   iconCircle: SvgImageSimple(wbtcCircleSvg),
  //   iconColor: SvgImageSimple(wbtcColorSvg),
  //   assetKind: AssetKind.marginable,
  //   // address: 0x2260fac5e5542a773aa44fbcfedf7c193bc2c599
  // }
]);

const load = memoize(
  (abi: any, address: string) => {
    return {
      address,
      contract: web3.eth.contract(abi).at(address)
    };
  },
  (_abi: any, address: string) => address
);

function loadToken(token: string, abi: any, address: string) {
  return { token, ...load(abi, address) };
}

const protoMain = {
  id: '1',
  name: 'main',
  label: 'Mainnet',
  thresholds: {
    ethdai: 0.02,
    mkrdai: 0.01,
    mkreth: 0.01
  },
  safeConfirmations: 0,
  avgBlocksPerDay: 5760 * 1.05,
  startingBlock: 4751582,
  get otc() { return load(otc, '0x39755357759ce0d7f32dc8dc45414cca409ae24e'); },
  // get saiTub() { return load(saiTub, '0x448a5065aebb8e423f0896e6c5d525c040f59af3'); },
  get ethPip() { return load(dsValue, '0x3546C7E3753C0e1D15878EC1C6dC65573864Dab7'); },
  get tokens() {
    return asMap('token', [
      loadToken('WETH', eth, '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2'),
      loadToken('DAI', erc20, '0x89d24a6b4ccb1b6faa2625fe562bdd9a23260359'),
      loadToken('MKR', erc20, '0x9f8F72aA9304c8B593d555F12eF6589cC3A579A2'),
      loadToken('DGD', erc20, '0xe0b7927c4af23765cb51314a0e0521a9645f0e2a'),
      loadToken('REP', erc20, '0x1985365e9f78359a9B6AD760e32412f4a445E862'),
      loadToken('OMG', erc20, '0xd26114cd6EE289AccF82350c8d8487fedB8A0C07'),
      loadToken('ZRX', erc20, '0xe41d2489571d322189246dafa5ebde1f4699f498'),
      loadToken('BAT', erc20, '0x0d8775f648430679a709e98d2b0cb6250d2887ef'),
    ]);
  },
  joins: {} as { [key: string]: string },
  mcd: {} as { [key: string]: any },
  prices: {} as { [key: string]: string },
  spot: '',
  jug: '',
  cdpManager: '',
  ilks: {} as { [key: string]: string },
  get otcSupportMethods() {
    return load(otcSupport, '0x9b3f075b12513afe56ca2ed838613b7395f57839');
  },
  get instantProxyRegistry() {
    return load(proxyRegistry, '0x4678f0a6958e4d2bc4f1baf7bc52e8f3564f3fe4');
  },
  get instantProxyFactory() {
    return load(dsProxyFactory, '0xa26e15c895efc0616177b7c1e7270a4c7d51c997');
  },
  get instantProxyCreationAndExecute() {
    return load(proxyCreationAndExecute, '0x793ebbe21607e4f04788f89c7a9b97320773ec59');
  },
  get marginProxyRegistry() {
    return load(proxyRegistry, '');
  },
  get proxyActions() {
    return load(proxyActions, '');
  },
  oasisDataService: {
    url: 'https://cache.eth2dai.com/api/v1'
  },
  etherscan: {
    url: 'https://etherscan.io',
    apiUrl: 'http://api.etherscan.io/api',
    apiKey: '34JVYM6RPM3J1SK8QXQFRNSHD9XG4UHXVU',
  },
  taxProxyRegistries: ['0xaa63c8683647ef91b3fdab4b4989ee9588da297b']
};

export type NetworkConfig = typeof protoMain;

const main: NetworkConfig = protoMain;

const kovan: NetworkConfig = {
  id: '42',
  name: 'kovan',
  label: 'Kovan',
  thresholds: {
    ethdai: 0.025,
    mkrdai: 0.015,
    mkreth: 0.015
  },
  safeConfirmations: 0,
  avgBlocksPerDay: 21600 * 0.55,
  startingBlock: 5216718,
  get otc() { return load(otc, '0x4a6bc4e803c62081ffebcc8d227b5a87a58f1f8f'); },
  // get saiTub() { return load(saiTub, '0xa71937147b55deb8a530c7229c442fd3f31b7db2'); },
  get ethPip() { return load(dsValue, '0x3546C7E3753C0e1D15878EC1C6dC65573864Dab7'); },
  get tokens() {
    return asMap('token', [
      loadToken('WETH', eth, '0xd0a1e359811322d97991e03f863a0c30c2cf029c'),
      loadToken('DAI', erc20, '0xc4375b7de8af5a38a93548eb8453a498222c4ff2'),
      loadToken('MKR', erc20, '0xaaf64bfcc32d0f15873a02163e7e500671a4ffcd'),
      loadToken('DGD', erc20, '0x62aeec5fb140bb233b1c5612a8747ca1dc56dc1b'),
      loadToken('REP', erc20, '0xc7aa227823789e363f29679f23f7e8f6d9904a9b'),
      loadToken('OMG', erc20, '0x441b1a74c69ee6e631834b626b29801d42076d38'),
      loadToken('ZRX', erc20, '0x18392097549390502069c17700d21403ea3c721a'),
      loadToken('BAT', erc20, '0x9f8cfb61d3b2af62864408dd703f9c3beb55dff7'),
    ]);
  },
  joins: {} as { [key: string]: string },
  mcd: {} as { [key: string]: any },
  prices: {} as { [key: string]: string },
  spot: '',
  jug: '',
  cdpManager: '',
  ilks: {} as { [key: string]: string },
  get otcSupportMethods() {
    return load(otcSupport, '0x303f2bf24d98325479932881657f45567b3e47a8');
  },
  get instantProxyRegistry() {
    return load(proxyRegistry, '0x64a436ae831c1672ae81f674cab8b6775df3475c');
  },
  get instantProxyFactory() {
    return load(dsProxyFactory, '0xe11e3b391f7e8bc47247866af32af67dd58dc800');
  },
  get instantProxyCreationAndExecute() {
    return load(proxyCreationAndExecute, '0xee419971e63734fed782cfe49110b1544ae8a773');
  },
  get marginProxyRegistry() {
    return load(proxyRegistry, '');
  },
  get proxyActions() {
    return load(proxyActions, '');
  },
  oasisDataService: {
    url: 'https://staging-cache.eth2dai.com/api/v1'
  },
  etherscan: {
    url: 'https://kovan.etherscan.io',
    apiUrl: 'http://api-kovan.etherscan.io/api',
    apiKey: '34JVYM6RPM3J1SK8QXQFRNSHD9XG4UHXVU',
  },
  taxProxyRegistries: ['0x64a436ae831c1672ae81f674cab8b6775df3475c']
};

const localnet: NetworkConfig =   {
  id: '420',
  name: 'localnet',
  label: 'Localnet',
  thresholds: {
    ethdai: 0.05,
    mkrdai: 0.05,
    mkreth: 0.05
  },
  safeConfirmations: 0,
  avgBlocksPerDay: 1000,
  startingBlock: 1,
  get otc() { return load(otc, '0x4e5F802405B29fFae4AE2a7dA1d9cEEB53904D55'); },
  // get saiTub() { return load(saiTub, '0x3546C7E3753C0e1D15878EC1C6dC65573864Dab7'); },
  get ethPip() { return load(dsValue, '0x1B2c0f9b05f2ec9f77DeA9CdaEB04c396da5027B'); },
  get tokens() {
    return asMap('token', [
      loadToken('WETH', eth, '0x28085CEfA9103d3a55Fb5AfCcf07eD2038d31cD4'),
      loadToken('DAI', erc20, '0xff500C51399A282f4563F2713fFCBe9e53cfb6Fa'),
      // loadToken('MKR', erc20, '0xe80C262f63df9376d2ce9eDd373832EDc9FCA46E'),
      // loadToken('DGD', erc20, '0xe80C262f63df9376d2ce9eDd373832EDc9FCA46E'),
      // loadToken('REP', erc20, '0xe80C262f63df9376d2ce9eDd373832EDc9FCA46E'),
      // loadToken('OMG', erc20, '0xe80C262f63df9376d2ce9eDd373832EDc9FCA46E'),
      // loadToken('ZRX', erc20, '0xe80C262f63df9376d2ce9eDd373832EDc9FCA46E'),
      // loadToken('BAT', erc20, '0xe80C262f63df9376d2ce9eDd373832EDc9FCA46E'),
    ]);
  },
  joins: {
    WETH: '0xfEE6cFC4Dee7702733430cE539a704233D7501B5',
    DAI: '0x587635C60eC92BA1AE5db1e1DD7839FED9d23700',
  } as { [key: string]: string },
  mcd: {
    vat: '0x174805bDBE92fBb6eC91D602BE4DDaF7F7E51EA6',
    get cat() {
      return load(mcdCat, '0xcF24768107824459Be154a9FBb9639785e0Ae462');
    },
    flip: {
      get WETH() {
        return load(mcdFlipper, '0x30E57a1F60186444e4244828b42BBDC43F63C12B');
      },
    }
  } as { [key: string]: any },
  prices: {
    WETH: '0x1B2c0f9b05f2ec9f77DeA9CdaEB04c396da5027B',
  } as { [key: string]: string },
  spot: '0xAb14DdBdD66Bd9143c3E3d94E4Ce27Babc2b66eB',
  jug: '0x3A6Ea44c1386F6745Fa20d7cAD939a22553579B0',
  cdpManager: '0xC71022a713dA95bD4C926faf180FffBAfEf4bcA6',
  ilks: {
    WETH: web3.fromAscii('ETH'),
    // DGX: web3.fromAscii('DGX'),
  } as { [key: string]: string },
  get otcSupportMethods() {
    return load(otcSupport, '0x5de139DbBFd47dd1D2cD906348Fd1887135B2804');
  },
  get instantProxyRegistry() {
    return load(proxyRegistry, '0x22b6C41D0b18193B20B182D8d5854fEFb744cC6A');
  },
  get instantProxyFactory() {
    return load(dsProxyFactory, '0x9c27f7553f12e0178c1D767265dFBD27CAEcec68');
  },
  get instantProxyCreationAndExecute() {
    return load(proxyCreationAndExecute, '0x947308140e877E8EeBcCED93B522407A24278c6A');
  },
  get marginProxyRegistry() {
    return load(proxyRegistry, '0x3A32AA343fBA264411EF47B00B195165738E4E6b');
  },
  get proxyActions() {
    return load(proxyActions, '0xb92c5af7231f9d448AC99A688BA290C580c707bA');
  },
  oasisDataService: {
    url: 'http://localhost:3001/v1'
  },
  etherscan: {
    url: 'https://kovan.etherscan.io',
    apiUrl: 'http://api-kovan.etherscan.io/api',
    apiKey: '34JVYM6RPM3J1SK8QXQFRNSHD9XG4UHXVU',
  },
  taxProxyRegistries: []
};

export const networks = asMap('id', [main, kovan, localnet]);
