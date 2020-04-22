import { BigNumber } from 'bignumber.js'
import { Offer, OfferType } from '../../exchange/orderbook/orderbook'
import { zero } from '../../utils/zero'
import {
  CashAssetCore,
  MarginableAssetCore,
  MTAccount,
  // NonMarginableAssetCore
} from '../state/mtAccount'
import {
  getCashCore,
  getMarginableCore,
  getMTAccount,
  // getNonMarginableCore
} from '../state/mtTestUtils'

export const noCash: CashAssetCore = getCashCore({
  name: 'DAI',
  balance: zero,
  walletBalance: zero,
})

export const cash: CashAssetCore = {
  ...noCash,
  balance: new BigNumber('30000'),
}

export const wethEmpty: MarginableAssetCore = getMarginableCore({
  name: 'WETH',
  referencePrice: new BigNumber('200'),
  minCollRatio: new BigNumber('1.5'),
  safeCollRatio: new BigNumber('2'),
})

export const wethEmptyWithDai: MarginableAssetCore = getMarginableCore({
  name: 'WETH',
  referencePrice: new BigNumber('200'),
  minCollRatio: new BigNumber('1.5'),
  safeCollRatio: new BigNumber('2'),
  dai: new BigNumber(30000),
})

export const weth100: MarginableAssetCore = getMarginableCore({
  name: 'WETH',
  referencePrice: new BigNumber('200'),
  minCollRatio: new BigNumber('1.5'),
  safeCollRatio: new BigNumber('2'),
  balance: new BigNumber('100'),
})

// export const mkrEmpty: NonMarginableAssetCore = getNonMarginableCore({
//   name: 'MKR',
//   referencePrice: new BigNumber('200'),
// });
//
// export const mkr100: NonMarginableAssetCore = getNonMarginableCore({
//   ...mkrEmpty,
//   balance: new BigNumber('100'),
// });

export const dgx: MarginableAssetCore = getMarginableCore({
  name: 'DGX',
  referencePrice: new BigNumber('50'),
  minCollRatio: new BigNumber('1.1'),
  safeCollRatio: new BigNumber('1.2'),
})

export const dgx100 = {
  ...dgx,
  balance: new BigNumber('100'),
}

export const mtaOnlyWeth: MTAccount = getMTAccount({ cash, marginableAssets: [wethEmpty] })

export const sell1: Offer = {
  offerId: new BigNumber('1'),
  baseAmount: new BigNumber('100'),
  baseToken: 'WETH',
  quoteAmount: new BigNumber('20000'),
  quoteToken: 'DAI',
  price: new BigNumber('200'),
  ownerId: 'koko',
  timestamp: new Date(),
  type: OfferType.sell,
}

export const sell2: Offer = {
  ...sell1,
  baseAmount: new BigNumber('100'),
  quoteAmount: new BigNumber('20100'),
  price: new BigNumber('201'),
}

export const sell3: Offer = {
  ...sell1,
  baseAmount: new BigNumber('100'),
  quoteAmount: new BigNumber('20200'),
  price: new BigNumber('202'),
}

export const sellOffers = [sell1, sell2, sell3]
