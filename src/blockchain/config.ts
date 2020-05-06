/*
 * Copyright (C) 2020 Maker Ecosystem Growth Holdings, INC.
 */

import { fromPairs, memoize, zip } from 'lodash';

import { TradingPair } from '../exchange/tradingPair/tradingPair';
import batCircleSvg from '../icons/coins/bat-circle.svg';
import batColorSvg from '../icons/coins/bat-color.svg';
import batSvg from '../icons/coins/bat.svg';
import daiCircleSvg from '../icons/coins/dai-circle.svg';
import daiColorSvg from '../icons/coins/dai-color.svg';
import daiSvg from '../icons/coins/dai.svg';
import ethCircleSvg from '../icons/coins/eth-circle.svg';
import ethColorSvg from '../icons/coins/eth-color.svg';
import ethSvg from '../icons/coins/eth.svg';
import linkCircleSvg from '../icons/coins/link-circle.svg';
import linkColorSvg from '../icons/coins/link-color.svg';
import linkSvg from '../icons/coins/link.svg';
import paxCircleSvg from '../icons/coins/pax-circle.svg';
import paxColorSvg from '../icons/coins/pax-color.svg';
import paxSvg from '../icons/coins/pax.svg';
import repCircleSvg from '../icons/coins/rep-circle.svg';
import repColorSvg from '../icons/coins/rep-color.svg';
import repSvg from '../icons/coins/rep.svg';
import saiCircleSvg from '../icons/coins/sai-circle.svg';
import saiColorSvg from '../icons/coins/sai-color.svg';
import saiSvg from '../icons/coins/sai.svg';
import tusdCircleSvg from '../icons/coins/tusd-circle.svg';
import tusdColorSvg from '../icons/coins/tusd-color.svg';
import tusdSvg from '../icons/coins/tusd.svg';
import usdcCircleSvg from '../icons/coins/usdc-circle.svg';
import usdcColorSvg from '../icons/coins/usdc-color.svg';
import usdcSvg from '../icons/coins/usdc.svg';
import wbtcCircleSvg from '../icons/coins/wbtc-circle.svg';
import wbtcColorSvg from '../icons/coins/wbtc-color.svg';
import wbtcSvg from '../icons/coins/wbtc.svg';
import zrxCircleSvg from '../icons/coins/zrx-circle.svg';
import zrxColorSvg from '../icons/coins/zrx-color.svg';
import zrxSvg from '../icons/coins/zrx.svg';

import { SvgImageSimple } from '../utils/icons/utils';
import * as eth from './abi/ds-eth-token.abi.json';
import * as dsProxyFactory from './abi/ds-proxy-factory.abi.json';
import * as dsValue from './abi/ds-value.abi.json';
import * as erc20 from './abi/erc20.abi.json';
import * as instantMigrationProxyActions from './abi/instant-migration-proxy-actions.abi.json';
import * as liquidityProvider from './abi/liquidity-provider.abi.json';
import * as otc from './abi/matching-market.abi.json';
import * as mcdCat from './abi/mcd-cat.abi.json';
import * as mcdFlipper from './abi/mcd-flipper.abi.json';
import * as mcdJug from './abi/mcd-jug.abi.json';
import * as mcdOsm from './abi/mcd-osm.abi.json';
import * as mcdSpotter from './abi/mcd-spotter.abi.json';
import * as otcSupport from './abi/otc-support-methods.abi.json';
import * as proxyActions from './abi/proxy-actions.abi.json';
import * as proxyCreationAndExecute from './abi/proxy-creation-and-execute.abi.json';
import * as proxyRegistry from './abi/proxy-registry.abi.json';
import * as tokenRecovery from './abi/token-recovery.abi.json';
import * as txManager from './abi/tx-manager.abi.json';
import { nullAddress } from './utils';
import { web3 } from './web3';

const hasNewMarketsAvailable = process.env.REACT_APP_NEW_MARKETS_ENABLED === '1';

export const tradingPairs: TradingPair[] = [
  { base: 'WETH', quote: 'DAI' },
  { base: 'REP', quote: 'DAI' },
  { base: 'ZRX', quote: 'DAI' },
  { base: 'BAT', quote: 'DAI' },
  ...(hasNewMarketsAvailable
    ? [
        { base: 'LINK', quote: 'DAI' },
        { base: 'WBTC', quote: 'DAI' },
      ]
    : []),
  { base: 'DAI', quote: 'USDC' },
  ...(hasNewMarketsAvailable
    ? [
        { base: 'DAI', quote: 'TUSD' },
        { base: 'DAI', quote: 'PAX' },
      ]
    : []),
  { base: 'REP', quote: 'WETH' },
  { base: 'ZRX', quote: 'WETH' },
  { base: 'BAT', quote: 'WETH' },
  ...(hasNewMarketsAvailable
    ? [
        { base: 'LINK', quote: 'WETH' },
        { base: 'WBTC', quote: 'WETH' },
      ]
    : []),
];

function asMap<D>(key: string, data: D[]): { [key: string]: D } {
  return fromPairs(
    zip(
      data.map((row: D) => (row as any)[key]),
      data,
    ),
  );
}

export enum AssetKind {
  unknown = 'unknown',
  cash = 'cash',
  marginable = 'marginable',
  nonMarginable = 'nonMarginable',
}

// ticker comes from coinpaprika api https://api.coinpaprika.com/v1/tickers
const tokens = asMap('symbol', [
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
    ticker: 'eth-ethereum',
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
    ticker: 'eth-ethereum',
    assetKind: AssetKind.marginable,
  },
  {
    symbol: 'SAI',
    precision: 18,
    digits: 4,
    digitsInstant: 2,
    maxSell: '10000000',
    name: 'Sai',
    icon: SvgImageSimple(saiSvg),
    // iconInverse: SvgImageSimple(daiInverseSvg),
    iconCircle: SvgImageSimple(saiCircleSvg),
    iconColor: SvgImageSimple(saiColorSvg),
    ticker: 'dai-dai',
  },
  {
    symbol: 'DAI',
    precision: 18,
    digits: 4,
    digitsInstant: 2,
    safeCollRatio: undefined,
    maxSell: '10000000',
    name: 'Dai',
    icon: SvgImageSimple(daiSvg),
    // iconInverse: SvgImageSimple(daiInverseSvg),
    iconCircle: SvgImageSimple(daiCircleSvg),
    iconColor: SvgImageSimple(daiColorSvg),
    ticker: 'dai-dai',
  },
  ...(process.env.REACT_APP_OASIS_DEX_ENABLED !== '1'
    ? []
    : [
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
          ticker: 'rep-augur',
          assetKind: AssetKind.nonMarginable,
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
          ticker: 'zrx-0x',
          assetKind: AssetKind.nonMarginable,
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
          ticker: 'bat-basic-attention-token',
          assetKind: AssetKind.nonMarginable,
        },
        {
          symbol: 'USDC',
          precision: 6,
          digits: 6,
          digitsInstant: 2,
          safeCollRatio: 1.5,
          maxSell: '1000000000000000',
          name: 'USD Coin',
          icon: SvgImageSimple(usdcSvg),
          // iconInverse: SvgImageSimple(usdcInverseSvg),
          iconCircle: SvgImageSimple(usdcCircleSvg),
          iconColor: SvgImageSimple(usdcColorSvg),
          ticker: 'usdc-usd-coin',
          assetKind: AssetKind.unknown,
          // address: 0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48
        },
        {
          symbol: 'TUSD',
          precision: 18,
          digits: 5,
          digitsInstant: 3,
          safeCollRatio: 1.5,
          maxSell: '1000000000000000',
          name: 'True USD',
          icon: SvgImageSimple(tusdSvg),
          iconCircle: SvgImageSimple(tusdCircleSvg),
          iconColor: SvgImageSimple(tusdColorSvg),
          ticker: 'tusd-trueusd',
        },
        {
          symbol: 'PAX',
          precision: 18,
          digits: 5,
          digitsInstant: 3,
          safeCollRatio: 1.5,
          maxSell: '1000000000000000',
          name: 'Paxos Standard',
          icon: SvgImageSimple(paxSvg),
          iconCircle: SvgImageSimple(paxCircleSvg),
          iconColor: SvgImageSimple(paxColorSvg),
          ticker: 'pax-paxos-standard-token',
        },
        {
          symbol: 'LINK',
          precision: 18,
          digits: 5,
          digitsInstant: 3,
          safeCollRatio: 1.5,
          maxSell: '1000000000000000',
          name: 'Chainlink',
          icon: SvgImageSimple(linkSvg),
          iconCircle: SvgImageSimple(linkCircleSvg),
          iconColor: SvgImageSimple(linkColorSvg),
          ticker: 'link-chainlink',
        },
        {
          symbol: 'WBTC',
          precision: 8,
          digits: 5,
          digitsInstant: 3,
          safeCollRatio: 1.5,
          maxSell: '1000000000000000',
          name: 'Wrapped Bitcoin',
          icon: SvgImageSimple(wbtcSvg),
          iconCircle: SvgImageSimple(wbtcCircleSvg),
          iconColor: SvgImageSimple(wbtcColorSvg),
          ticker: 'wbtc-wrapped-bitcoin',
        },
      ]),
]);

export function isDAIEnabled() {
  return tradingTokens.indexOf('DAI') >= 0;
}

export function isSAIEnabled() {
  return tradingTokens.indexOf('SAI') >= 0;
}

export function getToken(token: string) {
  return tokens[token];
}

export const tradingTokens = Array.from(
  tradingPairs.reduce(
    (tkns: Set<string>, { base, quote }) => {
      tkns.add(base);
      tkns.add(quote);
      return tkns;
    },
    new Set<string>(['ETH']),
  ),
);

tradingTokens.sort((t1, t2) => Object.keys(tokens).indexOf(t1) - Object.keys(tokens).indexOf(t2));

const load = memoize(
  (abi: any, address: string) => {
    return {
      address,
      contract: new web3.eth.Contract(abi, address),
    };
  },
  (_abi: any, address: string) => address,
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
    mkreth: 0.01,
    repdai: 0.02,
    zrxdai: 0.02,
    batdai: 0.02,
    daiusdc: 0.05,
  },
  safeConfirmations: 0,
  avgBlocksPerDay: 5760 * 1.05,
  startingBlock: 4751582,
  get otc() {
    return load(otc, '0x794e6e91555438aFc3ccF1c5076A74F42133d08D');
  },
  // get saiTub() { return load(saiTub, '0x448a5065aebb8e423f0896e6c5d525c040f59af3'); },
  get tokens() {
    return asMap('token', [
      loadToken('WETH', eth, '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2'),
      loadToken('SAI', erc20, '0x89d24a6b4ccb1b6faa2625fe562bdd9a23260359'),
      loadToken('DAI', erc20, '0x6B175474E89094C44Da98b954EedeAC495271d0F'),
      loadToken('REP', erc20, '0x1985365e9f78359a9B6AD760e32412f4a445E862'),
      loadToken('ZRX', erc20, '0xe41d2489571d322189246dafa5ebde1f4699f498'),
      loadToken('BAT', erc20, '0x0d8775f648430679a709e98d2b0cb6250d2887ef'),
      loadToken('USDC', erc20, '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48'),
      loadToken('TUSD', erc20, '0x0000000000085d4780B73119b644AE5ecd22b376'),
      loadToken('PAX', erc20, '0x8e870d67f660d95d5be530380d0ec0bd388289e1'),
      loadToken('LINK', erc20, '0x514910771af9ca656af840dff83e8264ecf986ca'),
      loadToken('WBTC', erc20, '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599'),
    ]);
  },
  cdpManager: '0x60762005be465901ca18ba34416b35143de72c0c',
  mcd: {
    vat: '0x35D1b3F3D7966A1DFe207aa4514C12a259A0492B',
    get cat() {
      return load(mcdCat, '0x78F2c2AF65126834c51822F56Be0d7469D7A523E');
    },
    get jug() {
      return load(mcdJug, '0x19c0976f590D67707E62397C87829d896Dc0f1F1');
    },
    get spot() {
      return load(mcdSpotter, '0x65C79fcB50Ca1594B025960e539eD7A9a6D434A3');
    },
    dssCdpManager: '0x5ef30b9986345249bc32d8928B7ee64DE9435E39',
    ilks: {
      WETH: 'ETH-A',
    },
    joins: {
      WETH: '0x2F0b23f53734252Bda2277357e97e1517d6B042A',
      DAI: '0x9759A6Ac90977b93B58547b4A71c78317f391A28',
    },
    flip: {
      get WETH() {
        return load(mcdFlipper, '0xd8a04F5412223F513DC55F839574430f5EC15531');
      },
    },
    prices: {
      get WETH() {
        return load(dsValue, '');
      },
    },
    osms: {
      get WETH() {
        return load(mcdOsm, '0x81FE72B5A8d1A857d176C3E7d5Bd2679A9B85763');
      },
    },
  } as { [key: string]: any },
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
  get proxyActions() {
    return load(proxyActions, '0x4fb2f29608b05dfc935c20c076f0b1a022407e3e');
  },
  get migration() {
    return '0xc73e0383F3Aff3215E6f04B0331D58CeCf0Ab849';
  },
  get migrationProxyActions() {
    return '0xe4B22D484958E582098A98229A24e8A43801b674';
  },
  get instantMigrationProxyActions() {
    return load(instantMigrationProxyActions, '0x396Ea3C3376cC78864f51ce2FDdb275D3dC0968b');
  },
  get tokenRecovery() {
    return load(tokenRecovery, '0xc06a269e3370f582df2dbb6cf0271c267badf99d');
  },
  oasisDataService: {
    url: 'https://cache.eth2dai.com/api/v1',
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
  get txManager() {
    console.error('TxManager not deployed on mainnnet');
    return load(txManager, nullAddress);
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
    mkrdai: 0.015,
    mkreth: 0.015,
    repdai: 0.025,
    zrxdai: 0.025,
    batdai: 0.025,
    daiusdc: 0.05,
  },
  safeConfirmations: 0,
  avgBlocksPerDay: 21600 * 0.55,
  startingBlock: 5216718,
  get otc() {
    return load(otc, '0xe325acB9765b02b8b418199bf9650972299235F4');
  },
  // get saiTub() { return load(saiTub, '0xa71937147b55deb8a530c7229c442fd3f31b7db2'); },
  get tokens() {
    return asMap('token', [
      loadToken('WETH', eth, '0xd0a1e359811322d97991e03f863a0c30c2cf029c'),
      loadToken('SAI', erc20, '0xc4375b7de8af5a38a93548eb8453a498222c4ff2'),
      loadToken('DAI', erc20, '0x08ae34860fbfe73e223596e65663683973c72dd3'),
      loadToken('REP', erc20, '0xc7aa227823789e363f29679f23f7e8f6d9904a9b'),
      loadToken('ZRX', erc20, '0x18392097549390502069c17700d21403ea3c721a'),
      loadToken('BAT', erc20, '0x9f8cfb61d3b2af62864408dd703f9c3beb55dff7'),
      loadToken('USDC', erc20, '0x198419c5c340e8De47ce4C0E4711A03664d42CB2'),
      loadToken('TUSD', erc20, '0x18C06d61007Cbeb072F84C28aB7698F2bfd145B5'),
      loadToken('PAX', erc20, '0x7ac82C960d70A9f62a645eb57f446985Bf23e224'),
      loadToken('LINK', erc20, '0x046acb204091d5296461c66cfd911114de5c6a4c'),
      loadToken('WBTC', erc20, '0xA08d982C2deBa0DbE433a9C6177a219E96CeE656'),
    ]);
  },
  mcd: {
    vat: '0x8a08a09dbe85018cb1a36c344a629b43f983b66c',
    get cat() {
      return load(mcdCat, '0xa9fa5837eea55f3038a2ca755ce4b5dfac599c37');
    },
    get jug() {
      return load(mcdJug, '0x01e87d5fdcb506c0b8062502d551e04474354f0d');
    },
    get spot() {
      return load(mcdSpotter, '0x65b2cd8c3d90fb1dd94965073bf5798d94489e04');
    },
    dssCdpManager: '0x7a35ea756a9f1fc5d8a1c8013ade80e036c5f8bb',
    ilks: {
      WETH: 'ETH-A',
      // REP: 'REP-A',
      // ZRX: 'ZRX-A',
      // BAT: 'BAT-A',
      // DGD: 'DGD-A',
    },
    joins: {
      WETH: '0x5028243160c4e650bde9646d22395a60fdcb6e67',
      DAI: '0x259494bdd124b75d622755c181b457ae0283257d',
      // REP: '0x0',
      // ZRX: '0x0',
      // BAT: '0x0',
      // DGD: '0x0',
    },
    flip: {
      get WETH() {
        return load(mcdFlipper, '0x2024c9c3772543081352d72bda936240afa43bd5');
      },
      // get REP() {
      //   return load(mcdFlipper, '0x0');
      // },
      // get ZRX() {
      //   return load(mcdFlipper, '0x0');
      // },
      // get BAT() {
      //   return load(mcdFlipper, '0x0');
      // },
      // get DGD() {
      //   return load(mcdFlipper, '0x0');
      // },
    },
    prices: {
      get WETH() {
        return load(dsValue, '0xd44d1823c8839559c2d663e98261e0b193c256ad');
      },
      // get BAT() {
      //   return load(dsValue, '0x5c40c9eb35c76069fa4c3a00ea59fac6ffa9c113');
      // },
    },
    osms: {
      get WETH() {
        return load(mcdOsm, '0x19342077d07a578c49421e5656c8de5c3e718f92');
      },
      // get BAT() {
      //   return load(mcdOsm, '0x0');
      // },
      // get REP() {
      //   return load(mcdOsm, '0x0');
      // },
      // get ZRX() {
      //   return load(mcdOsm, '0x0');
      // },
    },
  } as { [key: string]: any },
  cdpManager: '0x1a4a0603d8ba90571b1e95d996588b205edfb0fd', // Oasis CDP Manager
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
  get proxyActions() {
    return load(proxyActions, '0x2347ba6fa55e128d8918c6de361e8c1277453ab8');
  },
  get migration() {
    return '0x411b2faa662c8e3e5cf8f01dfdae0aee482ca7b0';
  },
  get migrationProxyActions() {
    return '0x433870076abd08865f0e038dcc4ac6450e313bd8';
  },
  get instantMigrationProxyActions() {
    return load(instantMigrationProxyActions, '0xa623ea3b3219bb59b96c4aff2d26aff0d038af62');
  },
  get tokenRecovery() {
    return load(tokenRecovery, '0x225da3848f57248148d3faa1625d0beb66902de3');
  },
  oasisDataService: {
    url: 'https://kovan-cache.eth2dai.com/api/v1',
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
  get txManager() {
    return load(txManager, '0x371015546206585d438d0cd655dbee7d86c7d4f2');
  },
};

const localnet: NetworkConfig = {
  id: '420',
  name: '   localnet',
  label: 'Localnet',
  thresholds: {
    ethdai: 0.05,
    mkrdai: 0.05,
    mkreth: 0.05,
    repdai: 0.05,
    zrxdai: 0.05,
    batdai: 0.05,
    daiusdc: 0.05,
  },
  safeConfirmations: 0,
  avgBlocksPerDay: 1000,
  startingBlock: 1,
  get otc() {
    return load(otc, '0x177b74CB6679C145Bb428Cc3E16F4a3d3ED905a3');
  },
  // get saiTub() { return { address: '', contract: null }; },
  get tokens() {
    return asMap('token', [
      loadToken('WETH', eth, '0x200938Bf7fF25EcF2eB7BC08e18b0892ED34c846'),
      loadToken('SAI', erc20, '0xF64fc1CDdAD37e61d4558B59693cD6b049cA5F60'),
      loadToken('DAI', erc20, '0xafAA69DE13bd8766D9d47c9205439B9B06e533C6'),
      // loadToken('MKR', erc20, '0x3a21aB4539e11f0C06b583796F3F0FD274eFC369'),
      // loadToken('DGD', erc20, '0x76c37E57A1438E2a0ac7Fec8a552CDD569b2CAfB'),
      loadToken('ZRX', erc20, '0x2c60CF08c07C212e21e6E2ee4626c478BACe092a'),
      loadToken('BAT', erc20, '0xd80110E3C107Eb206B556871cFe2532eC7D05E47'),
      loadToken('REP', erc20, '0xE8d4C2Ab5782c697f06f17610cC03068180d0FaC'),
      loadToken('USDC', erc20, '0x25f50Ea441836ae39b54a9DcBbd57d7048d977CF'),
      loadToken('TUSD', erc20, '0x83eF880aE7e9155Cf8Ad2CE5ba75019376C0B7F8'),
      loadToken('PAX', erc20, '0xb02048C28D9BEE6989E8D48e3972F283D3B7822c'),
      loadToken('LINK', erc20, '0x54729948EbD535aBC2492FdAAabb4153E9aC28f7'),
      loadToken('WBTC', erc20, '0x85a91f61feA8f173434424F9758a12fEA11B613c'),
    ]);
  },
  mcd: {
    vat: '0xBD96b03c371380FB916a6789BDa6AFf170E65c5f',
    get cat() {
      return load(mcdCat, '0x4a81317A82Fc95f5180B827Ed3EBAe838Ad6BD1B');
    },
    get jug() {
      return load(mcdJug, '0x5D8A44E8BE914e6C3bCADb46581502592Ac41a94');
    },
    get spot() {
      return load(mcdSpotter, '0x42B7E35e4A2DE972F5Cf17417ED49aff869D7a40');
    },
    ilks: {
      WETH: 'ETH',
      DAI: 'DAI',
      DGD: 'DGD',
      REP: 'REP',
      ZRX: 'ZRX',
      BAT: 'BAT',
    },
    joins: {
      WETH: '0x2B6D0E2703bCA807bF4f4ab6B542F665d2af3F9C',
      DAI: '0x5DFA1cCcE9A29efB2d49AB82f10cB5F1bF8e5013',
    },
    flip: {
      get WETH() {
        return load(mcdFlipper, '0x76fdFbdBaF5Ef599FBD6565e998D20A0C838d950');
      },
    },
    prices: {
      get WETH() {
        return load(dsValue, '0x8b8B359c33c13b818713570583C8bce2b030AD9A');
      },
      get DGD() {
        return load(dsValue, '0xb113A6d8c86d2fF2CCFa3E9470B0Aa2A808278f1');
      },
      get REP() {
        return load(dsValue, '0xe81E2F7Aa2A521424f47E05B90572510C9352058');
      },
      get ZRX() {
        return load(dsValue, '0x20dC9F6AE213EA1D6d668D6bDa86c34EA6967889');
      },
      get BAT() {
        return load(dsValue, '0x350431e42D01f7a81c6BD0E06251a24BB70d348B');
      },
    },
    osms: {
      get WETH() {
        return load(mcdOsm, '0x7b0EFd60129c077D98fDFE6Fdbaf7265Df78697F');
      },
      get DGD() {
        return load(mcdOsm, '0xc2fCc21890cd328109cA229959f40fcCaD94447B');
      },
      get REP() {
        return load(mcdOsm, '0x36a16Ed65A10918E1283b702d5000D2d0592c792');
      },
      get ZRX() {
        return load(mcdOsm, '0x357DA4c113A85BD27De51d4521BbA7C96a6f7a9E');
      },
      get BAT() {
        return load(mcdOsm, '0x296D2971Ec5aA7Bc92CC5DEF463FD755635337Fb');
      },
    },
  } as { [key: string]: any },
  cdpManager: '0xAFe25DF80A6Ce0890d1742767Fd6424bF845F39d',
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
  get proxyActions() {
    return load(proxyActions, '0x5d25fcd10aadf3068d1bda950f10e24bf4107419');
  },
  get migration() {
    return '0xc1199D132f6B6B72C37F817d103a4E62590e3DC1';
  },
  get migrationProxyActions() {
    return '0xEF4A15D64832cF7e2efa6DeBfad5520ff5F70755';
  },
  get instantMigrationProxyActions() {
    return load(instantMigrationProxyActions, '0x141048f25b24AEfAF1A13fD9C2e8628121A0f1E7');
  },
  get tokenRecovery() {
    return load(tokenRecovery, nullAddress);
  },
  oasisDataService: {
    url: 'http://localhost:3001/v1',
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
  get txManager() {
    return load(txManager, '0xD87be980cC779bAF00ac8eD9F924E2d22A85b357');
  },
};

export const networks = asMap('id', [main, kovan, localnet]);
