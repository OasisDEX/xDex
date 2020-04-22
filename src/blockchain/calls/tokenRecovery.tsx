import { BigNumber } from 'bignumber.js'
import * as React from 'react'
import * as dsProxy from '../abi/ds-proxy.abi.json'
import { NetworkConfig } from '../config'
import { amountFromWei } from '../utils'
import { web3 } from '../web3'
import { CallDef, TransactionDef } from './callsHelpers'
import { TxMetaKind } from './txMeta'

export interface OutOfProxyData {
  proxyAddress: string
  token: string
}

export const recoverERC20: TransactionDef<OutOfProxyData> = {
  call: ({ proxyAddress }: OutOfProxyData) =>
    new web3.eth.Contract(dsProxy as any, proxyAddress).methods['execute(address,bytes)'],
  prepareArgs: ({ token }: OutOfProxyData, context: NetworkConfig) => [
    context.tokenRecovery.address,
    context.tokenRecovery.contract.methods.recoverERC20(context.tokens[token].address).encodeABI(),
  ],
  options: () => ({ gas: 1000000 }),
  kind: TxMetaKind.recoverERC20,
  description: ({ token }: OutOfProxyData) => <React.Fragment>Recovering {token} from proxy</React.Fragment>,
}

export const proxyERC20Balance: CallDef<OutOfProxyData, BigNumber> = {
  call: ({ token }: OutOfProxyData, context: NetworkConfig) => context.tokens[token].contract.methods.balanceOf,
  prepareArgs: ({ proxyAddress }) => [proxyAddress],
  postprocess: (price: string, { token }: OutOfProxyData) => amountFromWei(new BigNumber(price), token),
}
