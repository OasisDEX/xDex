/*
 * Copyright (C) 2020 Maker Ecosystem Growth Holdings, INC.
 */

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
import { createMTSimpleOrderForm$, ExternalChangeKind, MessageKind, MTSimpleOrderFormParams } from './mtOrderForm';
setupFakeWeb3ForTesting();

function snapshotify(object: any): any {
  return omit(object, ['change', 'timestamp']);
}

const tradingPair = { base: 'WETH', quote: 'DAI' };

const defaultCalls = {
  mtBuyEstimateGas: () => of(20),
  mtSellEstimateGas: () => of(30),
} as any;

const defaultReadCalls = {} as any;

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
  riskComplianceCheck$: of(true),
};

const controllerWithFakeOrderBook = (buys: any = [], sells: any = [], mta: MTAccount = mtaEmpty) => {
  const orderbook = createFakeOrderbook(buys, sells);
  orderbook.buy.forEach((v, i) => (v.offerId = new BigNumber(i + 1)));
  orderbook.sell.forEach((v, i) => (v.offerId = new BigNumber(i + 1)));
  return createMTSimpleOrderForm$(
    {
      ...defParams,
      orderbook$: of(orderbook),
      mta$: of(mta),
    } as MTSimpleOrderFormParams,
    tradingPair,
  );
};

test('initial state', (done) => {
  // const controller = createMTSimpleOrderForm$(defParams, tradingPair);
  const sells = [
    { price: 1, amount: 3 }, // 1
    { price: 2, amount: 3 }, // 2
    { price: 4, amount: 3 }, // 3
    { price: 5, amount: 4 }, // 4
  ];
  const controller = controllerWithFakeOrderBook([], sells);
  controller.subscribe((state) => {
    expect(snapshotify(state)).toMatchSnapshot();
    done();
  });
});

test('set price and amount', () => {
  const sells = [
    { price: 1, amount: 3 }, // 1
    { price: 2, amount: 3 }, // 2
    { price: 4, amount: 3 }, // 3
    { price: 5, amount: 4 }, // 4
  ];
  const controller = controllerWithFakeOrderBook([], sells);
  const { change } = unpack(controller);

  change({ kind: FormChangeKind.amountFieldChange, value: new BigNumber(1) });
  change({
    kind: ExternalChangeKind.riskCompliance,
    hasRiskAccepted: true,
  });

  expect(unpack(controller).amount).toEqual(new BigNumber(1));
  expect(unpack(controller).price).toEqual(new BigNumber(1));
  expect(unpack(controller).total).toEqual(new BigNumber(1));
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
  const controller = controllerWithFakeOrderBook(buys);
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
    { price: 1, amount: 3 }, // 1
    { price: 2, amount: 3 }, // 2
    { price: 4, amount: 3 }, // 3
    { price: 5, amount: 4 }, // 4
  ];

  const controller = controllerWithFakeOrderBook(sells);
  const { change } = unpack(controller);

  change({ kind: FormChangeKind.kindChange, newKind: OfferType.sell });
  expect(unpack(controller).kind).toEqual(OfferType.sell);
  expect(unpack(controller).amount).toBeUndefined();

  change({ kind: FormChangeKind.amountFieldChange, value: new BigNumber(3) });
  expect(unpack(controller).price).toEqual(new BigNumber(1));
  expect(unpack(controller).total).toEqual(new BigNumber(3));
});

test('buy with multiple - match exactly one order', () => {
  const cash: CashAssetCore = {
    ...noCash,
  };
  const weth = {
    ...wethEmpty,
    referencePrice: new BigNumber(1),
    balance: new BigNumber(0),
    debt: new BigNumber(0),
    dai: new BigNumber(100),
  };

  const mta: MTAccount = getMTAccount({ cash, marginableAssets: [weth] });

  const sells = [
    { price: 1, amount: 100 }, // 1
    { price: 1, amount: 100 }, // 1
    { price: 1.2, amount: 0 }, // 1
  ];

  const controller = controllerWithFakeOrderBook([], sells, mta);
  const { change } = unpack(controller);

  expect(unpack(controller).realPurchasingPower).toEqual(new BigNumber(199.98779296875));
  change({ kind: FormChangeKind.amountFieldChange, value: new BigNumber(20) });
  change({
    kind: ExternalChangeKind.riskCompliance,
    hasRiskAccepted: true,
  });
  expect(unpack(controller).readyToProceed).toEqual(true);
  expect(unpack(controller).realPurchasingPowerPost).toEqual(new BigNumber(179.98779296875));
});

test('buy with multiple - match more than one order', () => {
  const weth = {
    ...wethEmpty,
    referencePrice: new BigNumber(10),
    balance: new BigNumber(30),
    debt: new BigNumber(0),
  };

  const mta: MTAccount = getMTAccount({ marginableAssets: [weth] });

  const sells = [
    { price: 10, amount: 100 }, // 1
    { price: 11, amount: 100 }, // 1
    { price: 12, amount: 100 }, // 1
  ];

  const controller = controllerWithFakeOrderBook([], sells, mta);
  const { change } = unpack(controller);

  change({ kind: FormChangeKind.amountFieldChange, value: new BigNumber(2.5) });

  const s = unpack(controller);
  expect(s.readyToProceed).toEqual(true);
  expect(s.realPurchasingPowerPost.toFixed(0)).toEqual(new BigNumber('275').toFixed());
});

test('buy with multiple - purchasing power too low', () => {
  const weth = {
    ...wethEmpty,
    referencePrice: new BigNumber('100'),
    balance: new BigNumber('2'),
    debt: new BigNumber('0'),
  };
  const mta: MTAccount = getMTAccount({ marginableAssets: [weth] });
  const sells = [{ price: 100, amount: 100 }];

  const controller = controllerWithFakeOrderBook([], sells, mta);
  const { change } = unpack(controller);

  expect(unpack(controller).realPurchasingPower).toEqual(new BigNumber(199.98779296875));
  change({ kind: FormChangeKind.amountFieldChange, value: new BigNumber(30) });
  expect(unpack(controller).messages[0].kind).toEqual(MessageKind.insufficientAmount);
});

test('buy with multiple - orderbook too shallow', () => {
  const weth = {
    ...wethEmpty,
    referencePrice: new BigNumber('1'),
    balance: new BigNumber('20'),
    debt: new BigNumber('0'),
  };
  const mta: MTAccount = getMTAccount({ marginableAssets: [weth] });
  const sells = [{ price: 1, amount: 10 }];

  const controller = controllerWithFakeOrderBook([], sells, mta);
  const { change } = unpack(controller);

  change({ kind: FormChangeKind.amountFieldChange, value: new BigNumber(15) });
  expect(unpack(controller).messages[0].kind).toEqual(MessageKind.impossibleCalculateTotal);
  expect(unpack(controller).messages[0].message).toEqual('orderbook too shallow');
});

test('buy with multiple - collateral and cash', () => {
  const weth = {
    ...wethEmpty,
    referencePrice: new BigNumber(100),
    balance: new BigNumber(15),
    debt: new BigNumber(0),
    dai: new BigNumber(500),
  };
  const mta: MTAccount = getMTAccount({ marginableAssets: [weth] });
  const sells = [{ price: 100, amount: 20 }];

  const controller = controllerWithFakeOrderBook([], sells, mta);
  const { change } = unpack(controller);

  expect(unpack(controller).multiple).toEqual(new BigNumber(1));
  change({ kind: FormChangeKind.amountFieldChange, value: new BigNumber(14.98) });
  expect(unpack(controller).multiplePost).toEqual(new BigNumber(1.499));
});

test('buy with multiple - cash only', () => {
  const weth = {
    ...wethEmpty,
    referencePrice: new BigNumber(100),
    balance: new BigNumber(0),
    debt: new BigNumber(0),
    dai: new BigNumber(1000),
  };
  const mta: MTAccount = getMTAccount({ marginableAssets: [weth] });
  const sells = [{ price: 100, amount: 20 }];

  const controller = controllerWithFakeOrderBook([], sells, mta);
  const { change } = unpack(controller);

  change({ kind: FormChangeKind.amountFieldChange, value: new BigNumber(15) });
  expect(unpack(controller).multiplePost).toEqual(new BigNumber(1.5));
});

test('buy with multiple - add more to actual debt', () => {
  const weth = {
    ...wethEmpty,
    referencePrice: new BigNumber(100),
    balance: new BigNumber(10),
    debt: new BigNumber(200),
    dai: new BigNumber(10).div(10e18),
  };
  const mta: MTAccount = getMTAccount({ marginableAssets: [weth] });
  const sells = [{ price: 100, amount: 20 }];

  const controller = controllerWithFakeOrderBook([], sells, mta);
  const { change } = unpack(controller);

  change({ kind: FormChangeKind.amountFieldChange, value: new BigNumber(5) });

  expect(unpack(controller).multiplePost).toEqual(new BigNumber(1.875));
});

// Below happens with the current OTC contract. Dusty amount of dai may rest in urn after
// an OTC transaction during buyMultiple/sellMultiple procedure.
test('buy with multiple - with debt and dusty dai balance (edge case)', () => {
  const weth = {
    ...wethEmpty,
    referencePrice: new BigNumber(100),
    balance: new BigNumber(10),
    debt: new BigNumber(200),
    dai: new BigNumber(10).div(10e18),
  };
  const mta: MTAccount = getMTAccount({ marginableAssets: [weth] });
  const sells = [{ price: 100, amount: 20 }];

  const controller = controllerWithFakeOrderBook([], sells, mta);
  const { change } = unpack(controller);

  change({ kind: FormChangeKind.amountFieldChange, value: new BigNumber(5) });

  expect(unpack(controller).multiplePost).toEqual(new BigNumber(1.875));
});

test('sell multiple - partial debt repayment', () => {
  const weth = {
    ...wethEmpty,
    referencePrice: new BigNumber(100),
    balance: new BigNumber(10),
    debt: new BigNumber(200),
    dai: new BigNumber(0),
  };
  const mta: MTAccount = getMTAccount({ marginableAssets: [weth] });
  const buys = [{ price: 100, amount: 200 }];

  const controller = controllerWithFakeOrderBook(buys, [], mta);
  const { change } = unpack(controller);

  change({ kind: FormChangeKind.kindChange, newKind: OfferType.sell });
  change({ kind: FormChangeKind.amountFieldChange, value: new BigNumber(1) });

  expect(unpack(controller).multiplePost).toEqual(new BigNumber(1.125));
  expect(unpack(controller).daiBalancePost).toEqual(new BigNumber(-100));
});

test('sell multiple - full debt repayment', () => {
  const weth = {
    ...wethEmpty,
    referencePrice: new BigNumber(100),
    balance: new BigNumber(10),
    debt: new BigNumber(200),
    dai: new BigNumber(0),
  };
  const mta: MTAccount = getMTAccount({ marginableAssets: [weth] });
  const buys = [{ price: 100, amount: 200 }];

  const controller = controllerWithFakeOrderBook(buys, [], mta);
  const { change } = unpack(controller);

  change({ kind: FormChangeKind.kindChange, newKind: OfferType.sell });
  change({ kind: FormChangeKind.amountFieldChange, value: new BigNumber(2) });

  expect(unpack(controller).multiplePost).toEqual(new BigNumber(1));
  expect(unpack(controller).daiBalancePost).toEqual(new BigNumber(0));
});

test('sell without multiple', () => {
  const weth = {
    ...wethEmpty,
    referencePrice: new BigNumber(100),
    balance: new BigNumber(10),
    debt: new BigNumber(0),
    dai: new BigNumber(0),
  };
  const mta: MTAccount = getMTAccount({ marginableAssets: [weth] });
  const buys = [{ price: 100, amount: 200 }];

  const controller = controllerWithFakeOrderBook(buys, [], mta);
  const { change } = unpack(controller);

  change({ kind: FormChangeKind.kindChange, newKind: OfferType.sell });
  change({ kind: FormChangeKind.amountFieldChange, value: new BigNumber(2) });

  expect(unpack(controller).multiplePost).toEqual(new BigNumber(1));
  expect(unpack(controller).daiBalancePost).toEqual(new BigNumber(200));
});
