import { BigNumber } from 'bignumber.js';
import * as React from 'react';
import { from, Observable, of } from 'rxjs';
import { mergeMap } from 'rxjs/operators';
import { OfferType } from '../../exchange/orderbook/orderbook';

import { Money } from '../../utils/formatters/Formatters';
import { one } from '../../utils/zero';
import * as dsProxy from '../abi/ds-proxy.abi.json';
import * as proxyRegistry from '../abi/proxy-registry.abi.json';
import { NetworkConfig } from '../config';
import { amountFromWei, amountToWei } from '../utils';
import { web3 } from '../web3';
import { CallDef, TransactionDef } from './callsHelpers';
import { TxMetaKind } from './txMeta';

export interface InstantOrderData {
  proxyAddress?: string;
  kind: OfferType;
  buyAmount: BigNumber;
  sellAmount: BigNumber;
  buyToken: string;
  sellToken: string;
  slippageLimit: BigNumber;
  gasPrice: BigNumber;
  gasEstimation: number;
}

export function eth2weth(token: string): string {
  return token.replace(/^ETH/, 'WETH');
}

export function weth2eth(token: string): string {
  return token.replace(/^WETH/, 'ETH');
}

export const tradePayWithETHWithProxy: TransactionDef<InstantOrderData> = {
  call: ({ proxyAddress }: InstantOrderData) => {
    return new web3.eth.Contract(dsProxy as any, proxyAddress!).methods['execute(address,bytes)'];
  },
  prepareArgs: (
    {
      kind,
      buyToken, buyAmount,
      slippageLimit,
    }: InstantOrderData,
    context: NetworkConfig
  ) => {
    const fixedBuyAmount = kind === OfferType.sell ?
      fixBuyAmount(buyAmount, slippageLimit) :
      buyAmount;

    const method = kind === OfferType.sell ?
      context.instantProxyCreationAndExecute.contract.methods.sellAllAmountPayEth :
      context.instantProxyCreationAndExecute.contract.methods.buyAllAmountPayEth;

    const params = kind === OfferType.sell ? [
      context.otc.address,
      context.tokens.WETH.address,
      context.tokens[buyToken].address,
      amountToWei(fixedBuyAmount, buyToken).toFixed(0)
    ] : [
      context.otc.address,
      context.tokens[buyToken].address,
      amountToWei(fixedBuyAmount, buyToken).toFixed(0),
      context.tokens.WETH.address,
    ];

    return [
      context.instantProxyCreationAndExecute.address,
      method(...params).encodeABI()
    ];

  },
  options: ({
    kind,
    sellToken, sellAmount,
    slippageLimit,
    gasPrice,
    gasEstimation
  }: InstantOrderData) => ({
    gasPrice,
    gas: gasEstimation,
    value: amountToWei(
      kind === OfferType.sell ?
        sellAmount :
        fixSellAmount(sellAmount, slippageLimit),
      sellToken).toFixed(0)
  }),
  kind: TxMetaKind.tradePayWithETHWithProxy,
  description: ({ kind, buyToken, buyAmount, sellToken, sellAmount }: InstantOrderData) =>
    kind === 'sell' ?
    <>
      Create Sell Order <Money value={sellAmount} token={sellToken}/>
    </> :
    <>
      Create Buy Order <Money value={buyAmount} token={buyToken}/>
    </>
};

export const tradePayWithETHNoProxy: TransactionDef<InstantOrderData> = {
  call: ({ kind }: InstantOrderData, context: NetworkConfig) => {
    return kind === OfferType.sell ?
      context.instantProxyCreationAndExecute.contract.methods.createAndSellAllAmountPayEth :
      context.instantProxyCreationAndExecute.contract.methods.createAndBuyAllAmountPayEth;
  },
  prepareArgs: (
    {
      kind,
      buyToken, buyAmount,
      slippageLimit,
    }: InstantOrderData,
    context: NetworkConfig
  ) => {
    return [
      context.instantProxyRegistry.address,
      context.otc.address,
      context.tokens[buyToken].address,
      amountToWei(
        kind === OfferType.sell ? fixBuyAmount(buyAmount, slippageLimit) : buyAmount,
        buyToken
      ).toFixed(0)
    ];
  },
  options: ({
    kind,
    sellToken, sellAmount,
    slippageLimit,
    gasPrice,
    gasEstimation
  }: InstantOrderData) => ({
    gasPrice,
    gas: gasEstimation,
    value: amountToWei(
      kind === OfferType.sell ? sellAmount : fixSellAmount(sellAmount, slippageLimit),
      sellToken).toFixed(0)
  }),
  kind: TxMetaKind.tradePayWithETHNoProxy,
  description: ({ kind, buyToken, buyAmount, sellToken, sellAmount }: InstantOrderData) =>
    kind === 'sell' ?
      <>
        Create Sell Order <Money value={sellAmount} token={sellToken}/>
      </> :
      <>
        Create Buy Order <Money value={buyAmount} token={buyToken}/>
      </>
};

function fixBuyAmount(buyAmount: BigNumber, slippageLimit: BigNumber) {
  return buyAmount.times(one.minus(slippageLimit));
}

function fixSellAmount(sellAmount: BigNumber, slippageLimit: BigNumber) {
  return sellAmount.times(one.plus(slippageLimit));
}

export const tradePayWithERC20: TransactionDef<InstantOrderData> = {
  call: ({ proxyAddress }: InstantOrderData) => {
    return new web3.eth.Contract(dsProxy as any, proxyAddress!).methods['execute(address,bytes)'];
  },
  prepareArgs: (
    {
      kind,
      buyToken, buyAmount,
      sellToken, sellAmount,
      slippageLimit,
    }: InstantOrderData,
    context: NetworkConfig
  ) => {
    if (sellToken === 'ETH') {
      throw new Error('Pay with ETH not handled here!');
    }

    const method = kind === OfferType.sell ?
      buyToken === 'ETH' ?
        context.instantProxyCreationAndExecute.contract.methods.sellAllAmountBuyEth :
        context.instantProxyCreationAndExecute.contract.methods.sellAllAmount
      :
      buyToken === 'ETH' ?
        context.instantProxyCreationAndExecute.contract.methods.buyAllAmountBuyEth :
        context.instantProxyCreationAndExecute.contract.methods.buyAllAmount;

    const params = kind === OfferType.sell ? [
      context.otc.address,
      context.tokens[sellToken].address,
      amountToWei(sellAmount, sellToken).toFixed(0),
      context.tokens[eth2weth(buyToken)].address,
      amountToWei(fixBuyAmount(buyAmount, slippageLimit), buyToken).toFixed(0),
    ] : [
      context.otc.address,
      context.tokens[eth2weth(buyToken)].address,
      amountToWei(buyAmount, buyToken).toFixed(0),
      context.tokens[sellToken].address,
      amountToWei(fixSellAmount(sellAmount, slippageLimit), sellToken).toFixed(0),
    ];

    return [
      context.instantProxyCreationAndExecute.address,
      method(...params).encodeABI()
    ];
  },
  options: ({
    gasPrice,
    gasEstimation
  }: InstantOrderData) => ({
    gasPrice,
    gas: gasEstimation,
  }),
  kind: TxMetaKind.tradePayWithERC20,

  description: ({ kind, buyToken, buyAmount, sellToken, sellAmount }: InstantOrderData) =>
    kind === 'sell' ?
      <>
        Create Sell Order <Money value={sellAmount} token={sellToken}/>
      </> :
      <>
        Create Buy Order <Money value={buyAmount} token={buyToken}/>
      </>
};

export const migrateTradePayWithERC20: TransactionDef<InstantOrderData> = {
  call: ({ proxyAddress }: InstantOrderData) => {
    return new web3.eth.Contract(dsProxy as any, proxyAddress!).methods['execute(address,bytes)'];
  },
  prepareArgs: (
    {
      kind,
      buyToken, buyAmount,
      sellToken, sellAmount,
      slippageLimit,
    }: InstantOrderData,
    context: NetworkConfig
  ) => {
    if (sellToken === 'ETH') {
      throw new Error('Pay with ETH not handled here!');
    }

    const method = kind === OfferType.sell ?
      buyToken === 'ETH' ?
        context.instantMigrationProxyActions.contract.methods.sellAllAmountBuyEthAndMigrateSai :
        context.instantMigrationProxyActions.contract.methods.sellAllAmountAndMigrateSai
      :
      buyToken === 'ETH' ?
        context.instantMigrationProxyActions.contract.methods.buyAllAmountBuyEthAndMigrateSai :
        context.instantMigrationProxyActions.contract.methods.buyAllAmountAndMigrateSai;

    const params = kind === OfferType.sell ? [
      context.otc.address,
      context.tokens[sellToken].address,
      amountToWei(sellAmount, sellToken).toFixed(0),
      context.tokens[eth2weth(buyToken)].address,
      amountToWei(fixBuyAmount(buyAmount, slippageLimit), buyToken).toFixed(0),
      context.migration
    ] : [
      context.otc.address,
      context.tokens[eth2weth(buyToken)].address,
      amountToWei(buyAmount, buyToken).toFixed(0),
      context.tokens[sellToken].address,
      amountToWei(fixSellAmount(sellAmount, slippageLimit), sellToken).toFixed(0),
      context.migration
    ];

    console.log('params', kind, params, method(...params).encodeABI());

    return [
      context.instantMigrationProxyActions.address,
      method(...params).encodeABI()
    ];
  },
  options: ({
    gasPrice,
    gasEstimation
  }: InstantOrderData) => ({
    gasPrice,
    gas: gasEstimation,
  }),
  kind: TxMetaKind.tradePayWithERC20,
  description: ({ kind, buyToken, buyAmount, sellToken, sellAmount }: InstantOrderData) =>
    kind === 'sell' ?
      <>
        Migrate SAI and create Sell Order <Money value={sellAmount} token={sellToken}/>
      </> :
      <>
        Migrate SAI and create Buy Order <Money value={buyAmount} token={buyToken}/>
      </>
};

export interface GetBuyAmountData {
  sellToken: string;
  buyToken: string;
  amount: BigNumber;
}

export const getBuyAmount: CallDef<GetBuyAmountData, BigNumber> = {
  call: (_: GetBuyAmountData, context: NetworkConfig) => {
    return context.otc.contract.methods.getBuyAmount;
  },
  prepareArgs: ({ sellToken, buyToken, amount }: GetBuyAmountData, context: NetworkConfig) => {
    sellToken = eth2weth(sellToken);
    buyToken = eth2weth(buyToken);
    return [
      context.tokens[eth2weth(buyToken)].address,
      context.tokens[eth2weth(sellToken)].address,
      amountToWei(amount, sellToken).toFixed(0)
    ];
  },
  postprocess: (result, { buyToken }) => amountFromWei(new BigNumber(result), buyToken),
};

export interface GetPayAmountData {
  sellToken: string;
  buyToken: string;
  amount: BigNumber;
}

export const getPayAmount: CallDef<GetPayAmountData, BigNumber> = {
  call: (_: GetPayAmountData, context: NetworkConfig) => {
    return context.otc.contract.methods.getPayAmount;
  },
  prepareArgs: ({ sellToken, buyToken, amount }: GetPayAmountData, context: NetworkConfig) => {
    sellToken = eth2weth(sellToken);
    buyToken = eth2weth(buyToken);
    return [
      context.tokens[sellToken].address,
      context.tokens[buyToken].address,
      amountToWei(amount, buyToken).toFixed(0)
    ];
  },
  postprocess: (result: BigNumber, { sellToken }: GetPayAmountData) =>
    amountFromWei(new BigNumber(result), eth2weth(sellToken)),
};

export interface GetOffersAmountData {
  kind: OfferType;
  buyAmount: BigNumber;
  sellAmount: BigNumber;
  buyToken: string;
  sellToken: string;
}

export type GetOffersAmountResult = [BigNumber, boolean];

export const getOffersAmount: CallDef<GetOffersAmountData, GetOffersAmountResult> = {
  call: ({ kind }: GetOffersAmountData, context: NetworkConfig) => kind === OfferType.sell ?
    context.otcSupportMethods.contract.methods.getOffersAmountToSellAll :
    context.otcSupportMethods.contract.methods.getOffersAmountToBuyAll,
  prepareArgs: (
    { kind, buyAmount, sellAmount, buyToken, sellToken }: GetOffersAmountData,
    context: NetworkConfig
  ) => {
    const sellTokenAddress = context.tokens[eth2weth(sellToken)].address;
    const buyTokenAddress = context.tokens[eth2weth(buyToken)].address;
    return kind === OfferType.sell
      ? [
        context.otc.address,
        sellTokenAddress,
        amountToWei(sellAmount, sellToken)
          .toFixed(0), buyTokenAddress]
      : [
        context.otc.address,
        buyTokenAddress,
        amountToWei(buyAmount, buyToken)
          .toFixed(0), sellTokenAddress];
  },
};

export interface GetBestOfferData {
  sellToken: string;
  buyToken: string;
}

export const getBestOffer: CallDef<GetBestOfferData, BigNumber> = {
  call: (_: GetBestOfferData, context: NetworkConfig) => {
    return context.otc.contract.methods.getBestOffer;
  },
  prepareArgs: ({ sellToken, buyToken }: GetBestOfferData, context: NetworkConfig) => [
    context.tokens[eth2weth(sellToken)].address,
    context.tokens[eth2weth(buyToken)].address,
  ],
};

type OffersData = BigNumber;

export const offers: CallDef<OffersData, any> = {
  call: (_: OffersData, context: NetworkConfig) => {
    return context.otc.contract.methods.offers;
  },
  prepareArgs: (offerId: OffersData) => [offerId],
};

const nullAddress = '0x0000000000000000000000000000000000000000';
const nullAddress0x = '0x';

export function proxyAddress$(
  context: NetworkConfig,
  account: string,
  proxyRegistryAddress?: string
): Observable<string | undefined> {

  return from((proxyRegistryAddress
    ? new web3.eth.Contract(proxyRegistry as any, proxyRegistryAddress).methods
    : context.instantProxyRegistry.contract.methods
  ).proxies(account).call()).pipe(
    mergeMap((proxyAddress: string) => {
      if (proxyAddress === nullAddress || proxyAddress === nullAddress0x) {
        return of(undefined);
      }
      const proxy = new web3.eth.Contract(dsProxy as any, proxyAddress);
      return from(proxy.methods.owner().call()).pipe(
        mergeMap((ownerAddress: string) =>
                   ownerAddress === account ? of(proxyAddress) : of(undefined)
        )
      );
    })
  );
}

export interface SetupProxyData {
  gasPrice?: BigNumber;
  gasEstimation?: number;
}
export const setupProxy = {
  call: (_: any, context: NetworkConfig) =>
    context.instantProxyRegistry.contract.methods['build()'],
  prepareArgs: () => [],
  options: ({ gasPrice, gasEstimation }: SetupProxyData) =>
    ({ ...gasPrice ? gasPrice : {}, ...gasEstimation ? { gas: gasEstimation } : {} }),
  kind: TxMetaKind.setupProxy,
  description: () => <React.Fragment>Setup proxy</React.Fragment>
};

export interface SetOwnerData {
  proxyAddress: string;
  ownerAddress: string;
}

export const setOwner = {
  call: ({ proxyAddress }: SetOwnerData) =>
    new web3.eth.Contract(dsProxy as any, proxyAddress).methods.setOwner,
  prepareArgs: ({ ownerAddress }: SetOwnerData) => [ownerAddress],
  options: () => ({ gas: 1000000 }),
  kind: TxMetaKind.setupProxy,
  description: () => <React.Fragment>Calling SetOwner on proxy</React.Fragment>
};
