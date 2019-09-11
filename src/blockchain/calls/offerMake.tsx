import { BigNumber } from 'bignumber.js';
import * as React from 'react';
import { Error } from 'tslint/lib/error';

import { OfferType } from '../../exchange/orderbook/orderbook';
import { TradeAct } from '../../exchange/trades';
import { OfferMatchType } from '../../utils/form';
import { Money } from '../../utils/formatters/Formatters';
import * as dsProxy from '../abi/ds-proxy.abi.json';
import { NetworkConfig } from '../config';
import { amountToWei } from '../utils';
import { web3 } from '../web3';
import { TransactionDef } from './callsHelpers';
import { TxMetaKind } from './txMeta';

export interface CancelData {
  offerId: BigNumber;
  type: TradeAct;
  amount: BigNumber;
  token: string;
  gasPrice?: BigNumber;
  gasEstimation?: number;
}

export const cancelOffer: TransactionDef<CancelData> = {
  call: (_data: CancelData, context: NetworkConfig) => context.otc.contract.cancel.uint256,
  prepareArgs: ({ offerId }: CancelData) => [
    offerId
  ],
  options: () => ({ gas: 500000 }),
  kind: TxMetaKind.cancel,
  description: ({ type, amount, token }: CancelData) =>
    <React.Fragment>
      Cancel
      <span style={{ textTransform: 'capitalize' }}>
        &nbsp;{type}&nbsp;
      </span>
      Order <Money value={amount} token={token}/>
    </React.Fragment>,
};

export interface OfferMakeData {
  buyAmount: BigNumber;
  buyToken: string;
  sellAmount: BigNumber;
  sellToken: string;
  matchType: OfferMatchType;
  position?: BigNumber;
  kind: OfferType;
  gasPrice: BigNumber;
  gasEstimation?: number;
}

export const offerMake: TransactionDef<OfferMakeData> = {
  call: (data: OfferMakeData, context: NetworkConfig) => {
    if (data.matchType === OfferMatchType.limitOrder) {
      return context.otc.contract.offer['uint256,address,uint256,address,uint256,bool'];
    }
    throw new Error('should not be here');
  },
  prepareArgs: (
    { buyAmount, buyToken, sellAmount, sellToken, matchType, position }: OfferMakeData,
    context: NetworkConfig
  ) => [
    amountToWei(sellAmount, sellToken).toFixed(0), context.tokens[sellToken].address,
    amountToWei(buyAmount, buyToken).toFixed(0), context.tokens[buyToken].address,
    ...matchType === OfferMatchType.limitOrder ? [position || 0] : [],
    true,
  ],
  options: ({ gasPrice, gasEstimation }: OfferMakeData) => ({
    gasPrice: gasPrice.toFixed(0),
    gas: gasEstimation,
  }),
  kind: TxMetaKind.offerMake,
  description: ({ buyAmount, buyToken, sellAmount, sellToken, kind }: OfferMakeData) => (
    kind === OfferType.sell ?
      <>
        Create Sell Order <Money value={sellAmount} token={sellToken}/>
      </> :
      <>
        Create Buy Order <Money value={buyAmount} token={buyToken}/>
      </>
  )

};

export interface OfferMakeDirectData {
  baseAmount: BigNumber;
  baseToken: string;
  quoteAmount: BigNumber;
  quoteToken: string;
  matchType: OfferMatchType;
  price: BigNumber;
  kind: OfferType;
  gasPrice: BigNumber;
  gasEstimation?: number;
}

export const offerMakeDirect: TransactionDef<OfferMakeDirectData> = {
  call: ({ kind }: OfferMakeDirectData, context: NetworkConfig) => kind === OfferType.buy ?
    context.otc.contract.buyAllAmount['address,uint256,address,uint256'] :
    context.otc.contract.sellAllAmount['address,uint256,address,uint256'],
  prepareArgs: (
    { baseAmount, baseToken, quoteAmount, quoteToken }: OfferMakeDirectData,
    context: NetworkConfig
  ) => [
    context.tokens[baseToken].address,
    amountToWei(baseAmount, baseToken).toFixed(0),
    context.tokens[quoteToken].address,
    amountToWei(quoteAmount, quoteToken).toFixed(0),
  ],
  options: ({ gasPrice, gasEstimation }: OfferMakeDirectData) => ({
    gasPrice: gasPrice.toFixed(0),
    gas: gasEstimation
  }),
  kind: TxMetaKind.offerMake,
  description: ({ baseAmount, baseToken, quoteAmount, quoteToken, kind }: OfferMakeDirectData) =>
    kind === OfferType.sell ?
      <>
        Create Sell Order <Money value={baseAmount} token={baseToken}/>
      </> :
      <>
        Create Buy Order <Money value={quoteAmount} token={quoteToken}/>
      </>,
};

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
    web3.eth.contract(dsProxy as any).at(proxyAddress).execute['address,bytes'],
  prepareArgs: (
    { baseToken, quoteToken, midPrice, delta, baseAmount, count }: MakeLinearOffersData,
    context: NetworkConfig
  ) => [
    context.liquidityProvider.address,
    context.liquidityProvider.contract.linearOffers.getData(
      context.otc.address,
      context.tokens[baseToken].address,
      context.tokens[quoteToken].address,
      q18(midPrice),
      q18(delta),
      q18(baseAmount),
      String(count),
    ),
  ],
  kind: TxMetaKind.offerMake,
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
    web3.eth.contract(dsProxy as any).at(proxyAddress).execute['address,bytes'],
  prepareArgs: (
    { baseToken, quoteToken }: CancelAllOffersData,
    context: NetworkConfig
  ) => [
    context.liquidityProvider.address,
    context.liquidityProvider.contract.cancelMyOffers.getData(
      context.otc.address,
      context.tokens[baseToken].address,
      context.tokens[quoteToken].address,
    ),
  ],
  kind: TxMetaKind.cancel,
  description: ({ baseToken, quoteToken }: CancelAllOffersData) => <>
    Cancel all your offers of {baseToken}/{quoteToken} !!!
  </>,
};
