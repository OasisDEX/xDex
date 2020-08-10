/*
 * Copyright (C) 2020 Maker Ecosystem Growth Holdings, INC.
 */

// import { storiesOf } from '@storybook/react';
// import { BigNumber } from 'bignumber.js';
// import * as React from 'react';
// import { of } from 'rxjs/index';
// import { first } from 'rxjs/internal/operators';
// import { Calls$, ReadCalls$ } from '../../blockchain/calls/calls';
// import { createFakeOrderbook, emptyOrderBook } from '../../exchange/depthChart/fakeOrderBook';
// import { OfferType, Orderbook } from '../../exchange/orderbook/orderbook';
// import { TradingPair } from '../../exchange/tradingPair/tradingPair';
// import { FormChangeKind } from '../../utils/form';
// import { zero } from '../../utils/zero';
// import { MTAccount } from '../state/mtAccount';
// import { calculateMarginable } from '../state/mtCalculate';
// import { getMarginableCore, getMTAccount } from '../state/mtTestUtils';
// import {
//   createMTSimpleOrderForm$, MTSimpleFormState, MTSimpleOrderFormParams
// } from './mtOrderForm';
// import { MtSimpleOrderFormView } from './mtOrderFormView';
//
// const stories = storiesOf('Multiply Trading/Order Form', module)
//   .addDecorator(story => (
//     <div style={{ width: '932px', background: '#ffffff' }}>
//       {story()}
//     </div>)
//   );
//
// const assetCore = {
//   name: 'WETH',
//   balance: new BigNumber(1),
//   walletBalance: new BigNumber(0),
//   allowance: true,
//   debt: new BigNumber(123),
//   dai: zero,
//   minCollRatio: new BigNumber(1.5),
//   safeCollRatio: new BigNumber(2),
// };
//
// const ethMarginableAsset = calculateMarginable(
//   getMarginableCore({
//     ...assetCore,
//     referencePrice: new BigNumber(185.5),
//     osmPriceNext: new BigNumber(150),
//   }),
//   { buy: [], sell: [], tradingPair: { base: '', quote: '' }, blockNumber: 0 } as Orderbook);
//
// const mta: MTAccount = getMTAccount({ marginableAssets: [ethMarginableAsset] });
//
// const defaultCalls = {
//   mtBuyEstimateGas: () => of(20),
//   mtSellEstimateGas: () => of(30),
// } as any;
//
// const defaultReadCalls = {
// } as any;
//
// const defaultUser = '0x1234';
//
// const mtaEmpty: MTAccount = getMTAccount();
//
// const defParams = {
//   gasPrice$: of(new BigNumber(0.01)),
//   etherPriceUsd$: of(new BigNumber(1)),
//   orderbook$: of(emptyOrderBook),
//   calls$: of(defaultCalls) as Calls$,
//   readCalls$: of(defaultReadCalls) as ReadCalls$,
//   dustLimits$: of({ DAI: new BigNumber(0.1), WETH: new BigNumber(0.1) }),
//   account$: of(defaultUser),
//   kind: OfferType.sell,
// };
//
// const controllerWithFakeOrderBook = (
//   buys: any = [],
//   sells: any = [],
//   _mta: MTAccount = mtaEmpty,
//   kind: OfferType,
//   tradingPair: TradingPair
// ) => {
//   const orderbook = createFakeOrderbook(buys, sells);
//   orderbook.buy.forEach((v, i) => v.offerId = new BigNumber(i + 1));
//   orderbook.sell.forEach((v, i) => v.offerId = new BigNumber(i + 1));
//   return createMTSimpleOrderForm$(
//     {
//       ...defParams,
//       orderbook$: of({ ...orderbook, tradingPair }),
//       mta$: of(_mta),
//     } as MTSimpleOrderFormParams,
//     tradingPair,
//     {
//       kind,
//     }
//   );
// };
//
// const sell_orders = [
//   { price: 186, amount: 1, baseToken: 'WETH', quoteToken: 'DAI' },
//   { price: 200, amount: 3, baseToken: 'WETH', quoteToken: 'DAI' },
//   { price: 210, amount: 3, baseToken: 'WETH', quoteToken: 'DAI' },
//   { price: 220, amount: 4, baseToken: 'WETH', quoteToken: 'DAI' },
// ];
//
// const buy_orders = [
//   { price: 183, amount: 1, baseToken: 'WETH', quoteToken: 'DAI' },
//   { price: 180, amount: 3, baseToken: 'WETH', quoteToken: 'DAI' },
//   { price: 170, amount: 3, baseToken: 'WETH', quoteToken: 'DAI' },
//   { price: 160, amount: 4, baseToken: 'WETH', quoteToken: 'DAI' },
// ];
//
// stories.add('Sell', () => {
//   const controller1 = controllerWithFakeOrderBook(
//     buy_orders, sell_orders, mta, OfferType.sell, { base: 'WETH', quote: 'DAI' }
//     );
//
//   controller1.pipe(first()).subscribe(state => {
//     state.change({ kind: FormChangeKind.amountFieldChange, value: new BigNumber('1') });
//   });
//
//   const Case1 = connect<MTSimpleFormState, {}>(MtSimpleOrderFormView, controller1);
//
//   const controller2 = controllerWithFakeOrderBook(
//     buy_orders, sell_orders, mta, OfferType.sell, { base: 'WETH', quote: 'DAI' }
//   );
//
//   controller2.pipe(first()).subscribe(state => {
//     state.change({ kind: FormChangeKind.amountFieldChange, value: new BigNumber('0.4') });
//   });
//
//   const Case2 = connect<MTSimpleFormState, {}>(MtSimpleOrderFormView, controller2);
//
//   return <>
//     <Case1/>
//     <Case2/>
//   </>;
// });
//
// const assetCore2 = {
//   name: 'WETH',
//   balance: new BigNumber(1),
//   walletBalance: new BigNumber(0),
//   allowance: true,
//   debt: new BigNumber(200),
//   dai: zero,
//   minCollRatio: new BigNumber(1.5),
//   safeCollRatio: new BigNumber(2),
// };
//
// const ethMarginableAsset2 = calculateMarginable(
//   getMarginableCore({
//     ...assetCore2,
//     referencePrice: new BigNumber(300),
//     osmPriceNext: new BigNumber(150),
//   }),
//   { buy: [], sell: [], tradingPair: { base: '', quote: '' }, blockNumber: 0 } as Orderbook);
//
// const mta2: MTAccount = getMTAccount({ marginableAssets: [ethMarginableAsset2] });
//
// const sell_orders2 = [
//   { price: 186, amount: 5, baseToken: 'WETH', quoteToken: 'DAI' },
// ];
//
// const buy_orders2 = [
//   { price: 290, amount: 5, baseToken: 'WETH', quoteToken: 'DAI' },
// ];
//
// stories.add('Sell - can\'t free collateral, not-sellable', () => {
//   const controller1 = controllerWithFakeOrderBook(
//     buy_orders2, sell_orders2, mta2, OfferType.sell, { base: 'WETH', quote: 'DAI' }
//     );
//
//   controller1.pipe(first()).subscribe(state => {
//     state.change({ kind: FormChangeKind.amountFieldChange, value: new BigNumber('1') });
//   });
//
//   const Case1 = connect<MTSimpleFormState, {}>(MtSimpleOrderFormView, controller1);
//
//   return <>
//     <div style={{ margin: '10px' }}>
//       Oracle price: 300 USD<br/>
//       Position is at liquidation price level (not being liquidated yet)<br/>
//       Cannot free any collateral. Position is unsellable.
//       <br/>
//     </div>
//     <Case1/>
//   </>;
// });
//
// const assetCore3 = {
//   name: 'WETH',
//   balance: new BigNumber(1),
//   walletBalance: new BigNumber(0),
//   allowance: true,
//   debt: new BigNumber(200),
//   dai: zero,
//   minCollRatio: new BigNumber(1.5),
//   safeCollRatio: new BigNumber(2),
// };
//
// const ethMarginableAsset3 = calculateMarginable(
//   getMarginableCore({
//     ...assetCore3,
//     referencePrice: new BigNumber(310),
//     osmPriceNext: new BigNumber(150),
//   }),
//   { buy: [], sell: [], tradingPair: { base: '', quote: '' }, blockNumber: 0 } as Orderbook);
//
// const mta3: MTAccount = getMTAccount({ marginableAssets: [ethMarginableAsset3] });
//
// const sell_orders3 = [
//   { price: 186, amount: 5, baseToken: 'WETH', quoteToken: 'DAI' },
// ];
//
// const buy_orders3 = [
//   { price: 190, amount: 5, baseToken: 'WETH', quoteToken: 'DAI' },
// ];
//
// stories.add('Sell - too many iterations, not-sellable', () => {
//   const controller1 = controllerWithFakeOrderBook(
//     buy_orders3, sell_orders3, mta3, OfferType.sell, { base: 'WETH', quote: 'DAI' }
//     );
//
//   controller1.pipe(first()).subscribe(state => {
//     state.change({ kind: FormChangeKind.amountFieldChange, value: new BigNumber('1') });
//   });
//
//   const Case1 = connect<MTSimpleFormState, {}>(MtSimpleOrderFormView, controller1);
//
//   return <>
//     <div style={{ margin: '10px' }}>
//       Oracle price: 310 USD<br/>
//       Orderbook price: 190 DAI<br/>
//       Can free some collateral, but selling it on market gives less collateral
//       for next iterations than at the beginning.<br/>
//       Only a part of the position possible to sell (max to sell: 0.212 WETH)
//       <br/>
//     </div>
//     <Case1/>
//   </>;
// });
//
// const assetCore4 = {
//   name: 'WETH',
//   balance: new BigNumber(0.41),
//   walletBalance: new BigNumber(0),
//   allowance: true,
//   debt: new BigNumber(31),
//   dai: zero,
//   minCollRatio: new BigNumber(1.5),
//   safeCollRatio: new BigNumber(2),
// };
//
// const ethMarginableAsset4 = calculateMarginable(
//   getMarginableCore({
//     ...assetCore4,
//     referencePrice: new BigNumber(150),
//     osmPriceNext: new BigNumber(100),
//   }),
//   { buy: [], sell: [], tradingPair: { base: '', quote: '' }, blockNumber: 0 } as Orderbook);
//
// const mta4: MTAccount = getMTAccount({ marginableAssets: [ethMarginableAsset4] });
//
// const sell_orders4 = [
//   { price: 100, amount: 5, baseToken: 'WETH', quoteToken: 'DAI' },
// ];
//
// const buy_orders4 = [
//   { price: 100, amount: 5, baseToken: 'WETH', quoteToken: 'DAI' },
// ];
//
// stories.add('Sell - can\'t jump dust', () => {
//   const controller1 = controllerWithFakeOrderBook(
//     buy_orders4, sell_orders4, mta4, OfferType.sell, { base: 'WETH', quote: 'DAI' }
//     );
//
//   controller1.pipe(first()).subscribe(state => {
//     state.change({ kind: FormChangeKind.amountFieldChange, value: new BigNumber('0.41') });
//   });
//
//   const Case1 = connect<MTSimpleFormState, {}>(MtSimpleOrderFormView, controller1);
//
//   return <>
//     <div style={{ margin: '10px' }}>
//       Oracle price: 150 USD<br/>
//       Cannot sell in iterations avoiding dust limit (20 DAI)<br/>
//       Only a part of the position possible to sell (max to sell: 0.21 WETH)
//     </div>
//     <Case1/>
//   </>;
// });
//
// const assetCore5 = {
//   name: 'WETH',
//   balance: new BigNumber(0.1),
//   walletBalance: new BigNumber(0),
//   allowance: true,
//   debt: new BigNumber(0),
//   dai: zero,
//   minCollRatio: new BigNumber(1.5),
//   safeCollRatio: new BigNumber(2),
// };
//
// const ethMarginableAsset5 = calculateMarginable(
//   getMarginableCore({
//     ...assetCore5,
//     referencePrice: new BigNumber(100),
//     osmPriceNext: new BigNumber(100),
//   }),
//   { buy: [], sell: [], tradingPair: { base: '', quote: '' }, blockNumber: 0 } as Orderbook);
//
// const mta5: MTAccount = getMTAccount({ marginableAssets: [ethMarginableAsset5] });
//
// const sell_orders5 = [
//   { price: 100, amount: 5, baseToken: 'WETH', quoteToken: 'DAI' },
// ];
//
// const buy_orders5 = [
//   { price: 100, amount: 5, baseToken: 'WETH', quoteToken: 'DAI' },
// ];
//
// stories.add('Buy - purchasing power not available - dust', () => {
//   const controller1 = controllerWithFakeOrderBook(
//     buy_orders5, sell_orders5, mta5, OfferType.sell, { base: 'WETH', quote: 'DAI' }
//     );
//
//   controller1.pipe(first()).subscribe(state => {
//     state.change({ kind: FormChangeKind.amountFieldChange, value: new BigNumber('0.41') });
//   });
//
//   const Case1 = connect<MTSimpleFormState, {}>(MtSimpleOrderFormView, controller1);
//
//   return <>
//     <div style={{ margin: '10px' }}>
//       Purchasing Power is 0 due to dust limit and particular market conditions.<br/>
//       Oracle price: 100 USD.<br/>
//       Purchasing power in this case is 20 DAI, <br/>
//       but using it debt is falling into dust limit,<br/>
//       so Purchasing Power is shown as 0, with "!" sign.<br/>
//       <br/>
//     </div>
//     <Case1/>
//   </>;
// });
