import { BigNumber } from 'bignumber.js';

import { tokens } from './config';

export function amountFromWei(amount: BigNumber, token: string): BigNumber {
  return amount.div(new BigNumber(10).pow(tokens[token].precision));
}

export function amountToWei(amount: BigNumber, token: string): BigNumber {
  const precision = tokens[token].precision;
  return amount.times(new BigNumber(10).pow(precision));
}

export const padLeft = (string: string, chars: number, sign?: string) =>
  Array(chars - string.length + 1).join(sign ? sign : '0') + string;

export const nullAddress = '0x0000000000000000000000000000000000000000';
