import { BigNumber } from 'bignumber.js';
import { Offer } from '../../exchange/orderbook/orderbook';
import { Impossible, impossible } from '../../utils/impossible';
import { zero } from '../../utils/zero';
import { DebtDelta } from '../allocate/allocate';
import { Operation } from '../state/mtAccount';

export type Operations = Operation[] | Impossible;

export function getTotal(amount: BigNumber, orders: Offer[]): Impossible | BigNumber {

  let total = zero;
  let amountLeft = amount;

  for (const offer of orders) {
    const done = BigNumber.min(amountLeft, offer.baseAmount);
    const paid = done.times(offer.price);

    amountLeft = amountLeft.minus(done);
    total = total.plus(paid);

    if (amountLeft.isEqualTo(zero)) {
      break;
    }
  }

  if (amountLeft.gt(zero)) {
    return impossible('orderbook too shallow');
  }

  return total;
}

export function getPriceImpact(amount: BigNumber, orders: Offer[]):
  Impossible | BigNumber {

  let total = zero;
  let amountLeft = amount;
  let priceImpact = zero;

  let firstOffer;
  let lastOffer;
  for (const offer of orders) {
    if (!firstOffer) {
      firstOffer = offer;
    }
    lastOffer = offer;
    const done = BigNumber.min(amountLeft, offer.baseAmount);
    const paid = done.times(offer.price);

    amountLeft = amountLeft.minus(done);
    total = total.plus(paid);

    if (amountLeft.isEqualTo(zero)) {
      break;
    }
  }
  if (firstOffer !== undefined && lastOffer !== undefined) {
    priceImpact = lastOffer.price.minus(firstOffer.price).div(firstOffer.price);
  }

  if (amountLeft.gt(zero)) {
    return impossible('orderbook too shallow');
  }

  return priceImpact;
}

export function buy(
  cash: BigNumber, offers: Offer[]
): [BigNumber, BigNumber, Offer[]] {

  let totalBought = zero;
  let cashLeft = cash;

  let i = 0;

  for (const offer of offers) {
    i += 1;
    const paid = BigNumber.min(cashLeft, offer.quoteAmount);
    const bought = paid.div(offer.price);
    totalBought = totalBought.plus(bought);
    cashLeft = cashLeft.minus(paid);
    if (cashLeft.isEqualTo(zero)) {
      const quoteAmount = offer.quoteAmount.minus(paid);
      const baseAmount = offer.baseAmount.minus(bought);
      return [totalBought, cashLeft,
        [{ ...offer, quoteAmount, baseAmount, price: quoteAmount.div(baseAmount) },
          ...offers.slice(i)
        ]
      ];
    }
  }

  return [totalBought, cashLeft, offers.slice(i)];
}

export function sell(
  cash: BigNumber, offers: Offer[]
): [BigNumber, BigNumber, Offer[]] {

  let totalSold = zero;
  let cashLeftToBeEarned = cash;

  let i = 0;

  for (const offer of offers) {
    i += 1;
    const earned = BigNumber.min(cashLeftToBeEarned, offer.quoteAmount);
    const sold = earned.div(offer.price);
    totalSold = totalSold.plus(sold);
    cashLeftToBeEarned = cashLeftToBeEarned.minus(earned);
    if (cashLeftToBeEarned.isEqualTo(zero)) {
      const quoteAmount = offer.quoteAmount.minus(earned);
      const baseAmount = offer.baseAmount.minus(sold);
      return [totalSold, cashLeftToBeEarned,
        [{ ...offer, quoteAmount, baseAmount, price: quoteAmount.div(baseAmount) },
          ...offers.slice(i)
        ]
      ];
    }
  }

  return [totalSold, cashLeftToBeEarned, offers.slice(i)];
}

export function deltaToOps(_delta: DebtDelta): Operation[] {
  return [];
}

export function orderDeltas(deltas: DebtDelta[]): DebtDelta[] {
  return [...deltas]
    .sort((d1, d2) => d2.delta.comparedTo(d1.delta));
}
