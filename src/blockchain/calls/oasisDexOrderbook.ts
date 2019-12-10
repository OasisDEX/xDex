import { BigNumber } from 'bignumber.js';
import { isEmpty, uniqBy, unzip } from 'lodash';
import { bindNodeCallback, combineLatest, Observable, of, zip } from 'rxjs';
import { expand, map, reduce, retryWhen, scan, shareReplay, switchMap } from 'rxjs/operators';
import { NetworkConfig } from '../../blockchain/config';
import { amountFromWei } from '../../blockchain/utils';
import {TradingPair} from '../../exchange/tradingPair/tradingPair';
import { zero } from '../../utils/zero';
import { markets, Oasis, OasisHelper } from './oasisDexCalls';

export enum OfferType {
  buy = 'buy',
  sell = 'sell',
}

export interface Offer {
  offerId: BigNumber;
  baseAmount: BigNumber;
  baseToken: string;
  quoteAmount: BigNumber;
  quoteToken: string;
  price: BigNumber;
  ownerId: string;
  timestamp: Date;
  type: OfferType;
}

export interface Orderbook {
  tradingPair: TradingPair;
  blockNumber: number;
  sell: Offer[];
  spread?: BigNumber;
  spreadPercentage?: BigNumber;
  buy: Offer[];
}

class InconsistentLoadingError extends Error {
}

function parseOffers(baseToken: string, quoteToken: string, type: OfferType, firstPage: boolean) {
  return (data: any[][]): { lastOfferId: BigNumber, offers: Offer[] } => {
    if (!firstPage && data[0][0].isZero()) {
      throw new InconsistentLoadingError('empty orderbook page loaded');
    }
    return {
      lastOfferId: data[0][data[0].length - 1] as BigNumber,
      offers: unzip(data)
        .filter(([id]) => !(id as BigNumber).eq(0))
        .map(([offerId, baseAmt, prc, ownerId]) => {

          const baseAmount = amountFromWei(baseAmt as BigNumber, 'WETH');
          const price = amountFromWei(prc as BigNumber, 'WETH');
          const quoteAmount = baseAmount.times(price);
          return {
            offerId,
            ownerId,
            type,
            price,
            baseAmount,
            quoteAmount,
            baseToken,
            quoteToken,
          } as Offer;
        })
    };
  };
}

function callGetOffers(
  context: NetworkConfig,
  baseToken: string,
  quoteToken: string,
  type: OfferType,
  offerId: BigNumber
) {
  return bindNodeCallback(
    OasisHelper.getOffers
  )(
    Oasis.address,
    markets[`WETH/DAI`], // ${baseToken}/${quoteToken}
    type === OfferType.buy,
    offerId.toFixed()
  );
}

function loadOffersAllAtOnce(
  context: NetworkConfig,
  baseToken: string,
  quoteToken: string,
  type: OfferType
): Observable<Offer[]> {
  return callGetOffers(context, baseToken, quoteToken, type, zero).pipe(
    map(parseOffers(baseToken, quoteToken, type, true)),
    expand(({ lastOfferId }) => lastOfferId.isZero() ?
      of() :
      callGetOffers(context, baseToken, quoteToken, type, lastOfferId).pipe(
        map(parseOffers(baseToken, quoteToken, type, false)),
      )
    ),
    retryWhen((errors) => errors.pipe(
      switchMap((e) => {
        if (e instanceof InconsistentLoadingError) {
          console.log(e.message);
          return errors;
        }
        throw e;
      }),
    )),
    reduce<{ offers: Offer[] }, Offer[]>((result, { offers }) => result.concat(offers), []),
    map(offers => uniqBy(offers, ({ offerId }) => offerId.toString())),
  );
}

export function loadOrderbook$(
  context$: Observable<NetworkConfig>,
  onEveryBlock$: Observable<number>,
  tradingPair: TradingPair
): Observable<Orderbook> {
  return combineLatest(context$, onEveryBlock$).pipe(
    switchMap(([context, blockNumber]) =>
      zip(
        loadOffersAllAtOnce(context, tradingPair.quote, tradingPair.base, OfferType.buy),
        loadOffersAllAtOnce(context, tradingPair.base, tradingPair.quote, OfferType.sell)
      ).pipe(
        map(([buy, sell]) => ({
          blockNumber,
          buy,
          sell
        })),
      )
    ),
    scan(
      ({ buy: prevBuy, sell: prevSell }, current) => ({ prevBuy, prevSell, ...current }),
      {
        blockNumber: 0,
        buy: [], sell: [],
        prevBuy: [] as Offer[], prevSell: [] as Offer[]
      }
    ),
    map(({ blockNumber, buy, sell, prevBuy, prevSell }) => ({
      blockNumber,
      buy: buy.length > 0 || buy.length === 0 && prevBuy.length === 0 ? buy : prevBuy,
      sell: sell.length > 0 || sell.length === 0 && prevSell.length === 0 ? sell : prevSell,
    })),
    map(({ blockNumber, buy, sell }) => {
      // console.log('corrected orderbook length for block:', blockNumber, buy.length, sell.length);

      return addSpread({
        tradingPair,
        blockNumber,
        buy,
        sell
      });
    }),
    shareReplay(1),
  );
}

export function addSpread({ buy, sell, ...rest }: Orderbook) {
  if (!isEmpty(sell) && !isEmpty(buy)) {
    const spread =  sell[0].price.minus(buy[0].price);
    const midPrice = sell[0].price.plus(buy[0].price).div(2);
    const spreadPercentage =  spread.div(midPrice);
    return {
      buy,
      sell,
      ...rest,
      spread,
      spreadPercentage
    };
  }
  return {
    buy,
    sell,
    ...rest,
  };
}
