import { BigNumber } from 'bignumber.js';
import { billion, million, thousand, zero } from '../zero';
import { formatAsShorthandNumbers, formatCryptoBalance, formatFiatBalances } from './format';

describe('Formatting numbers as shorthand ones', () => {
  beforeEach(() => {
    BigNumber.config({ EXPONENTIAL_AT: [-20, 20] });
  });

  it('should format billions', () => {
    const number = new BigNumber(123.45).times(billion);
    expect(formatAsShorthandNumbers(number)).toEqual('123.45B');
  });

  it('should format negative billions', () => {
    const number = new BigNumber(-123.45).times(billion);
    expect(formatAsShorthandNumbers(number)).toEqual('-123.45B');
  });

  it('should format billions with no precision', () => {
    const number = new BigNumber(123.45).times(billion);
    expect(formatAsShorthandNumbers(number, 0)).toEqual('123B');
  });

  it('should format billions with custome precision', () => {
    const number = new BigNumber(123.67801).times(billion);
    expect(formatAsShorthandNumbers(number, 5)).toEqual('123.67801B');
  });

  it('should format billions and not remove the trailing zeroes', () => {
    const number = new BigNumber(123.6780000).times(billion);
    expect(formatAsShorthandNumbers(number, 5)).toEqual('123.67800B');
  });

  // tslint:disable-next-line:max-line-length
  it('should format billions and not remove trailing zeroes if any after precicion format on number with digits after the precision point', () => {
    const number = new BigNumber(23.45900002).times(billion);
    expect(formatAsShorthandNumbers(number, 5)).toEqual('23.45900B');
  });

  it('should format millions', () => {
    const number = new BigNumber(999.999).times(million);
    expect(formatAsShorthandNumbers(number)).toEqual('999.999M');
  });

  it('should format negative millions', () => {
    const number = new BigNumber(-999.999).times(million);
    expect(formatAsShorthandNumbers(number)).toEqual('-999.999M');
  });

  it('should format millions with no precision', () => {
    const number = new BigNumber(999.999).times(million);
    expect(formatAsShorthandNumbers(number, 0)).toEqual('999M');
  });

  it('should format millions with custome precision', () => {
    const number = new BigNumber(999.12345).times(million);
    expect(formatAsShorthandNumbers(number, 2)).toEqual('999.12M');
  });

  it('should format millions and not remove trailing zeroes', () => {
    const number = new BigNumber(999.6780000).times(million);
    expect(formatAsShorthandNumbers(number, 5)).toEqual('999.67800M');
  });

  // tslint:disable-next-line:max-line-length
  it('should format millions and not remove trailing zeroes if any after precicion format on number with digits after the precision point', () => {
    const number = new BigNumber(243.45900002).times(million);
    expect(formatAsShorthandNumbers(number, 5)).toEqual('243.45900M');
  });

  it('should format thousands', () => {
    const number = new BigNumber(123.4567).times(thousand);
    expect(formatAsShorthandNumbers(number)).toEqual('123.4567K');
  });

  it('should format negative thousands', () => {
    const number = new BigNumber(-123.4567).times(thousand);
    expect(formatAsShorthandNumbers(number)).toEqual('-123.4567K');
  });

  it('should format thousands with no precision', () => {
    const number = new BigNumber(12.12).times(thousand);
    expect(formatAsShorthandNumbers(number, 0)).toEqual('12K');
  });

  it('should format thousands with custome precision', () => {
    const number = new BigNumber(12.002).times(thousand);
    expect(formatAsShorthandNumbers(number, 6)).toEqual('12.002000K');
  });

  it('should format thousands and not remove trailing zeroes', () => {
    const number = new BigNumber(23.459000000).times(thousand);
    expect(formatAsShorthandNumbers(number, 4)).toEqual('23.4590K');
  });

  // tslint:disable-next-line:max-line-length
  it('should format thousands and not remove trailing zeroes if any after precicion format on number with digits after the precision point', () => {
    const number = new BigNumber(23.45900002).times(thousand);
    expect(formatAsShorthandNumbers(number, 4)).toEqual('23.4590K');
  });

  it('should not shorthand the number', () => {
    const number = new BigNumber(923.45900002);
    expect(formatAsShorthandNumbers(number)).toEqual('923.45900002');
  });

  it('should not shorthand the negative number', () => {
    const number = new BigNumber(-923.45900002);
    expect(formatAsShorthandNumbers(number)).toEqual('-923.45900002');
  });

  it('should not shorthand the number but remove trailing zeroes', () => {
    const number = new BigNumber(923.459000);
    expect(formatAsShorthandNumbers(number)).toEqual('923.459');
  });

  // tslint:disable-next-line:max-line-length
  it('should not shorthand the number but format to precision and not remove trailing zeroes if any', () => {
    const number = new BigNumber(923.45900002);
    expect(formatAsShorthandNumbers(number, 4)).toEqual('923.4590');
  });

  it('should format 0', () => {
    expect(formatAsShorthandNumbers(zero, 4)).toEqual('0.0000');
  });

  it('should format numbers bigger than billion', () => {
    const trillion = new BigNumber('1000000000000');
    expect(formatAsShorthandNumbers(trillion)).toEqual('1000B');
  });

  it('should format numbers bigger than billion with precision', () => {
    const trillion = new BigNumber('1000045600000');
    expect(formatAsShorthandNumbers(trillion, 2)).toEqual('1000.04B');
  });
});

// **Crypto Balances (DAI, ETH, BAT etc)**

// - If below 0.001 - Always show <0.001
// - If between 0.001 and 10 - always to 4 decimal places (e.g. 428.4920)
// - If between 10 and 1,000,000 - To two decimal places (e.g. 539.39 or 1,536.35)
// - If >1m <1B - Shorted to M (without a space) and to two decimal places (e.g. 23.53M)
// - If >1B -Shortened to B (without a space) and to two decimal places (4.22B)
describe('Formatting crypto balances according to number formatting spec', () => {
  it('should display number as it is without precision', () => {
    const amount = new BigNumber('0.00002312321');
    expect(formatCryptoBalance(amount)).toEqual(amount.valueOf());
  });

  it('should display  negative number as it is without precision', () => {
    const amount = new BigNumber('-0.00002312321');
    expect(formatCryptoBalance(amount)).toEqual(amount.valueOf());
  });

  it('should have a precision of 4 for lower bound', () => {
    const amount = new BigNumber('0.0001');
    expect(formatCryptoBalance(amount)).toEqual('0.0001');
  });

  it('should have a precision of 4 for lower bound (negative number)', () => {
    const amount = new BigNumber('-0.0001');
    expect(formatCryptoBalance(amount)).toEqual('-0.0001');
  });

  it('should have a precision of 4', () => {
    const amount = new BigNumber('9.456789');
    expect(formatCryptoBalance(amount)).toEqual('9.4567');
  });

  it('should have a precision of 4 (negative number)', () => {
    const amount = new BigNumber('-9.456789');
    expect(formatCryptoBalance(amount)).toEqual('-9.4567');
  });

  it('should have precision of 2 lower bound', () => {
    const amount = new BigNumber('10.012');
    expect(formatCryptoBalance(amount)).toEqual('10.01');
  });

  it('should have precision of 2 lower bound (negative number)', () => {
    const amount = new BigNumber('-10.012');
    expect(formatCryptoBalance(amount)).toEqual('-10.01');
  });

  it('should have precision of 2 and suffix M', () => {
    const amount = new BigNumber('10.012').times(million);
    expect(formatCryptoBalance(amount)).toEqual('10.01M');
  });

  it('should have precision of 2 and suffix M (negative number)', () => {
    const amount = new BigNumber('-10.012').times(million);
    expect(formatCryptoBalance(amount)).toEqual('-10.01M');
  });

  it('should have precision of 2 and suffix B', () => {
    const amount = new BigNumber('10.012').times(billion);
    expect(formatCryptoBalance(amount)).toEqual('10.01B');
  });

  it('should have precision of 2 and suffix B (negative number)', () => {
    const amount = new BigNumber('-10.012').times(billion);
    expect(formatCryptoBalance(amount)).toEqual('-10.01B');
  });
});

// **FIAT Balances (USD, EUR etc)**

// - If below 1.0 - 4 decimal places should be used (e.g. 0.2153 USD)
// - If between 1.0 and 1,000) - always to 2 decimal places (e.g. 25.42 USD)
// - If between 1,000 and 1,000,000 - Shortened to K (without a space)
//   and to two decimal places (e.g. 539.39K or 1.54K)
// - If >1m - Shorted to M (without a space) and to two decimal places (e.g. 23.53M)

describe('Formatting fiat balances according to number formattic spec', () => {
  it('should format number with precision 4', () => {
    const amount = new BigNumber(0.991235);
    expect(formatFiatBalances(amount)).toBe('0.9912');
  });

  it('should format number with precision 4 (negative number)', () => {
    const amount = new BigNumber(-0.991235);
    expect(formatFiatBalances(amount)).toBe('-0.9912');
  });

  it('should format number with precision 2 ', () => {
    const amount = new BigNumber(9.991235);
    expect(formatFiatBalances(amount)).toBe('9.99');
  });

  it('should format number with precision 2 (negative number)', () => {
    const amount = new BigNumber(-9.991235);
    expect(formatFiatBalances(amount)).toBe('-9.99');
  });

  it('should format number with precision 2 and suffix K', () => {
    const amount = new BigNumber(9.991235).times(thousand);
    expect(formatFiatBalances(amount)).toBe('9.99K');
  });

  it('should format number with precision 2 and suffix K (negative number)', () => {
    const amount = new BigNumber(-999.991235).times(thousand);
    expect(formatFiatBalances(amount)).toBe('-999.99K');
  });

  it('should format number with precision 2 and suffix M', () => {
    const amount = new BigNumber(234.985623423).times(million);
    expect(formatFiatBalances(amount)).toBe('234.98M');
  });

  it('should format number with precision 2 and suffix M (negative number)', () => {
    const amount = new BigNumber(-234.985623423).times(million);
    expect(formatFiatBalances(amount)).toBe('-234.98M');
  });

  it('should format number with precision 2 and suffix B', () => {
    const amount = new BigNumber(1234.12345).times(million);
    expect(formatFiatBalances(amount)).toBe('1.23B');
  });

  it('should format number with precision 2 and suffix B (negative number)', () => {
    const amount = new BigNumber(-1234.985623423).times(million);
    expect(formatFiatBalances(amount)).toBe('-1.23B');
  });
});
