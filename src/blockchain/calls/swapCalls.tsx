/*
 * Copyright (C) 2020 Maker Ecosystem Growth Holdings, INC.
 */

import { BigNumber } from 'bignumber.js';
import * as React from 'react';
import { FormatAmount } from '../../utils/formatters/Formatters';
import * as dsProxy from '../abi/ds-proxy.abi.json';
import * as migrationProxyActions from '../abi/migration-proxy-actions.abi.json';
import { NetworkConfig } from '../config';
import { amountToWei } from '../utils';
import { web3 } from '../web3';
import { TransactionDef } from './callsHelpers';
import { TxMetaKind } from './txMeta';

export interface SwapData {
  proxyAddress: string;
  amount: BigNumber;
  gas?: number;
  gasPrice?: BigNumber;
}

const execute = (proxyAddress: string) =>
  new web3.eth.Contract(dsProxy as any, proxyAddress).methods['execute(address,bytes)'];

export const swapSaiToDai: TransactionDef<SwapData> = {
  call: ({ proxyAddress }: SwapData) => execute(proxyAddress),
  prepareArgs: ({ amount }: SwapData, context: NetworkConfig) => [
    context.migrationProxyActions,
    new web3.eth.Contract(migrationProxyActions as any, context.migrationProxyActions).methods
      .swapSaiToDai(context.migration, amountToWei(amount, 'SAI').toFixed(0))
      .encodeABI(),
  ],
  kind: TxMetaKind.swapDai,
  options: () => ({ gas: 5000000 }),
  description: ({ amount }) => (
    <>
      Swapping SAI <FormatAmount value={amount} token={'SAI'} /> for DAI
    </>
  ),
};

export const swapDaiToSai: TransactionDef<SwapData> = {
  call: ({ proxyAddress }: SwapData) => execute(proxyAddress),
  prepareArgs: ({ amount }: SwapData, context: NetworkConfig) => [
    context.migrationProxyActions,
    new web3.eth.Contract(migrationProxyActions as any, context.migrationProxyActions).methods
      .swapDaiToSai(context.migration, amountToWei(amount, 'DAI').toFixed(0))
      .encodeABI(),
  ],
  kind: TxMetaKind.swapSai,
  options: () => ({ gas: 5000000 }),
  description: () => <>Swapping MCD DAI for SAI</>,
};
