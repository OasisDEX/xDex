import { BigNumber } from 'bignumber.js';
import { omit } from 'lodash';
import { of } from 'rxjs';
import { Calls$, ReadCalls$ } from '../../blockchain/calls/calls';
import { setupFakeWeb3ForTesting } from '../../blockchain/web3';
import { createFakeOrderbook, emptyOrderBook } from '../../exchange/depthChart/fakeOrderBook';
import { OfferType } from '../../exchange/orderbook/orderbook';
import { FormChangeKind, GasEstimationStatus } from '../../utils/form';
import { unpack } from '../../utils/testHelpers';
import { noCash, wethEmpty } from '../plan/planFixtures';
import { CashAssetCore, MTAccount } from '../state/mtAccount';
import { getMTAccount } from '../state/mtTestUtils';
import { createMTSimpleOrderForm$, MessageKind, MTSimpleOrderFormParams } from './mtOrderForm';
setupFakeWeb3ForTesting();

function snapshotify(object: any): any {
  return omit(object, ['change', 'timestamp']);
}

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
};

const controllerWithFakeOrderBook = (
  buys: any = [], sells: any = [], mta: MTAccount = mtaEmpty
) => {
  const orderbook = createFakeOrderbook(buys, sells);
  orderbook.buy.forEach((v, i) => v.offerId = new BigNumber(i + 1));
  orderbook.sell.forEach((v, i) => v.offerId = new BigNumber(i + 1));
  return createMTSimpleOrderForm$(
    {
      ...defParams,
      orderbook$: of(orderbook),
      mta$: of(mta),
    } as MTSimpleOrderFormParams,
    tradingPair
  );
};

test('initial state', done => {
  // const controller = createMTSimpleOrderForm$(defParams, tradingPair);
  const sells = [
    { price: 1.3, amount: 3 }, // 1
    { price: 2, amount: 3 }, // 2
    { price: 4, amount: 3 }, // 3
    { price: 5, amount: 4 }, // 4
  ];
  const controller = controllerWithFakeOrderBook([], sells);
  controller.subscribe(state => {
    expect(snapshotify(state)).toMatchSnapshot();
    done();
  });
});

test('set price and amount', () => {
  const sells = [
    { price: 1.3, amount: 3 }, // 1
    { price: 2, amount: 3 }, // 2
    { price: 4, amount: 3 }, // 3
    { price: 5, amount: 4 }, // 4
  ];
  const controller = controllerWithFakeOrderBook([], sells);
  const { change } = unpack(controller);

  change({ kind: FormChangeKind.amountFieldChange, value: new BigNumber(1) });

  expect(unpack(controller).amount).toEqual(new BigNumber(1));
  expect(unpack(controller).price).toEqual(new BigNumber(1.3));
  expect(unpack(controller).total).toEqual(new BigNumber(1.3));
  expect(unpack(controller).gasEstimationStatus).toEqual(GasEstimationStatus.unset);
  expect(snapshotify(unpack(controller))).toMatchSnapshot();
});

test('calculate position in order book for buy', () => {
  const buys = [
    { price: 5, amount: 3 }, // 1
    { price: 4, amount: 3 }, // 2
    { price: 2.5, amount: 3 }, // 3
    { price: 2, amount: 4 }, // 4
    { price: 1, amount: 4 }, // 5
  ];
  const  controller = controllerWithFakeOrderBook(buys);
  expect(unpack(controller).amount).toBeUndefined();
  expect(unpack(controller).total).toBeUndefined();

  // change({ kind: FormChangeKind.amountFieldChange, value: new BigNumber(2) });
  // expect(unpack(controller).position).toBeUndefined();
});

test('calculate undefined position in empty order book for buy', () => {
  const controller = controllerWithFakeOrderBook();
  const { change } = unpack(controller);

  change({ kind: FormChangeKind.amountFieldChange, value: new BigNumber(2) });
  expect(unpack(controller).price).toBeUndefined();
  expect(unpack(controller).total).toBeUndefined();
});

test('calculate position in orderbook for sell', () => {
  const sells = [
    { price: 1.3, amount: 3 }, // 1
    { price: 2, amount: 3 }, // 2
    { price: 4, amount: 3 }, // 3
    { price: 5, amount: 4 }, // 4
  ];

  const controller = controllerWithFakeOrderBook(sells);
  const { change } = unpack(controller);

  change({ kind: FormChangeKind.kindChange, newKind: OfferType.sell });
  expect(unpack(controller).kind).toEqual(OfferType.sell);
  expect(unpack(controller).amount).toBeUndefined();

  change({ kind: FormChangeKind.amountFieldChange, value: new BigNumber(3.5) });
  expect(unpack(controller).price).toEqual(new BigNumber(1.4));
  expect(unpack(controller).total).toEqual(new BigNumber(4.9));
});

test('buy with leverage - match exactly one order', () => {
  const cash: CashAssetCore = {
    ...noCash,
  };
  const weth = {
    ...wethEmpty,
    referencePrice: new BigNumber(1),
    balance: new BigNumber(0),
    debt: new BigNumber(0),
    dai: new BigNumber(1)
  };

  const mta: MTAccount = getMTAccount({ cash, marginableAssets: [weth] });

  const sells = [
    { price: 1, amount: 1 }, // 1
    { price: 1, amount: 1 }, // 1
    { price: 1.2, amount: 1 }, // 1
  ];

  const controller = controllerWithFakeOrderBook([], sells, mta);
  const { change } = unpack(controller);

  expect(unpack(controller).realPurchasingPower).toEqual(new BigNumber(1.984375));
  change({ kind: FormChangeKind.amountFieldChange, value: new BigNumber(1) });

  expect(unpack(controller).readyToProceed).toEqual(true);
  expect(unpack(controller).realPurchasingPowerPost).toEqual(new BigNumber(0.984375));
});

test('buy with leverage - match more than one order', () => {
  const weth = {
    ...wethEmpty,
    referencePrice: new BigNumber(1),
    balance: new BigNumber(2),
    debt: new BigNumber(0)
  };

  const mta: MTAccount = getMTAccount({ marginableAssets: [weth] });

  const sells = [
    { price: 1, amount: 1 }, // 1
    { price: 1.1, amount: 1 }, // 1
    { price: 1.2, amount: 1 }, // 1

  ];

  const controller = controllerWithFakeOrderBook([], sells, mta);
  const { change } = unpack(controller);

  change({ kind: FormChangeKind.amountFieldChange, value: new BigNumber(1.5) });

  expect(unpack(controller).readyToProceed).toEqual(true);
  // expect(unpack(controller).realPurchasingPowerPost).toEqual(new BigNumber(0.484375));
});

test('buy with leverage - purchasing power too low', () => {
  const weth = {
    ...wethEmpty,
    referencePrice: new BigNumber('1'),
    balance: new BigNumber('2'),
    debt: new BigNumber('0')
  };
  const mta: MTAccount = getMTAccount({ marginableAssets: [weth] });
  const sells = [
    { price: 1, amount: 10 }
  ];

  const controller = controllerWithFakeOrderBook([], sells, mta);
  const { change } = unpack(controller);

  expect(unpack(controller).realPurchasingPower).toEqual(new BigNumber(1.984375));
  change({ kind: FormChangeKind.amountFieldChange, value: new BigNumber(3) });
  expect(unpack(controller).messages[0].kind).toEqual(MessageKind.impossibleToPlan);
  expect(unpack(controller).messages[0].message).toEqual('purchasing power too low');
});

test('buy with leverage - orderbook too shallow', () => {
  const weth = {
    ...wethEmpty,
    referencePrice: new BigNumber('1'),
    balance: new BigNumber('20'),
    debt: new BigNumber('0')
  };
  const mta: MTAccount = getMTAccount({ marginableAssets: [weth] });
  const sells = [
    { price: 1, amount: 10 }
  ];

  const controller = controllerWithFakeOrderBook([], sells, mta);
  const { change } = unpack(controller);

  change({ kind: FormChangeKind.amountFieldChange, value: new BigNumber(15) });
  expect(unpack(controller).messages[0].kind).toEqual(MessageKind.impossibleCalculateTotal);
  expect(unpack(controller).messages[0].message).toEqual('orderbook too shallow');
});

test('buy with leverage - collateral and cash', () => {
  const weth = {
    ...wethEmpty,
    referencePrice: new BigNumber(1),
    balance: new BigNumber(5),
    debt: new BigNumber(0),
    dai: new BigNumber(5),
  };
  const mta: MTAccount = getMTAccount({ marginableAssets: [weth] });
  const sells = [
    { price: 1, amount: 20 }
  ];

  const controller = controllerWithFakeOrderBook([], sells, mta);
  const { change } = unpack(controller);

  expect(unpack(controller).leverage).toEqual(new BigNumber(1));
  change({ kind: FormChangeKind.amountFieldChange, value: new BigNumber(14.98) });
  expect(unpack(controller).leveragePost).toEqual(new BigNumber(1.998));
});

test('buy with leverage - cash only', () => {
  const weth = {
    ...wethEmpty,
    referencePrice: new BigNumber(1),
    balance: new BigNumber(0),
    debt: new BigNumber(0),
    dai: new BigNumber(10),
  };
  const mta: MTAccount = getMTAccount({ marginableAssets: [weth] });
  const sells = [
    { price: 1, amount: 20 }
  ];

  const controller = controllerWithFakeOrderBook([], sells, mta);
  const { change } = unpack(controller);

  change({ kind: FormChangeKind.amountFieldChange, value: new BigNumber(15) });
  expect(unpack(controller).leveragePost).toEqual(new BigNumber(1.5));
});
