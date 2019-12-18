import { BigNumber } from 'bignumber.js';
import * as React from 'react';
import { combineLatest, forkJoin, identity } from 'rxjs';
import { concatAll, first, map, reduce, tap } from 'rxjs/operators';
import { Error } from 'tslint/lib/error';
import { Money } from '../../utils/formatters/Formatters';
import { Currency } from '../../utils/text/Text';
import { getToken, NetworkConfig } from '../config';
import {context$, initializedAccount$, onEveryBlock$} from '../network';
import { amountFromWei, amountToWei } from '../utils';
import { web3 } from '../web3';
import { callCurried, sendTransactionCurried, TransactionDef } from './callsHelpers';
import {loadOrderbook$} from './oasisDexOrderbook';
import { TxMetaKind } from './txMeta';

import { Omit } from '../../utils/omit';

import * as ethWethJoin from '../abi/eth-weth-join.abi.json';
import * as gemJoin from '../abi/gem-join.abi.json';
import * as oasisHelper from '../abi/oasis-helper.abi.json';
import * as oasis from '../abi/oasis.abi.json';
import { isObjectType } from 'graphql';

function load(address: string, abi: any) {
  return web3.eth.contract(abi).at(address);
}

export const OasisHelper = load('0x9d79925d3b8da9b13448e43134136bb1ffb3cf7a', oasisHelper);
export const Oasis = load('0xa8c36d6c30f21d7f309d092215cc0cc58a7236da', oasis);
const ETHWETHJoin = load('0x6b754fbb380042ba1b000e4079802859218ca57e', ethWethJoin);
const DAIJoin = load('0x5c7e8cc44002ae4fc3fb8f743f14a6dfa8926a8e', gemJoin);

export const markets = {
  'WETH/DAI': '0xfe8b8d43a0b3715ce6ac9a822ddb7dbfb1cf103365725279dead8fb2164f3a16'
};

const gemJoins: any = {
  WETH: ETHWETHJoin,
  DAI: DAIJoin,
};

export interface ApproveAdapterData {
  token: string;
}

export const approveAdapter = {
  call: ({ token }:  ApproveAdapterData, context: NetworkConfig) =>
    context.tokens[token].contract.approve['address,uint256'],
  prepareArgs: ({ token }:  ApproveAdapterData) =>
    [gemJoins[token].address, -1],
  kind: TxMetaKind.approveAdapter,
  descriptionIcon: ({ token }:  ApproveAdapterData) => getToken(token).iconCircle,
  description: ({ token }:  ApproveAdapterData) =>
    <>Unlock <Currency value={token}/> on adapter</>
};

export interface JoinData {
  amount: BigNumber;
  token: string;
}

export interface ExitData {
  amount: BigNumber;
  token: string;
}

export const join: TransactionDef<JoinData> = {
  call: ({ token }: JoinData, context: NetworkConfig) => {
    if (token === 'ETH') {
      throw new Error('Not implemented yet!');
    }
    return (gemJoins[token] as any).join;
  },
  prepareArgs: ({ amount, token }: JoinData, _: NetworkConfig, account: string | undefined) =>
    [account, amountToWei(amount, token).toFixed(0)],
  kind: TxMetaKind.join,
  description: ({ amount, token }: JoinData) => (
      <>Join <Money value={amount} token={token}/></>
  )
};

export interface LimitData {
  baseToken: string;
  quoteToken: string;
  amount: BigNumber;
  price: BigNumber;
  buying: boolean;
  pos?: number;
}

export const limit: TransactionDef<LimitData> = {
  call: () => {
    return (Oasis as any).limit;
  },
  prepareArgs: ({ baseToken, quoteToken, amount, price, buying, pos }: LimitData) => {
    const marketId = markets['WETH/DAI']; // `${quoteToken}/${baseToken}`
    const x = [
      marketId,
      amountToWei(amount, 'WETH').toFixed(0),
      amountToWei(price, 'WETH').toFixed(0),
      buying, pos || 0
    ];
    console.log(x);
    return x;
  },
  kind: TxMetaKind.join, // Why is this join ?
  description: ({ baseToken, quoteToken, amount, price, buying }: LimitData) => (
    <>
      { buying ? 'Buy' : 'Sell'} <Money value={amount} token={baseToken}/>
      at: <Money value={price} token={quoteToken}/> {`${baseToken}/${quoteToken}`}
    </>
  )
};

export type IoCData = Omit<LimitData, 'pos'>;

export const ioc: TransactionDef<IoCData> = {
  call: () => {
    return (Oasis as any).ioc;
  },
  prepareArgs: ({ baseToken, quoteToken, amount, price, buying }: IoCData) => {
    const marketId = markets['WETH/DAI']; // `${quoteToken}/${baseToken}`
    return [
      marketId,
      amountToWei(amount, 'WETH').toFixed(0),
      amountToWei(price, 'WETH').toFixed(0),
      buying,
    ];
  },
  kind: TxMetaKind.join,
  description: ({ baseToken, quoteToken, amount, price, buying }: IoCData) => (
    <>
      <span>Immediate-or-Cancel<br/></span>
      { buying ? 'Buy' : 'Sell'} <Money value={amount} token={baseToken}/>
      at: <Money value={price} token={quoteToken}/> {`${baseToken}/${quoteToken}`}
    </>
  )
};

export type FoKData = IoCData & { totalLimit: BigNumber };

export const fok: TransactionDef<FoKData> = {
  call: () => {
    return (Oasis as any).fok;
  },
  prepareArgs: ({ baseToken, quoteToken, amount, price, buying, totalLimit }: FoKData) => {
    const marketId = markets['WETH/DAI']; // `${quoteToken}/${baseToken}`
    return [
      marketId,
      amountToWei(amount, 'WETH').toFixed(0),
      amountToWei(price, 'WETH').toFixed(0),
      buying,
      totalLimit
    ];
  },
  kind: TxMetaKind.join,
  description: ({ baseToken, quoteToken, amount, price, buying }: FoKData) => (
    <>
      <span>Fill-or-Kill<br/></span>
      { buying ? 'Buy' : 'Sell'} <Money value={amount} token={baseToken}/>
      at: <Money value={price} token={quoteToken}/> {`${baseToken}/${quoteToken}`}
    </>
  )
}

export interface BalanceData {
  token: string;
}

export const balance = {
  call: ({ token }: BalanceData, _: NetworkConfig) => {
    if (token === 'ETH') {
      throw new Error('Not implemented yet!');
    }
    return Oasis.gems;
  },
  prepareArgs: ({ token }: BalanceData, _: NetworkConfig, account: string | undefined) =>
    [gemJoins[token].address, account],
  postprocess: (b: BigNumber, { token }: BalanceData) => amountFromWei(b, token),
};

export interface CancelData {
  // Probably we can inject TradingPair directly ?
  baseToken: string;
  quoteToken: string;
  // Probably we can use OfferType and in the calls to check if it's buy or sell ?
  buying: boolean;
  offerId: number; // For some reason the call fails when the value is BigNumber
}

export const cancel: TransactionDef<CancelData> = {
  call: (_: CancelData) => (Oasis as any).cancel,
  prepareArgs: ({baseToken, quoteToken, buying, offerId}: CancelData) => {
    return [
      markets['WETH/DAI'],
      buying, 
      offerId
    ]
  },
  kind: TxMetaKind.cancel2,
  description:({ buying }: CancelData) => (
    <> Cancelling { buying ? 'Buy' : 'Sell' } Order </>
  )
}

export interface OfferUpdateData {
  baseToken: string;
  quoteToken: string;
  offerId: number;
  buying: boolean;
  amount: BigNumber;
  price: BigNumber;
  pos?: number;
}

export const update: TransactionDef<OfferUpdateData> = {
  call: () => {
    return (Oasis as any).update;
  },
  prepareArgs: ({ baseToken, quoteToken, offerId, amount, price, buying, pos }: OfferUpdateData) => {
    const marketId = markets['WETH/DAI']; // `${quoteToken}/${baseToken}`
    return [
      marketId,
      buying,
      offerId,
      amountToWei(amount, 'WETH').toFixed(0),
      amountToWei(price, 'WETH').toFixed(0),
      pos || 0
    ];
  },
  kind: TxMetaKind.offerUpdate,
  description: ({ baseToken, quoteToken, amount, price, buying }: OfferUpdateData) => (
    <>
      Update { buying ? 'Buy' : 'Sell'} Order.<br></br>
      { buying ? 'Buy' : 'Sell'} <Money value={amount} token={baseToken}/>
      at: <Money value={price} token={quoteToken}/> {`${baseToken}/${quoteToken}`}
    </>
  )
};


function balances(context: NetworkConfig, account: string | undefined) {
  forkJoin(Object.keys(gemJoins).map(token =>
    callCurried(context, account)(balance)({ token }).pipe(
      map((a: any) => ({ [token]: a.toString() }))
    )
  )).pipe(
    concatAll(),
    reduce(
      (a, e) => ({ ...a, ...e }),
      {},
    )
  ).subscribe(amounts => console.table(amounts));
}


export function initDexCalls() {
  combineLatest(context$, initializedAccount$).pipe(
    first(),
    tap(([context, initializedAccount]) => {
      const call = callCurried(context, initializedAccount);
      const send = sendTransactionCurried(context, initializedAccount);

      const anyWindow = window as any;

  
      // Displays the locked balances for the callers account
      anyWindow.balances = () => balances(context, initializedAccount);

      // Locks given token amount in the token adapter ( GemJoin )
      anyWindow.join = (token: string, amount: string) =>
        send(join)({ token, amount: new BigNumber(amount) }).subscribe(identity);

      // Setting allownce for the given adapter 
      // so that it can make transfers on yur behalf
      // Prerequisite step for `join` token amount.
      anyWindow.approveAdapter = (token: string) =>
        send(approveAdapter)({ token }).subscribe(identity);

      // Creates new Limit Buy Order
      anyWindow.buyLimit = (
        baseToken: string, quoteToken: string,
        amount: string, price: string,
      ) => send<LimitData>(limit)({
        baseToken,
        quoteToken,
        amount: new BigNumber(amount),
        price: new BigNumber(price),
        buying:true,
      }).subscribe(identity);

      // Creates new Limit Sell Order
      anyWindow.sellLimit = (
        baseToken: string, quoteToken: string,
        amount: string, price: string,
      ) => send<LimitData>(limit)({
        baseToken,
        quoteToken,
        amount: new BigNumber(amount),
        price: new BigNumber(price),
        buying: false
      }).subscribe(identity);
      
      // Created Immediate-or-Cancel buy order
      anyWindow.buyIoC = (
        baseToken: string, quoteToken: string,
        amount: string, price: string,
      ) => send<IoCData>(ioc)({
        baseToken,
        quoteToken,
        amount: new BigNumber(amount),
        price: new BigNumber(price),
        buying: true,
      }).subscribe(identity);

      // Created Immediate-or-Cancel Sell order
      anyWindow.sellIoC = (
        baseToken: string, quoteToken: string,
        amount: string, price: string,
      ) => send<IoCData>(ioc)({
        baseToken,
        quoteToken,
        amount: new BigNumber(amount),
        price: new BigNumber(price),
        buying: false,
      }).subscribe(identity);

      // Cancel an order
      // Should w ehave cancelBuy, cancelSell ?
      anyWindow.cancel = (
        buying: boolean,
        offerId: number,
      ) => send(cancel)({
        baseToken:'WETH',
        quoteToken:'DAI',
        buying,
        offerId,
      }).subscribe(identity);

      // Should we have updateBuy , updateSell ?
      anyWindow.update = (
        buying: boolean,
        offerId: number,
        amount: string,
        price: string,
        pos?: number,
      ) => send(update)({
        baseToken: 'WETH',
        quoteToken: 'DAI',
        amount: new BigNumber(amount),
        price: new BigNumber(price),
        buying,
        offerId,
        pos
      }).subscribe();

      // Loads the orderbook for a given market
      anyWindow.orderbook = () => loadOrderbook$(
        context$,
        onEveryBlock$,
        {base: 'WETH', quote: 'DAI'}
      ).pipe(
        first(),
        tap(orderbook => {
          console.log(JSON.stringify(orderbook, null, ' '));
        })
      ).subscribe(identity);

      console.log('oasisDex helpers loaded!');
    }),
  ).subscribe(identity);
}
