import { storiesOf } from '@storybook/react';
import { BigNumber } from 'bignumber.js';
import * as React from 'react';
import { of } from 'rxjs/index';
import { Calls$, ReadCalls$ } from '../../blockchain/calls/calls';
import { createFakeOrderbook, emptyOrderBook } from '../../exchange/depthChart/fakeOrderBook';
import { MTAccount } from '../state/mtAccount';
import { calculateMarginable } from '../state/mtCalculate';
import { getMarginableCore, getMTAccount } from '../state/mtTestUtils';
import { createMTSimpleOrderForm$,
  MTSimpleFormState, MTSimpleOrderFormParams } from './mtOrderForm';
import { MtSimpleOrderFormView } from './mtOrderFormView';
import {zero} from "../../utils/zero";
import {OfferType} from "../../exchange/orderbook/orderbook";

const stories = storiesOf('Leverage Trading/Order Form', module)
  .addDecorator(story => (
    <div style={{ width: '932px', background: '#ffffff' }}>
      {story()}
    </div>)
  );

const assetCore = {
  name: 'WETH',
  balance: new BigNumber(0.33888),
  walletBalance: new BigNumber(0),
  allowance: true,
  debt: new BigNumber(25.0249),
  dai: zero,
  minCollRatio: new BigNumber(1.5),
  safeCollRatio: new BigNumber(2),
};

const ethMarginableAsset = calculateMarginable(getMarginableCore({
  ...assetCore,
  referencePrice: new BigNumber(185.5),
  osmPriceNext: new BigNumber(150),
}));

const mta: MTAccount = getMTAccount({ marginableAssets: [ethMarginableAsset] });

const tradingPair = { base: 'WETH', quote: 'DAI' };

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
  buys: any = [], sells: any = [], _mta: MTAccount = mtaEmpty
) => {
  const orderbook = createFakeOrderbook(buys, sells);
  orderbook.buy.forEach((v, i) => v.offerId = new BigNumber(i + 1));
  orderbook.sell.forEach((v, i) => v.offerId = new BigNumber(i + 1));
  return createMTSimpleOrderForm$(
    {
      ...defParams,
      orderbook$: of(orderbook),
      mta$: of(_mta),
    } as MTSimpleOrderFormParams,
    tradingPair
  );
};

const sell_orders = [
    { price: 186, amount: 1 },
    { price: 200, amount: 3 },
    { price: 210, amount: 3 },
    { price: 220, amount: 4 },
];

const buy_orders = [
    { price: 183, amount: 1 },
    { price: 180, amount: 3 },
    { price: 170, amount: 3 },
    { price: 160, amount: 4 },
];

const controller = controllerWithFakeOrderBook(buy_orders, sell_orders, mta);

class DummyComponent extends React.Component<any> {

  public state = {
    state: {}
  };

  public componentDidMount() {
    controller.subscribe(state => {
      this.setState({ state });
    });
  }

  public render() {
    if (this.state.state) {
      console.log('@@STATE', this.state.state);
      return <MtSimpleOrderFormView
        {...(this.state.state as MTSimpleFormState)}
      />;
    }
    return <>loading</>;
  }
}

stories.add('Sell', () => {
  return <DummyComponent/>;
});
