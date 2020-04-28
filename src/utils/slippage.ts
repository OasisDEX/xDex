import { BigNumber } from 'bignumber.js';
import { NetworkConfig } from '../blockchain/config';

export const getSlippageLimit = (context: NetworkConfig, quotation: string): BigNumber =>
  new BigNumber(
    // @ts-ignore
    context.thresholds[
      quotation
        .split('/')
        .join('')
        .toLowerCase()
    ] || 0.02,
  );
