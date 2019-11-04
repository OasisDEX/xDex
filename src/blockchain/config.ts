import { fromPairs, memoize, zip } from 'lodash';

import { TradingPair } from '../exchange/tradingPair/tradingPair';
import batCircleSvg from '../icons/coins/bat-circle.svg';
import batColorSvg from '../icons/coins/bat-color.svg';
import batSvg from '../icons/coins/bat.svg';
import daiCircleSvg from '../icons/coins/dai-circle.svg';
import daiColorSvg from '../icons/coins/dai-color.svg';
// import daiInverseSvg from '../icons/coins/dai-inverse.svg';
import daiSvg from '../icons/coins/dai.svg';
import dgdCircleSvg from '../icons/coins/dgd-circle.svg';
import dgdColorSvg from '../icons/coins/dgd-color.svg';
import dgdSvg from '../icons/coins/dgd.svg';
import ethCircleSvg from '../icons/coins/eth-circle.svg';
// import ethColorInverseSvg from '../icons/coins/eth-color-inverse.svg';
import ethColorSvg from '../icons/coins/eth-color.svg';
// import ethInverseSvg from '../icons/coins/eth-inverse.svg';
import ethSvg from '../icons/coins/eth.svg';
// import mkrInverseSvg from '../icons/coins/mkr-inverse.svg';
// import mkrSvg from '../icons/coins/mkr.svg';
import repCircleSvg from '../icons/coins/rep-circle.svg';
import repColorSvg from '../icons/coins/rep-color.svg';
import repSvg from '../icons/coins/rep.svg';
// import usdcCircleSvg from '../icons/coins/usdc-circle.svg';
// import usdcColorSvg from '../icons/coins/usdc-color.svg';
// import usdcSvg from '../icons/coins/usdc.svg';
// import wbtcCircleSvg from '../icons/coins/wbtc-circle.svg';
// import wbtcColorSvg from '../icons/coins/wbtc-color.svg';
// import wbtcSvg from '../icons/coins/wbtc.svg';
import zrxCircleSvg from '../icons/coins/zrx-circle.svg';
import zrxColorSvg from '../icons/coins/zrx-color.svg';
import zrxSvg from '../icons/coins/zrx.svg';

import { SvgImageSimple } from '../utils/icons/utils';
import * as eth from './abi/ds-eth-token.abi.json';
import * as dsProxyFactory from './abi/ds-proxy-factory.abi.json';
import * as dsValue from './abi/ds-value.abi.json';
import * as erc20 from './abi/erc20.abi.json';
import * as liquidityProvider from './abi/liquidity-provider.abi.json';
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
  ...process.env.REACT_APP_OASIS_DEX_ENABLED !== '1' ? [] : [
    // { base: 'MKR', quote: 'DAI' },
    // { base: 'MKR', quote: 'WETH' },
    { base: 'DGD', quote: 'DAI' },
    { base: 'REP', quote: 'DAI' },
    { base: 'ZRX', quote: 'DAI' },
    { base: 'BAT', quote: 'DAI' }
  ]
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
    iconColor: SvgImageSimple(ethCircleSvg),
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
  ...process.env.REACT_APP_OASIS_DEX_ENABLED !== '1' ? [] : [
    // {
    //   symbol: 'MKR',
    //   precision: 18,
    //   digits: 5,
    //   digitsInstant: 3,
    //   maxSell: '10000000',
    //   name: 'Maker',
    //   icon: SvgImageSimple(mkrSvg),
    //   iconCircle: SvgImageSimple(mkrInverseSvg),
    //   iconColor: SvgImageSimple(mkrInverseSvg),
    // },
    // {
    //   symbol: 'DGX',
    //   precision: 18,
    //   digits: 5,
    //   digitsInstant: 3,
    //   safeCollRatio: 1.5,
    //   maxSell: '1000000000000000',
    //   name: 'Digix',
    //   icon: SvgImageSimple(dgdSvg),
    //   // iconInverse: SvgImageSimple(mkrInverseSvg),
    //   iconCircle: SvgImageSimple(dgdCircleSvg),
    //   iconColor: SvgImageSimple(dgdColorSvg),
    // },
    {
      symbol: 'DGD',
      precision: 9,
      digits: 5,
      digitsInstant: 3,
      safeCollRatio: 1.5,
      maxSell: '1000000000000000',
      name: 'DigixDAO',
      icon: SvgImageSimple(dgdSvg),
    // iconInverse: SvgImageSimple(dgdInverseSvg),
      iconCircle: SvgImageSimple(dgdCircleSvg),
      iconColor: SvgImageSimple(dgdColorSvg),
      assetKind: AssetKind.marginable,
    },
    {
      symbol: 'REP',
      precision: 18,
      digits: 5,
      digitsInstant: 3,
      safeCollRatio: 1.5,
      maxSell: '1000000000000000',
      name: 'Augur',
      icon: SvgImageSimple(repSvg),
    // iconInverse: SvgImageSimple(repInverseSvg),
      iconCircle: SvgImageSimple(repCircleSvg),
      iconColor: SvgImageSimple(repColorSvg),
      assetKind: AssetKind.marginable,
    },
    {
      symbol: 'ZRX',
      precision: 18,
      digits: 5,
      digitsInstant: 3,
      safeCollRatio: 1.5,
      maxSell: '1000000000000000',
      name: '0x',
      icon: SvgImageSimple(zrxSvg),
    // iconInverse: SvgImageSimple(mkrInverseSvg),
      iconCircle: SvgImageSimple(zrxCircleSvg),
      iconColor: SvgImageSimple(zrxColorSvg),
      assetKind: AssetKind.marginable,
    },
    {
      symbol: 'BAT',
      precision: 18,
      digits: 5,
      digitsInstant: 3,
      safeCollRatio: 1.5,
      maxSell: '1000000000000000',
      name: 'Basic Attention Token',
      icon: SvgImageSimple(batSvg),
    // iconInverse: SvgImageSimple(batInverseSvg),
      iconCircle: SvgImageSimple(batCircleSvg),
      iconColor: SvgImageSimple(batColorSvg),
      assetKind: AssetKind.marginable,
    },
  // {
  //   symbol: 'USDC',
  //   precision: 6,
  //   digits: 5,
  //   digitsInstant: 2,
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
  //   digitsInstant: 3,
  //   safeCollRatio: 1.5,
  //   maxSell: '1000000000000000',
  //   name: 'Wrapped Bitcoin',
  //   icon: SvgImageSimple(wbtcSvg),
  //   // iconInverse: SvgImageSimple(wbtcInverseSvg),
  //   iconCircle: SvgImageSimple(wbtcCircleSvg),
  //   iconColor: SvgImageSimple(wbtcColorSvg),
  //   assetKind: AssetKind.marginable,
  //   // address: 0x2260fac5e5542a773aa44fbcfedf7c193bc2c599
  // }]
  ]
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
    dgddai: 0.02,
    repdai: 0.02,
    zrxdai: 0.02,
    batdai: 0.02,
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
      loadToken('ZRX', erc20, '0xe41d2489571d322189246dafa5ebde1f4699f498'),
      loadToken('BAT', erc20, '0x0d8775f648430679a709e98d2b0cb6250d2887ef'),
    ]);
  },
  joins: {} as { [key: string]: string },
  mcd: {} as { [key: string]: any },
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
    return load(proxyRegistry, '0x4678f0a6958e4d2bc4f1baf7bc52e8f3564f3fe4');
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
  taxProxyRegistries: ['0xaa63c8683647ef91b3fdab4b4989ee9588da297b'],
  get liquidityProvider() {
    return load(liquidityProvider, '');
  },
};

export type NetworkConfig = typeof protoMain;

const main: NetworkConfig = protoMain;

const kovan: NetworkConfig = {
  id: '42',
  name: 'kovan',
  label: 'Kovan',
  thresholds: {
    ethdai: 0.025,
    dgddai: 0.025,
    repdai: 0.025,
    zrxdai: 0.025,
    batdai: 0.025,
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
      // loadToken('DAI', erc20, '0xc4375b7de8af5a38a93548eb8453a498222c4ff2'), // NOT MCD_DAI
      loadToken('DAI', erc20, '0x1f9beaf12d8db1e50ea8a5ed53fb970462386aa0'), // MCD_DAI
      // loadToken('MKR', erc20, '0xaaf64bfcc32d0f15873a02163e7e500671a4ffcd'),
      loadToken('DGD', erc20, '0x62aeec5fb140bb233b1c5612a8747ca1dc56dc1b'),
      loadToken('REP', erc20, '0xc7aa227823789e363f29679f23f7e8f6d9904a9b'),
      loadToken('ZRX', erc20, '0x18392097549390502069c17700d21403ea3c721a'),
      loadToken('BAT', erc20, '0x9f8cfb61d3b2af62864408dd703f9c3beb55dff7'),
    ]);
  },
  joins: {
    WETH: '0xc3abba566bb62c09b7f94704d8dfd9800935d3f9',
    DAI: '0x61af28390d0b3e806bbaf09104317cb5d26e215d',
    REP: '0xebbd300bb527f1d50abd937f8ca11d7fd0e5b68b',
    ZRX: '0x79f15b0da982a99b7bcf602c8f384c56f0b0e8cd',
    BAT: '0xf8e9b4c3e17c1a2d55767d44fb91feed798bb7e8',
    DGD: '0x92a3b1c0882e6e17aa41c5116e01b0b9cf117cf2',
  } as { [key: string]: string },
  mcd: {
    vat: '0x6e6073260e1a77dfaf57d0b92c44265122da8028',
    get cat() {
      return load(mcdCat, '0xdd9eff17f24f42adef1b240fc5dafba2aa6dcefd');
    },
    flip: {
      get WETH() {
        return load(mcdFlipper, '0x494d6664a6b305f1f6dbded879f01e5dc1ea8b55');
      },
      get REP() {
        return load(mcdFlipper, '0x096f6bb4ad63d9c2787bb2be77a5a7ea74a35826');
      },
      get ZRX() {
        return load(mcdFlipper, '0x2f5979b27cdc809a85300e1902827c2bd2dcc155');
      },
      get BAT() {
        return load(mcdFlipper, '0x6c5812f6db86aebdc54a0fcbf3bfd29884feb2f9');
      },
      get DGD() {
        return load(mcdFlipper, '0x6ee776b367191fad854df97ef267462053af283d');
      },
    }
  } as { [key: string]: any },
  spot: '0xf5cdfce5a0b85ff06654ef35f4448e74c523c5ac',
  jug: '0x3793181ebbc1a72cc08ba90087d21c7862783fa5',
  cdpManager: '0x81f0cb2030d173502a371dda849acd3966983817', // fill
  ilks: {
    WETH: 'ETH-A',
    REP: 'REP-A',
    ZRX: 'ZRX-A',
    BAT: 'BAT-A',
    DGD: 'DGD-A',
  } as { [key: string]: string },
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
    return load(proxyRegistry, '0x64a436ae831c1672ae81f674cab8b6775df3475c');
  },
  get proxyActions() {
    return load(proxyActions, '0xd2263bd09f46632ccd43a99ba911f8067bed9b19');
  },
  oasisDataService: {
    url: 'https://kovan-cache.eth2dai.com/api/v1'
  },
  etherscan: {
    url: 'https://kovan.etherscan.io',
    apiUrl: 'http://api-kovan.etherscan.io/api',
    apiKey: '34JVYM6RPM3J1SK8QXQFRNSHD9XG4UHXVU',
  },
  taxProxyRegistries: ['0x64a436ae831c1672ae81f674cab8b6775df3475c'],
  get liquidityProvider() {
    return load(liquidityProvider, '0x7fb88dae8aaa2904bce126694ed50942e14bb22e');
  },
};

const localnet: NetworkConfig =   {
  id: '420',
  name: 'localnet',
  label: 'Localnet',
  thresholds: {
    ethdai: 0.025,
    dgddai: 0.025,
    repdai: 0.025,
    zrxdai: 0.025,
    batdai: 0.025,
  },
  safeConfirmations: 0,
  avgBlocksPerDay: 1000,
  startingBlock: 1,
  get otc() { return load(otc, '0x177b74CB6679C145Bb428Cc3E16F4a3d3ED905a3'); },
  // get saiTub() { return load(saiTub, '0x3546C7E3753C0e1D15878EC1C6dC65573864Dab7'); },
  get ethPip() { return load(dsValue, '0x8b8B359c33c13b818713570583C8bce2b030AD9A'); },
  get tokens() {
    return asMap('token', [
      loadToken('WETH', eth, '0x200938Bf7fF25EcF2eB7BC08e18b0892ED34c846'),
      loadToken('DAI', erc20, '0xafAA69DE13bd8766D9d47c9205439B9B06e533C6'),
      loadToken('DGD', erc20, '0x76c37E57A1438E2a0ac7Fec8a552CDD569b2CAfB'),
      loadToken('REP', erc20, '0xE8d4C2Ab5782c697f06f17610cC03068180d0FaC'),
      loadToken('ZRX', erc20, '0x2c60CF08c07C212e21e6E2ee4626c478BACe092a'),
      loadToken('BAT', erc20, '0xd80110E3C107Eb206B556871cFe2532eC7D05E47'),
    ]);
  },
  joins: {
    WETH: '0x2B6D0E2703bCA807bF4f4ab6B542F665d2af3F9C',
    DAI: '0x5DFA1cCcE9A29efB2d49AB82f10cB5F1bF8e5013',
  } as { [key: string]: string },
  mcd: {
    vat: '0xBD96b03c371380FB916a6789BDa6AFf170E65c5f',
    get cat() {
      return load(mcdCat, '0x4a81317A82Fc95f5180B827Ed3EBAe838Ad6BD1B');
    },
    flip: {
      get WETH() {
        return load(mcdFlipper, '0x76fdFbdBaF5Ef599FBD6565e998D20A0C838d950');
      },
    }
  } as { [key: string]: any },
  spot: '0x42B7E35e4A2DE972F5Cf17417ED49aff869D7a40',
  jug: '0x5D8A44E8BE914e6C3bCADb46581502592Ac41a94',
  cdpManager: '0xAFe25DF80A6Ce0890d1742767Fd6424bF845F39d',
  ilks: {
    WETH: 'ETH',
    DAI: 'DAI',
    DGD: 'DGD',
    REP: 'REP',
    ZRX: 'ZRX',
    BAT: 'BAT',
  } as { [key: string]: string },
  get otcSupportMethods() {
    return load(otcSupport, '0xee9F9B08E2eBc68e88c0e207A09EbaaeF4e5d94E');
  },
  get instantProxyRegistry() {
    return load(proxyRegistry, '0x4C59F867abb03235372438Ff8F3685fcc7b3F1d6');
  },
  get instantProxyFactory() {
    return load(dsProxyFactory, '0xF52071224Fe0Ecd1E9776815CCc151fa4B79a16c');
  },
  get instantProxyCreationAndExecute() {
    return load(proxyCreationAndExecute, '0x39E338aDC718b67585AC4bE1A69Db0EE6C186487');
  },
  get marginProxyRegistry() {
    return load(proxyRegistry, '0x4C59F867abb03235372438Ff8F3685fcc7b3F1d6');
  },
  get proxyActions() {
    return load(proxyActions, '0xb39C3560062a2BA5CEFee7c7CDCd0f0e8fa8e17e');
  },
  oasisDataService: {
    url: 'http://localhost:3001/v1'
  },
  etherscan: {
    url: 'https://kovan.etherscan.io',
    apiUrl: 'http://api-kovan.etherscan.io/api',
    apiKey: '34JVYM6RPM3J1SK8QXQFRNSHD9XG4UHXVU',
  },
  taxProxyRegistries: [],
  get liquidityProvider() {
    return load(liquidityProvider, '0x64442CACa1f24014e734c057c38e455b106278E0');
  },
};

export const networks = asMap('id', [main, kovan, localnet]);
