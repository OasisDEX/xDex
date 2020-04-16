import { BigNumber } from 'bignumber.js'
import { Offer, OfferType } from '../../exchange/orderbook/orderbook'
import { MarginableAssetCore } from '../state/mtAccount'
import { getMarginableCore } from '../state/mtTestUtils'
import { MTHistoryEventKind } from './mtAccount'
import { RawMTHistoryEvent } from './mtHistory'

export const weth2: MarginableAssetCore = getMarginableCore({
  name: 'WETH',
  referencePrice: new BigNumber('300'),
  minCollRatio: new BigNumber('1.5'),
  safeCollRatio: new BigNumber('2'),
  balance: new BigNumber('1'),
})

export const weth1dai100: MarginableAssetCore = getMarginableCore({
  name: 'WETH',
  referencePrice: new BigNumber('200'),
  minCollRatio: new BigNumber('1.5'),
  safeCollRatio: new BigNumber('2'),
  balance: new BigNumber('1'),
  dai: new BigNumber('100'),
})

export const dai100: MarginableAssetCore = getMarginableCore({
  name: 'WETH',
  referencePrice: new BigNumber('200'),
  minCollRatio: new BigNumber('1.5'),
  safeCollRatio: new BigNumber('2'),
  balance: new BigNumber('0'),
  dai: new BigNumber('100'),
})

export const sell1: Offer = {
  offerId: new BigNumber('1'),
  baseAmount: new BigNumber('1'),
  baseToken: 'WETH',
  quoteAmount: new BigNumber('300'),
  quoteToken: 'DAI',
  price: new BigNumber('300'),
  ownerId: '1',
  timestamp: new Date(),
  type: OfferType.sell,
}

export const sell2: Offer = {
  ...sell1,
  baseAmount: new BigNumber('1'),
  quoteAmount: new BigNumber('302'),
  price: new BigNumber('302'),
}

export const sell3: Offer = {
  ...sell1,
  baseAmount: new BigNumber('3'),
  quoteAmount: new BigNumber('915'),
  price: new BigNumber('305'),
}

export const sellOffers = [sell1, sell2, sell3]
export const sellOffersShort = [sell1]

export const rawHistoryBuy: RawMTHistoryEvent[] = [
  {
    timestamp: 1567693285,
    token: 'WETH',
    kind: MTHistoryEventKind.fundGem,
    amount: new BigNumber('1'),
    dAmount: new BigNumber(0),
    dDAIAmount: new BigNumber(0),
    price: new BigNumber(123),
  },
  {
    timestamp: 1567693285,
    token: 'WETH',
    kind: MTHistoryEventKind.fundDai,
    amount: new BigNumber('200'),
    dAmount: new BigNumber(0),
    dDAIAmount: new BigNumber(0),
    price: new BigNumber(123),
  },
  {
    timestamp: 1567693285,
    token: 'WETH',
    kind: MTHistoryEventKind.buyLev,
    amount: new BigNumber('1'),
    ddai: new BigNumber('0'),
    dgem: new BigNumber('0'),
    payAmount: new BigNumber('300'),
    dAmount: new BigNumber(0),
    dDAIAmount: new BigNumber(0),
    price: new BigNumber(123),
  },
]

export const rawHistoryBuySell: RawMTHistoryEvent[] = [
  {
    timestamp: 1567693285,
    token: 'WETH',
    kind: MTHistoryEventKind.fundGem,
    amount: new BigNumber('1'),
    dAmount: new BigNumber(0),
    dDAIAmount: new BigNumber(0),
    price: new BigNumber(123),
  },
  {
    timestamp: 1567693285,
    token: 'WETH',
    kind: MTHistoryEventKind.fundDai,
    amount: new BigNumber('200'),
    dAmount: new BigNumber(0),
    dDAIAmount: new BigNumber(0),
    price: new BigNumber(123),
  },
  {
    timestamp: 1567693285,
    token: 'WETH',
    kind: MTHistoryEventKind.buyLev,
    amount: new BigNumber('1'),
    ddai: new BigNumber('0'),
    dgem: new BigNumber('0'),
    payAmount: new BigNumber('300'),
    dAmount: new BigNumber(0),
    dDAIAmount: new BigNumber(0),
    price: new BigNumber(123),
  },
  {
    timestamp: 1567693285,
    token: 'WETH',
    kind: MTHistoryEventKind.sellLev,
    amount: new BigNumber('1'),
    ddai: new BigNumber('0'),
    dgem: new BigNumber('0'),
    payAmount: new BigNumber('250'),
    dAmount: new BigNumber(0),
    dDAIAmount: new BigNumber(0),
    price: new BigNumber(123),
  },
]
