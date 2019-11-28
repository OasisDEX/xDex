import { combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';
import { ObservableItem } from '../../utils/observableItem';
import { NetworkConfig } from '../config';
import { account$, context$, initializedAccount$ } from '../network';
import { approveProxy, approveWallet, disapproveProxy, disapproveWallet } from './approveCalls';
import {
  callCurried,
  estimateGasCurried,
  sendTransactionCurried,
  sendTransactionWithGasConstraintsCurried
} from './callsHelpers';
import {
  getBestOffer,
  getBuyAmount,
  getOffersAmount,
  getPayAmount, migrateTradePayWithERC20,
  offers,
  proxyAddress$, setOwner, setupProxy, tradePayWithERC20,
  tradePayWithETHNoProxy, tradePayWithETHWithProxy
} from './instant';
import {
  approveMTProxy, mtBalance, mtBuy, mtDraw, mtFund, mtReallocate, mtRedeem, mtSell, osmParams, setupMTProxy
} from './mtCalls';
import {
  cancelAllOffers, cancelOffer, makeLinearOffers, offerMake, offerMakeDirect
} from './offerMake';
import { swapDaiToSai, swapSaiToDai } from './swapCalls';
import { unwrap, wrap } from './wrapUnwrapCalls';

function calls([context, account]: [NetworkConfig, string]) {
  const estimateGas = estimateGasCurried(context, account);
  const sendTransaction = sendTransactionCurried(context, account);
  const sendTransactionWithGasConstraints =
    sendTransactionWithGasConstraintsCurried(context, account);

  return {
    cancelOffer: sendTransactionWithGasConstraints(cancelOffer),
    cancelOffer2: sendTransaction(cancelOffer),
    offerMake: sendTransaction(offerMake),
    offerMakeDirect: sendTransaction(offerMakeDirect),
    offerMakeEstimateGas: estimateGas(offerMake),
    offerMakeDirectEstimateGas: estimateGas(offerMakeDirect),
    approveWallet: sendTransactionWithGasConstraints(approveWallet),
    disapproveWallet: sendTransactionWithGasConstraints(disapproveWallet),
    wrap: sendTransaction(wrap),
    wrapEstimateGas: estimateGas(wrap),
    unwrap: sendTransaction(unwrap),
    unwrapEstimateGas: estimateGas(unwrap),
    tradePayWithETHNoProxy: sendTransaction(tradePayWithETHNoProxy),
    tradePayWithETHWithProxy: sendTransaction(tradePayWithETHWithProxy),
    tradePayWithERC20: sendTransaction(tradePayWithERC20),
    tradePayWithERC20EstimateGas: estimateGas(tradePayWithERC20),
    migrateTradePayWithERC20: sendTransaction(migrateTradePayWithERC20),
    migrateTradePayWithERC20EstimateGas: estimateGas(migrateTradePayWithERC20),
    tradePayWithETHNoProxyEstimateGas: estimateGas(tradePayWithETHNoProxy),
    tradePayWithETHWithProxyEstimateGas: estimateGas(tradePayWithETHWithProxy),
    proxyAddress: () => proxyAddress$(context, account),
    setupProxy: sendTransaction(setupProxy),
    setupProxyEstimateGas: estimateGas(setupProxy),
    approveProxy: sendTransaction(approveProxy),
    approveProxyEstimateGas: estimateGas(approveProxy),
    approveMTProxy: sendTransaction(approveMTProxy),
    disapproveProxy: sendTransaction(disapproveProxy),
    swapSaiToDai : sendTransaction(swapSaiToDai),
    swapSaiToDaiEstimateGas: estimateGas(swapSaiToDai),
    swapDaiToSai : sendTransaction(swapDaiToSai),
    swapDaiToSaiEstimateGas: estimateGas(swapDaiToSai),
    setOwner: sendTransaction(setOwner),
    setupMTProxy: sendTransaction(setupMTProxy),
    setupMTProxyEstimateGas: estimateGas(setupMTProxy),
    mtDraw: sendTransaction(mtDraw),
    mtDrawEstimateGas: estimateGas(mtDraw),
    mtFund: sendTransaction(mtFund),
    mtFundEstimateGas: estimateGas(mtFund),
    mtBuy: sendTransaction(mtBuy),
    mtBuyEstimateGas: estimateGas(mtBuy),
    mtSell: sendTransaction(mtSell),
    mtSellEstimateGas: estimateGas(mtSell),
    mtReallocate: sendTransaction(mtReallocate),
    mtReallocateEstimateGas: estimateGas(mtReallocate),
    makeLinearOffers: sendTransaction(makeLinearOffers),
    cancelAllOffers: sendTransaction(cancelAllOffers),
    mtRedeem: sendTransaction(mtRedeem),
  };
}

function readCalls([context, account]: [NetworkConfig, string | undefined]) {
  const call = callCurried(context, account);

  return {
    mtBalance: call(mtBalance),
    otcGetBuyAmount: call(getBuyAmount),
    otcGetPayAmount: call(getPayAmount),
    otcGetOffersAmount: call(getOffersAmount),
    otcGetBestOffer: call(getBestOffer),
    otcOffers: call(offers),
    osmParams: call(osmParams),
  };
}

export const calls$ = combineLatest(context$, initializedAccount$).pipe(
  map(calls),
);

export const readCalls$ = combineLatest(context$, account$).pipe(
  map(readCalls),
);

export type Calls$ = typeof calls$;

export type Calls = ObservableItem<Calls$>;

export type ReadCalls$ = typeof readCalls$;

export type ReadCalls = ObservableItem<ReadCalls$>;
