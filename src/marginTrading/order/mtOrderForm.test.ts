import { BigNumber } from 'bignumber.js';
import { of } from 'rxjs';
import { Observable } from 'rxjs/index';
import { shareReplay } from 'rxjs/operators';

import { setupFakeWeb3ForTesting } from '../../blockchain/web3';
setupFakeWeb3ForTesting();

import { DustLimits } from '../../balances-nomt/balances';
import { Calls } from '../../blockchain/calls/calls';
import { createFakeOrderbook, fakeOrderBook } from '../../exchange/depthChart/fakeOrderBook';
import { OfferType } from '../../exchange/orderbook/orderbook';
import { FormChangeKind, GasEstimationStatus } from '../../utils/form';
import { isImpossible } from '../../utils/impossible';
import { unpack } from '../../utils/testHelpers';
import { CashAsset, findAsset, MarginableAsset } from '../state/mtAccount';
import { getMarginableCore, getMTAccount, getNotSetupMTAccount } from '../state/mtTestUtils';
import { createMTOrderForm$, FormStage, MessageKind, MTFormState } from './mtOrderForm';

const defaultDustLimit = {
  'W-ETH': new BigNumber(2),
  DAI: new BigNumber(3),
  MKR: new BigNumber(1),
} as DustLimits;

function createForm(props?: {}): Observable<MTFormState> {
  const params = {
    tradingPair: { base: 'MKR', quote: 'DAI' },
    gasPrice: of(new BigNumber(100)),
    etherPriceUsd: of(new BigNumber(13)),
    orderbook: of(fakeOrderBook),
    mta: of(getMTAccount(
      {
        marginableAssets: [getMarginableCore({
          name: 'MKR',
          balance: new BigNumber(30),
          // maxSafeLev = 1 when safeCollRatio = 2, 4 when safeCollRatio = 5/4 = 1.25
          safeCollRatio: new BigNumber(1.25),
          referencePrice: new BigNumber(10),
        }
      )]
      })
    ),
    calls: of({} as Calls),
    dustLimits: of(defaultDustLimit),
    ...props
  };
  return createMTOrderForm$(
    params.tradingPair,
    params.gasPrice,
    params.etherPriceUsd,
    params.orderbook,
    params.mta,
    params.calls,
    params.dustLimits
  ).pipe(
    shareReplay(1)
  );
}

test('initial state with empty mta', () => {
  const orderForm = createForm({
    mta: of(getMTAccount()),
  });
  expect(unpack(orderForm).baseToken).toEqual('MKR');
  expect(unpack(orderForm).quoteToken).toEqual('DAI');
  expect(unpack(orderForm).kind).toEqual(OfferType.buy);
  expect(unpack(orderForm).stage).toEqual(FormStage.editing);
  expect(unpack(orderForm).price).toBeUndefined();
  expect(unpack(orderForm).amount).toBeUndefined();
  expect(unpack(orderForm).total).toBeUndefined();
  expect(unpack(orderForm).messages).toEqual([]);
  expect(unpack(orderForm).dustLimitBase).toEqual(new BigNumber(1));
  expect(unpack(orderForm).dustLimitQuote).toEqual(new BigNumber(3));
  expect(unpack(orderForm).gasEstimationStatus).toEqual(GasEstimationStatus.unset);

  const baseAsset = findAsset('MKR', unpack(orderForm).mta);
  expect(baseAsset).toBeUndefined();

  const quoteAsset = findAsset('DAI', unpack(orderForm).mta) as CashAsset;
  expect(quoteAsset.balance).toEqual(new BigNumber(0));
});

test('initial state with not setup mta', () => {
  const orderForm = createForm({
    mta: of(getNotSetupMTAccount()),
  });
  expect(unpack(orderForm).baseToken).toEqual('MKR');
  expect(unpack(orderForm).quoteToken).toEqual('DAI');
  expect(unpack(orderForm).kind).toEqual(OfferType.buy);
  expect(unpack(orderForm).stage).toEqual(FormStage.editing);
  expect(unpack(orderForm).price).toBeUndefined();
  expect(unpack(orderForm).amount).toBeUndefined();
  expect(unpack(orderForm).total).toBeUndefined();
  expect(unpack(orderForm).messages).toEqual([]);
  expect(unpack(orderForm).dustLimitBase).toEqual(new BigNumber(1));
  expect(unpack(orderForm).dustLimitQuote).toEqual(new BigNumber(3));
  expect(unpack(orderForm).gasEstimationStatus).toEqual(GasEstimationStatus.unset);
});

test('initial state ', () => {
  const orderForm = createForm();

  expect(unpack(orderForm).baseToken).toEqual('MKR');
  expect(unpack(orderForm).quoteToken).toEqual('DAI');
  expect(unpack(orderForm).kind).toEqual(OfferType.buy);
  expect(unpack(orderForm).stage).toEqual(FormStage.editing);
  expect(unpack(orderForm).price).toBeUndefined();
  expect(unpack(orderForm).amount).toBeUndefined();
  expect(unpack(orderForm).total).toBeUndefined();
  expect(unpack(orderForm).messages).toEqual([]);
  expect(unpack(orderForm).dustLimitBase).toEqual(new BigNumber(1));
  expect(unpack(orderForm).dustLimitQuote).toEqual(new BigNumber(3));
  expect(unpack(orderForm).gasEstimationStatus).toEqual(GasEstimationStatus.unset);

  const baseAsset = findAsset('MKR', unpack(orderForm).mta) as MarginableAsset;
  expect(baseAsset.balance).toEqual(new BigNumber(30));
  expect(baseAsset.balanceInCash).toEqual(new BigNumber(300));
  expect(baseAsset.purchasingPower).toEqual(new BigNumber(300 * 4));

  const quoteAsset = findAsset('DAI', unpack(orderForm).mta) as CashAsset;
  expect(quoteAsset.balance).toEqual(new BigNumber(0));
});

test('buy, set amount', () => {
  const orderForm = createForm();
  const { change } = unpack(orderForm);

  const baseAsset = findAsset('MKR', unpack(orderForm).mta) as MarginableAsset;
  expect(baseAsset.purchasingPower).toEqual(new BigNumber(300 * 4));

  change({ kind: FormChangeKind.amountFieldChange, value: new BigNumber(0.5) });
  expect(unpack(orderForm).amount).toEqual(new BigNumber(0.5));
  expect(unpack(orderForm).price).toEqual(new BigNumber(263.005524)); // price from orderbook
  expect(unpack(orderForm).total).toEqual(new BigNumber(263.005524 * 0.5));
  expect(unpack(orderForm).messages).toEqual([]);
  expect(unpack(orderForm).stage).toEqual(FormStage.readyToAllocate);
  expect(isImpossible(unpack(orderForm).allocationRequest)).toBeFalsy();

});

test('sell, set amount', () => {
  const orderForm = createForm();
  const { change } = unpack(orderForm);

  change({ kind: FormChangeKind.kindChange, newKind: OfferType.sell });
  expect(unpack(orderForm).kind).toEqual(OfferType.sell);

  const baseAsset = findAsset('MKR', unpack(orderForm).mta) as MarginableAsset;
  expect(baseAsset.purchasingPower).toEqual(new BigNumber(300 * 4));

  change({ kind: FormChangeKind.amountFieldChange, value: new BigNumber(4) });
  expect(unpack(orderForm).amount).toEqual(new BigNumber(4));
  const price = new BigNumber(256.12524); // the biggest price from orderbook
  expect(unpack(orderForm).price).toEqual(price);
  expect(unpack(orderForm).total).toEqual(price.times(4));
  expect(unpack(orderForm).messages).toEqual([]);
  expect(unpack(orderForm).stage).toEqual(FormStage.readyToAllocate);
  expect(isImpossible(unpack(orderForm).allocationRequest)).toBeFalsy();
});

test('sell, reset form', () => {
  const orderForm = createForm();
  const { change } = unpack(orderForm);

  change({ kind: FormChangeKind.kindChange, newKind: OfferType.sell });
  expect(unpack(orderForm).kind).toEqual(OfferType.sell);

  change({ kind: FormChangeKind.amountFieldChange, value: new BigNumber(4) });
  expect(unpack(orderForm).amount).toEqual(new BigNumber(4));
  const price = new BigNumber(256.12524); // the biggest price from orderbook
  expect(unpack(orderForm).price).toEqual(price);
  expect(unpack(orderForm).total).toEqual(price.times(4));
  expect(isImpossible(unpack(orderForm).allocationRequest)).toBeFalsy();

  change({ kind: FormChangeKind.formResetChange });
  expect(unpack(orderForm).kind).toEqual(OfferType.sell);
  expect(unpack(orderForm).stage).toEqual(FormStage.editing);
  expect(unpack(orderForm).price).toBeUndefined();
  expect(unpack(orderForm).amount).toBeUndefined();
  expect(unpack(orderForm).total).toBeUndefined();
});

// ------------------------------------- setMax button --------------------------

test('buy, setMax on empty', () => {
  const orderForm = createForm();
  const { change } = unpack(orderForm);

  change({ kind: FormChangeKind.setMaxChange });

  expect(unpack(orderForm).amount).toBeUndefined();
  expect(unpack(orderForm).price).toBeUndefined();
  expect(unpack(orderForm).total).toBeUndefined();
});

test('sell, setMax on empty', () => {
  const orderForm = createForm();
  const { change } = unpack(orderForm);
  change({ kind: FormChangeKind.kindChange, newKind: OfferType.sell });
  const baseAsset = findAsset('MKR', unpack(orderForm).mta) as MarginableAsset;
  expect(baseAsset.balance).toEqual(new BigNumber(30));

  change({ kind: FormChangeKind.setMaxChange });

  const price = new BigNumber('256.12524');
  expect(unpack(orderForm).amount).toEqual(baseAsset.balance);
  expect(unpack(orderForm).price).toEqual(price);
  expect(unpack(orderForm).total).toEqual(baseAsset.balance.times(price));
});

test('sell, set max when state with empty mta', () => {
  const orderForm = createForm({
    mta: of(getMTAccount()),
  });
  const { change } = unpack(orderForm);
  change({ kind: FormChangeKind.kindChange, newKind: OfferType.sell });
  change({ kind: FormChangeKind.setMaxChange });

  expect(unpack(orderForm).amount).toEqual(new BigNumber(0));
  expect(unpack(orderForm).total).toEqual(new BigNumber(0));
});
//
// // ------------------------------------- validations --------------------------

test('validation - total - insufficient DAI', () => {
  const orderForm = createForm();
  const { change } = unpack(orderForm);

  change({ kind: FormChangeKind.amountFieldChange, value: new BigNumber(10) });

  expect(unpack(orderForm).messages).toContainEqual({
    kind: MessageKind.insufficientAmount,
    field: 'total',
    priority: 1,
    token: 'DAI',
  });
});

test('validation - incredible total DAI', () => {
  const orderForm = createForm({
    orderbook: of(createFakeOrderbook([], [
      { price: 1500000000000, amount: 100000000 },
    ])),
  });
  const { change } = unpack(orderForm);

  change({ kind: FormChangeKind.amountFieldChange, value: new BigNumber(100000) });

  expect(unpack(orderForm).messages).toContainEqual({
    kind: MessageKind.incredibleAmount,
    field: 'total',
    priority: 2,
    token: 'DAI',
  });
});

test('validation - incredible MKR amount', () => {
  const orderForm = createForm({
    orderbook: of(createFakeOrderbook([], [
      { price: 1500000000000, amount: 3000000000000000 },
    ])),
  });
  const { change } = unpack(orderForm);

  change({ kind: FormChangeKind.amountFieldChange, value: new BigNumber(1000000000000000 + 1) });

  expect(unpack(orderForm).messages).toContainEqual({
    kind: MessageKind.incredibleAmount,
    field: 'amount',
    priority: 1,
    token: 'MKR',
  });
});

test('validation - buy, dust limit for total', () => {
  const orderForm = createForm();
  const { change } = unpack(orderForm);
  const dustTotalMsg = {
    kind: MessageKind.dustAmount,
    field: 'total',
    priority: 2,
    token: 'DAI',
    amount: defaultDustLimit.DAI, // 3
  };

  change({ kind: FormChangeKind.amountFieldChange, value: new BigNumber(0.001) });
  expect(unpack(orderForm).messages).toContainEqual(dustTotalMsg);

  change({ kind: FormChangeKind.amountFieldChange, value: new BigNumber(3) });
  expect(unpack(orderForm).messages).not.toContainEqual(dustTotalMsg);

});

test('validation - buy, dust limit for total - price little above dust', () => {
  const dust = new BigNumber(1).plus(new BigNumber('1e-10'));
  const orderForm = createForm({
    orderbook: of(createFakeOrderbook([], [
      { price: dust.toNumber(), amount: 3000000000000000 },
    ])),
  });
  const dustTotalMsg = {
    kind: MessageKind.dustAmount,
    field: 'total',
    priority: 2,
    token: 'DAI',
    amount: defaultDustLimit.DAI, // 3
  };

  const { change } = unpack(orderForm);
  expect(unpack(orderForm).messages).not.toContainEqual(dustTotalMsg);

  change({ kind: FormChangeKind.amountFieldChange, value: new BigNumber(0.001) });
  expect(unpack(orderForm).price).toEqual(dust);
  expect(unpack(orderForm).messages).toContainEqual(dustTotalMsg);
});

test('validation - buy, dust limit for total - price little below dust', () => {
  const dust = new BigNumber(1).minus(new BigNumber('1e-10'));
  const orderForm = createForm({
    orderbook: of(createFakeOrderbook([], [
      { price: dust.toNumber(), amount: 3000000000000000 },
    ])),
  });
  const dustTotalMsg = {
    kind: MessageKind.dustAmount,
    field: 'total',
    priority: 2,
    token: 'DAI',
    amount: defaultDustLimit.DAI, // 3
  };

  const { change } = unpack(orderForm);
  expect(unpack(orderForm).messages).not.toContainEqual(dustTotalMsg);

  change({ kind: FormChangeKind.amountFieldChange, value: new BigNumber(0.001) });
  expect(unpack(orderForm).price).toEqual(dust);
  expect(unpack(orderForm).messages).toContainEqual(dustTotalMsg);
});

test('validation - sell, dust limit for amount', () => {
  const orderForm = createForm();
  const { change } = unpack(orderForm);
  change({ kind: FormChangeKind.kindChange, newKind: OfferType.sell });

  const dustAmountMsg = {
    kind: MessageKind.dustAmount,
    field: 'amount',
    priority: 2,
    token: 'MKR',
    amount: defaultDustLimit.MKR, // 1
  };

  change({ kind: FormChangeKind.amountFieldChange, value: new BigNumber(0.001) });
  expect(unpack(orderForm).messages).toContainEqual(dustAmountMsg);

  change({ kind: FormChangeKind.amountFieldChange, value: defaultDustLimit.MKR });
  expect(unpack(orderForm).messages).not.toContainEqual(dustAmountMsg);

  change({ kind: FormChangeKind.amountFieldChange,
    value: defaultDustLimit.MKR.plus(new BigNumber('1e-30')) });
  expect(unpack(orderForm).messages).not.toContainEqual(dustAmountMsg);

  change({ kind: FormChangeKind.amountFieldChange,
    value: defaultDustLimit.MKR.minus(new BigNumber('1e-30')) });
  expect(unpack(orderForm).messages).toContainEqual(dustAmountMsg);
});

test('validation - dust limit when dustLimits not given', () => {
  const orderForm = createForm({
    dustLimits: of({}),
  });
  const { change } = unpack(orderForm);

  change({ kind: FormChangeKind.amountFieldChange, value: new BigNumber('-1e-30') });

  const dustAmountError = {
    kind: MessageKind.dustAmount,
    field: 'total',
    priority: 2,
    token: 'DAI',
    amount: new BigNumber(0),
  };

  expect(unpack(orderForm).messages).toContainEqual(dustAmountError);

  change({ kind: FormChangeKind.amountFieldChange, value: new BigNumber('1e-30') });
  expect(unpack(orderForm).messages).not.toContainEqual(dustAmountError);
});

test('validation - total lower than 0', () => {
  const orderForm = createForm();
  const { change } = unpack(orderForm);

  change({ kind: FormChangeKind.amountFieldChange, value: new BigNumber(-2) });

  expect(unpack(orderForm).messages).toContainEqual({
    kind: MessageKind.dustTotal,
    field: 'total',
    priority: 1,
  });
});
