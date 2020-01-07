import { BigNumber } from 'bignumber.js';
import * as React from 'react';
import * as Web3Utils from 'web3-utils';
import { web3 } from '../web3';

import * as dsProxy from '../abi/ds-proxy.abi.json';
import { NetworkConfig } from '../config';
import { amountFromWei, amountToWei } from '../utils';
import { CallDef, TransactionDef } from './callsHelpers';
import { TxMetaKind } from './txMeta';

export interface MakeLinearOffersData {
  proxyAddress: string;
  baseToken: string;
  quoteToken: string;
  midPrice: number;
  delta: number;
  baseAmount: number;
  count: number;
}

function q18(value: number): string {
  return String(value * 10 ** 4) + '0'.repeat(14);
}

export const makeLinearOffers: TransactionDef<MakeLinearOffersData> = {
  call: ({ proxyAddress }: MakeLinearOffersData, _context: NetworkConfig) =>
    new web3.eth.Contract(dsProxy as any, proxyAddress).methods['execute(address,bytes)'],
  prepareArgs: (
    { baseToken, quoteToken, midPrice, delta, baseAmount, count }: MakeLinearOffersData,
    context: NetworkConfig
  ) => [
    context.liquidityProvider.address,
    context.liquidityProvider.contract.methods.linearOffers(
      context.otc.address,
      context.tokens[baseToken].address,
      context.tokens[quoteToken].address,
      q18(midPrice),
      q18(delta),
      q18(baseAmount),
      String(count),
    ).encodeABI(),
  ],
  kind: TxMetaKind.makeLinearOffers,
  description: ({ count, midPrice, baseToken, quoteToken }: MakeLinearOffersData) => <>
    Create {count} offer pairs for trading {baseToken}/{quoteToken} around price {midPrice}
  </>,
};

export interface CancelAllOffersData {
  proxyAddress: string;
  baseToken: string;
  quoteToken: string;
}

export const cancelAllOffers: TransactionDef<CancelAllOffersData> = {
  call: ({ proxyAddress }: CancelAllOffersData, _context: NetworkConfig) =>
    new web3.eth.Contract(dsProxy as any, proxyAddress).methods['execute(address,bytes)'],
  prepareArgs: (
    { baseToken, quoteToken }: CancelAllOffersData,
    context: NetworkConfig
  ) => [
    context.liquidityProvider.address,
    context.liquidityProvider.contract.methods.cancelMyOffers(
      context.otc.address,
      context.tokens[baseToken].address,
      context.tokens[quoteToken].address,
    ).encodeABI(),
  ],
  kind: TxMetaKind.cancelAllOffers,
  description: ({ baseToken, quoteToken }: CancelAllOffersData) => <>
    Cancel all your offers of {baseToken}/{quoteToken} !!!
  </>,
};

export interface DripData {
  token: string;
}

export const drip: TransactionDef<DripData> = {
  call: (_data: DripData, context: NetworkConfig) => context.mcd.jug.contract.methods.drip,
  prepareArgs: ({ token }: DripData, context: NetworkConfig) => [
    Web3Utils.asciiToHex(context.mcd.ilks[token]),
  ],
  kind: TxMetaKind.devDrip,
  description: ({ token }: DripData) => <React.Fragment>Drip {token}</React.Fragment>,
};

export interface ReadPriceData {
  token: string;
}

export const readPrice: CallDef<ReadPriceData, BigNumber> = {
  call: ({ token }: ReadPriceData, context: NetworkConfig) =>
    context.mcd.prices[token].contract.methods.read,
  prepareArgs: () => [],
  postprocess: (price: string) => amountFromWei(new BigNumber(price), 'DAI'),
};

export interface ChangePriceData {
  token: string;
  price: number;
}

export const changePrice: TransactionDef<ChangePriceData> = {
  call: ({ token }: ChangePriceData, context: NetworkConfig) =>
    context.mcd.prices[token].contract.methods.poke,
  prepareArgs: ({ price }: ChangePriceData) => [
    `0x${amountToWei(new BigNumber(price), 'DAI').toNumber().toString(16).padStart(64, '0')}`
  ],
  kind: TxMetaKind.devChangePrice,
  description: ({ token, price }: ChangePriceData) =>
    <React.Fragment>Change price of {token} to {price}</React.Fragment>,
};

export interface PokeOsmData {
  token: string;
}

export const pokeOsm: TransactionDef<PokeOsmData> = {
  call: ({ token }: PokeOsmData, context: NetworkConfig) =>
    context.mcd.osms[token].contract.methods.poke,
  prepareArgs: () => [],
  kind: TxMetaKind.devPokeOsm,
  description: ({ token }: PokeOsmData) =>
    <React.Fragment>Poke osm of {token}</React.Fragment>,
};

export interface PokeSpotterData {
  token: string;
}

export const pokeSpotter: TransactionDef<PokeSpotterData> = {
  call: (_data: PokeOsmData, context: NetworkConfig) =>
    context.mcd.spot.contract.methods.poke,
  prepareArgs: ({ token }: PokeOsmData, context: NetworkConfig) => [
    Web3Utils.asciiToHex(context.mcd.ilks[token]),
  ],
  kind: TxMetaKind.devPokeSpotter,
  description: ({ token }: PokeOsmData) =>
    <React.Fragment>Poke spotter of {token}</React.Fragment>,
};
