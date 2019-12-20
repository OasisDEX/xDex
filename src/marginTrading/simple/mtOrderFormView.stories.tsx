import { storiesOf } from '@storybook/react';
import { BigNumber } from 'bignumber.js';
import * as React from 'react';
import { of } from 'rxjs/index';
import { first } from 'rxjs/internal/operators';
import { Calls$, ReadCalls$ } from '../../blockchain/calls/calls';
import { createFakeOrderbook, emptyOrderBook } from '../../exchange/depthChart/fakeOrderBook';
import { OfferType, Orderbook } from '../../exchange/orderbook/orderbook';
import { TradingPair } from '../../exchange/tradingPair/tradingPair';
import { connect } from '../../utils/connect';
import { FormChangeKind } from '../../utils/form';
import { zero } from '../../utils/zero';
import { MTAccount } from '../state/mtAccount';
import { calculateMarginable } from '../state/mtCalculate';
import { getMarginableCore, getMTAccount } from '../state/mtTestUtils';
import {
  createMTSimpleOrderForm$, MTSimpleOrderFormParams, MTSimpleFormState
} from './mtOrderForm';
import { MtSimpleOrderFormView } from './mtOrderFormView';

const stories = storiesOf('Leverage Trading/Order Form', module)
  .addDecorator(story => (
    <div style={{ width: '932px', background: '#ffffff' }}>
      {story()}
    </div>)
  );

const assetCore = {
  name: 'WETH',
  balance: new BigNumber(1),
  walletBalance: new BigNumber(0),
  allowance: true,
  debt: new BigNumber(123),
  dai: zero,
  minCollRatio: new BigNumber(1.5),
  safeCollRatio: new BigNumber(2),
};

const ethMarginableAsset = calculateMarginable(
  getMarginableCore({
    ...assetCore,
    referencePrice: new BigNumber(185.5),
    osmPriceNext: new BigNumber(150),
  }),
  { buy: [], sell: [], tradingPair: { base: '', quote: '' }, blockNumber: 0 } as Orderbook);

const mta: MTAccount = getMTAccount({ marginableAssets: [ethMarginableAsset] });

const defaultCalls = {
  mtBuyEstimateGas: () => of(20),
  mtSellEstimateGas: () => of(30),
} as any;

const defaultReadCalls = {
} as any;

const defaultUser = '0x1234';

const mtaEmpty: MTAccount = getMTAccount();

const defParams = {
  gasPrice$: of(new BigNumber(0.01)),
  etherPriceUsd$: of(new BigNumber(1)),
  orderbook$: of(emptyOrderBook),
  calls$: of(defaultCalls) as Calls$,
  readCalls$: of(defaultReadCalls) as ReadCalls$,
  dustLimits$: of({ DAI: new BigNumber(0.1), WETH: new BigNumber(0.1) }),
  account$: of(defaultUser),
  kind: OfferType.sell,
};

const controllerWithFakeOrderBook = (
  buys: any = [],
  sells: any = [],
  _mta: MTAccount = mtaEmpty,
  kind: OfferType,
  tradingPair: TradingPair
) => {
  const orderbook = createFakeOrderbook(buys, sells);
  orderbook.buy.forEach((v, i) => v.offerId = new BigNumber(i + 1));
  orderbook.sell.forEach((v, i) => v.offerId = new BigNumber(i + 1));
  return createMTSimpleOrderForm$(
    {
      ...defParams,
      orderbook$: of({ ...orderbook, tradingPair }),
      mta$: of(_mta),
    } as MTSimpleOrderFormParams,
    tradingPair,
    {
      kind,
    }
  );
};

const sell_orders = [
  { price: 186, amount: 1, baseToken: 'WETH', quoteToken: 'DAI' },
  { price: 200, amount: 3, baseToken: 'WETH', quoteToken: 'DAI' },
  { price: 210, amount: 3, baseToken: 'WETH', quoteToken: 'DAI' },
  { price: 220, amount: 4, baseToken: 'WETH', quoteToken: 'DAI' },
];

const buy_orders = [
  { price: 183, amount: 1, baseToken: 'WETH', quoteToken: 'DAI' },
  { price: 180, amount: 3, baseToken: 'WETH', quoteToken: 'DAI' },
  { price: 170, amount: 3, baseToken: 'WETH', quoteToken: 'DAI' },
  { price: 160, amount: 4, baseToken: 'WETH', quoteToken: 'DAI' },
];

stories.add('Sell', () => {
  const controller1 = controllerWithFakeOrderBook(
    buy_orders, sell_orders, mta, OfferType.sell, { base: 'WETH', quote: 'DAI' }
    );

  controller1.pipe(first()).subscribe(state => {
    state.change({ kind: FormChangeKind.amountFieldChange, value: new BigNumber('1') });
  });

  const Case1 = connect<MTSimpleFormState, {}>(MtSimpleOrderFormView, controller1);

  const controller2 = controllerWithFakeOrderBook(
    buy_orders, sell_orders, mta, OfferType.sell, { base: 'WETH', quote: 'DAI' }
  );

  controller2.pipe(first()).subscribe(state => {
    state.change({ kind: FormChangeKind.amountFieldChange, value: new BigNumber('0.4') });
  });

  const Case2 = connect<MTSimpleFormState, {}>(MtSimpleOrderFormView, controller2);

  return <>
    <Case1/>
    <Case2/>
  </>;
});
