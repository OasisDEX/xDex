import { BigNumber } from 'bignumber.js';

import { AssetKind } from '../../blockchain/config';
import {
  CashAssetCore,
  MarginableAssetCore,
  MTAccount,
  NonMarginableAssetCore
} from './mtAccount';
import { calculateMTAccount } from './mtCalculate';

export function getCashCore(props?: Partial<CashAssetCore>): CashAssetCore {
  return {
    name: 'DAI',
    balance: new BigNumber(0),
    walletBalance: new BigNumber(0),
    marginBalance: new BigNumber(0),
    allowance: true,
    assetKind: AssetKind.cash,
    ...props,
  } as CashAssetCore;
}

export function getMarginableCore(props?: Partial<MarginableAssetCore>): MarginableAssetCore {
  const date = new Date();
  date.setHours(date.getHours() + 1);
  return {
    name: 'WETH',
    balance: new BigNumber(0),
    urnBalance: new BigNumber(0),
    walletBalance: new BigNumber(0),
    marginBalance: new BigNumber(0),
    allowance: true,
    assetKind: AssetKind.marginable,
    debt: new BigNumber(0),
    dai: new BigNumber(0),
    referencePrice: new BigNumber(0),
    minCollRatio: new BigNumber(0),
    safeCollRatio: new BigNumber(0),
    rawHistory: [],
    fee: new BigNumber(1),
    urn: '',
    zzz: date,
    redeemable: new BigNumber(0),
    osmPriceNext: props && props.referencePrice ? props.referencePrice.minus(10) : new BigNumber(0),
    ...props
  };
}

export function getNonMarginableCore(
  props?: Partial<NonMarginableAssetCore>
): NonMarginableAssetCore {
  return {
    name: 'MKR',
    balance: new BigNumber(0),
    walletBalance: new BigNumber(0),
    marginBalance: new BigNumber(0),
    allowance: true,
    assetKind: AssetKind.nonMarginable,
    referencePrice: new BigNumber(0),
    rawHistory: [],
    ...props
  };
}

export function getMTAccount(props: {
  cash?: Partial<CashAssetCore>;
  marginableAssets?: Array<Partial<MarginableAssetCore>>;
  nonMarginableAssets?: Array<Partial<NonMarginableAssetCore>>;
} = {}): MTAccount {
  return calculateMTAccount(
    {
      address: ''
    },
    props.cash ? getCashCore(props.cash) : getCashCore(),
    props.marginableAssets ? props.marginableAssets.map(getMarginableCore) : [],
    props.nonMarginableAssets ? props.nonMarginableAssets.map(getNonMarginableCore) : []
  );
}
