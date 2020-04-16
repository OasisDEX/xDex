import { BigNumber } from 'bignumber.js';
import { at, isEmpty, uniqBy, unzip } from 'lodash';
import { combineLatest, from, Observable, of, zip } from 'rxjs';
import { expand, map, reduce, retryWhen, scan, shareReplay, switchMap } from 'rxjs/operators';
import { NetworkConfig } from '../../blockchain/config';
import { amountFromWei } from '../../blockchain/utils';
import { TradingPair } from '../tradingPair/tradingPair';

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

class InconsistentLoadingError extends Error {}

function parseOffers(sellToken: string, buyToken: string, type: OfferType, firstPage: boolean) {
  return (data: any[][]): { lastOfferId: BigNumber; offers: Offer[] } => {
    if (!firstPage && data[0][0] === '0') {
      throw new InconsistentLoadingError('empty orderbook page loaded');
    }
    return {
      lastOfferId: new BigNumber(data[0][data[0].length - 1]),
      offers: unzip(at(data, 'ids', 'payAmts', 'buyAmts', 'owners', 'timestamps'))
        .filter(([id]) => id !== '0')
        .map(([offerId, sellAmt, buyAmt, ownerId, timestamp]) => {
          const sellAmount = amountFromWei(new BigNumber(sellAmt), sellToken);
          const buyAmount = amountFromWei(new BigNumber(buyAmt), buyToken);
          return {
            ...(type === 'sell'
              ? {
                  price: buyAmount.div(sellAmount),
                  baseAmount: sellAmount,
                  baseToken: sellToken,
                  quoteAmount: buyAmount,
                  quoteToken: buyToken,
                }
              : {
                  price: sellAmount.div(buyAmount),
                  baseAmount: buyAmount,
                  baseToken: buyToken,
                  quoteAmount: sellAmount,
                  quoteToken: sellToken,
                }),
            ...{
              type,
              offerId: new BigNumber(offerId),
              ownerId: ownerId as string,
              timestamp: new Date(1000 * Number(timestamp)),
            },
          } as Offer;
        }),
    };
  };
}

function loadOffersAllAtOnce(
  context: NetworkConfig,
  sellToken: string,
  buyToken: string,
  type: OfferType,
): Observable<Offer[]> {
  return from(
    context.otcSupportMethods.contract.methods['getOffers(address,address,address)'](
      context.otc.address,
      context.tokens[sellToken].address,
      context.tokens[buyToken].address,
    ).call(),
  ).pipe(
    map(parseOffers(sellToken, buyToken, type, true)),
    expand<{ lastOfferId: BigNumber; offers: Offer[] }>(({ lastOfferId }) =>
      lastOfferId.isZero()
        ? of()
        : from(
            context.otcSupportMethods.contract.methods['getOffers(address,uint256)'](
              context.otc.address,
              lastOfferId.toString(),
            ).call(),
          ).pipe(map(parseOffers(sellToken, buyToken, type, false))),
    ),
    retryWhen((errors) =>
      errors.pipe(
        switchMap((e) => {
          if (e instanceof InconsistentLoadingError) {
            console.log(e.message);
            return errors;
          }
          throw e;
        }),
      ),
    ),
    reduce<{ offers: Offer[] }, Offer[]>((result, { offers }) => result.concat(offers), []),
    map((offers) => uniqBy(offers, ({ offerId }) => offerId.toString())),
  );
}

export function loadOrderbook$(
  context$: Observable<NetworkConfig>,
  onEveryBlock$: Observable<number>,
  tradingPair: TradingPair,
): Observable<Orderbook> {
  return combineLatest(context$, onEveryBlock$).pipe(
    switchMap(([context, blockNumber]) =>
      zip(
        loadOffersAllAtOnce(context, tradingPair.quote, tradingPair.base, OfferType.buy),
        loadOffersAllAtOnce(context, tradingPair.base, tradingPair.quote, OfferType.sell),
      ).pipe(
        map(hideDusts),
        map(([buy, sell]) => ({
          blockNumber,
          buy,
          sell,
        })),
      ),
    ),
    scan(({ buy: prevBuy, sell: prevSell }, current) => ({ prevBuy, prevSell, ...current }), {
      blockNumber: 0,
      buy: [],
      sell: [],
      prevBuy: [] as Offer[],
      prevSell: [] as Offer[],
    }),
    map(({ blockNumber, buy, sell, prevBuy, prevSell }) => ({
      blockNumber,
      buy: buy.length > 0 || (buy.length === 0 && prevBuy.length === 0) ? buy : prevBuy,
      sell: sell.length > 0 || (sell.length === 0 && prevSell.length === 0) ? sell : prevSell,
    })),
    map(({ blockNumber, buy, sell }) => {
      // console.log('corrected orderbook length for block:', blockNumber, buy.length, sell.length);

      return addSpread({
        tradingPair,
        blockNumber,
        buy,
        sell,
      });
    }),
    shareReplay(1),
  );
}

export function addSpread({ buy, sell, ...rest }: Orderbook) {
  if (!isEmpty(sell) && !isEmpty(buy)) {
    const spread = sell[0].price.minus(buy[0].price);
    const midPrice = sell[0].price.plus(buy[0].price).div(2);
    const spreadPercentage = spread.div(midPrice);
    return {
      buy,
      sell,
      ...rest,
      spread,
      spreadPercentage,
    };
  }
  return {
    buy,
    sell,
    ...rest,
  };
}

const DUST_ORDER_THRESHOLD = '0.000000000001'; // 10^15

function isDustOrder(o: Offer): boolean {
  return o.quoteAmount.lt(DUST_ORDER_THRESHOLD) || o.baseAmount.lt(DUST_ORDER_THRESHOLD);
}

function hideDusts(dusts: Offer[][]): Offer[][] {
  return dusts.map((offers) => offers.filter((o) => !isDustOrder(o)));
}

// export function createPickableOrderBookFromMTSimpleFormState$(
//   currentOrderBook$: Observable<LoadableWithTradingPair<Orderbook>>,
//   account$: Observable<string | undefined>,
//   currentOfferForm$: Observable<MTSimpleFormState>,
// ) {
//   return combineLatest(
//     currentOrderBook$,
//     account$,
//     currentOfferForm$,
//   ).pipe(
//     map(([currentOrderBook, account, { change }]) => ({
//       ...currentOrderBook,
//       account,
//       change: (ch: PickOfferChange) => {
//         console.log('ho change yet!', change, ch);
//       },
//     }))
//   );
// }
