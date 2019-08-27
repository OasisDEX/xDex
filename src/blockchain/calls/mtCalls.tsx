import { BigNumber } from 'bignumber.js';
import * as React from 'react';

import { Operation, OperationKind } from '../../marginTrading/state/mtAccount';
import { Money } from '../../utils/formatters/Formatters';
import { Currency } from '../../utils/text/Text';
import { NetworkConfig } from '../config';
import { MIN_ALLOWANCE } from '../network';
import { amountFromWei, amountToWei } from '../utils';
import { web3 } from '../web3';
import { DEFAULT_GAS } from './callsHelpers';
import { TxMetaKind } from './txMeta';

export const setupMTProxy = {
  call: (_data: {}, context: NetworkConfig) => context.marginProxyRegistry.contract.build[''],
  prepareArgs: () => [],
  options: () => ({ gas: DEFAULT_GAS }),
  kind: TxMetaKind.setupMTProxy,
  description: () => <React.Fragment>Setup MT proxy</React.Fragment>
};

export interface ApproveData {
  token: string;
  proxyAddress: string;
}

export const approveMTProxy = {
  call: ({ token }: ApproveData, context: NetworkConfig) =>
    context.tokens[token].contract.approve['address,uint256'],
  prepareArgs: ({ token, proxyAddress }: ApproveData, context: NetworkConfig) => {
    console.log('proxyAddress', proxyAddress,
                'token', token,
                context.tokens[token].contract.address);
    return [proxyAddress, -1];
  },
  options: () => ({ gas: DEFAULT_GAS }),
  kind: TxMetaKind.approveMTProxy,
  description: ({ token }: ApproveData) =>
    <React.Fragment>Approve MT proxy to transfer <Currency value={token}/></React.Fragment>
};

export interface MTBalanceData {
  tokens: string[];
  proxyAddress?: string;
}

export interface MTBalanceResult {
  assets: Array<{
    walletBalance: BigNumber;
    marginBalance: BigNumber;
    urnBalance: BigNumber;
    debt: BigNumber;
    dai: BigNumber;
    referencePrice: BigNumber;
    minCollRatio: BigNumber;
    allowance: boolean;
    fee: BigNumber
  }>;
}

const BalanceOuts = 9;

function mtBalancePostprocess(result: BigNumber[], { tokens }: MTBalanceData) : MTBalanceResult {
  return {
    assets: tokens.map((token, i) => {
      const row = i * BalanceOuts;
      return {
        walletBalance: amountFromWei(new BigNumber(result[row]), token),
        marginBalance: amountFromWei(new BigNumber(result[row + 1]), token),
        urnBalance: amountFromWei(new BigNumber(result[row + 2]), token),
        debt: amountFromWei(new BigNumber(result[row + 3]), 'DAI'),
        dai: amountFromWei(new BigNumber(result[row + 4]), 'DAI'),
        referencePrice: amountFromWei(new BigNumber(result[row + 5]), 'DAI'),
        minCollRatio: amountFromWei(new BigNumber(result[row + 6]), 'ETH'),
        allowance: new BigNumber(result[row + 7]).gte(MIN_ALLOWANCE),
        fee: new BigNumber(result[row + 8]).div(new BigNumber(10).pow(27))
      };
    })
  };
}

export const mtBalance = {
  call: (_data: MTBalanceData, context: NetworkConfig) => context.proxyActions.contract.balance,
  prepareArgs: ({ proxyAddress, tokens }: MTBalanceData, context: NetworkConfig) => {
    return [
      proxyAddress,
      tokens.map(token => web3.toHex(token)),
      tokens.map(token => context.tokens[token].address),
      tokens.map(token => context.prices[token]),
      context.mcd.vat,
      context.spot,
      context.jug,
      context.cdpManager,
    ];
  },
  postprocess: mtBalancePostprocess,
};

function toWei(name: string, amount?: BigNumber) {
  return amount ?
    amountToWei(amount, name).toFixed(0) :
    undefined;
}

function argsOfPerformOperations(
  { plan }: { plan: Operation[] },
  context: NetworkConfig,
) {
  const kinds: string[] = [];
  const names: string[] = [];
  const tokens: string[] = [];
  const adapters: string[] = [];
  const amounts: Array<string | undefined> = [];
  const maxTotals: Array<string | undefined> = [];
  const dgems: Array<string | undefined> = [];
  const ddais: Array<string | undefined> = [];

  for (const [i, o] of plan.entries()) {
    kinds[i] = web3.toHex(o.kind);
    names[i] = web3.toHex(
      o.kind === OperationKind.fundDai || o.kind === OperationKind.drawDai ? o.ilk : o.name
    );
    tokens[i] = context.tokens[o.name].address;
    adapters[i] = context.joins[o.name];
    amounts[i] = toWei(o.name, (o as any).amount);
    maxTotals[i] = toWei(o.name, (o as any).maxTotal);
    dgems[i] = toWei(o.name, (o as any).dgem);
    ddais[i] = toWei(o.name, (o as any).ddai);
  }

  console.log('plan', JSON.stringify(plan));
  console.log('args', JSON.stringify(
    [
      context.proxyActions.address,
      kinds, names, tokens, adapters, amounts,
      maxTotals, dgems, ddais,
      [
        context.cdpManager, context.mcd.vat, context.otc.address,
        context.tokens.DAI.address, context.joins.DAI,
      ],
    ]
  ));

  return [
    context.proxyActions.address,
    context.proxyActions.contract.performOperations.getData(
      kinds, names, tokens, adapters, amounts,
      maxTotals, dgems, ddais,
      [
        context.cdpManager, context.mcd.vat, context.otc.address,
        context.tokens.DAI.address, context.joins.DAI,
      ],
    )
  ];
}

interface PerformPlanData {
  plan: Operation[];
  proxy: any;
  gas?: number;
}

const mtPerformPlan = {
  call: ({ proxy }: PerformPlanData, _context: NetworkConfig) =>
    proxy.execute['address,bytes'],
  prepareArgs: argsOfPerformOperations,
  // options: () => ({ gas: DEFAULT_GAS * 6 }), // TODO
  options: ({ gas }: PerformPlanData) => gas ? { gas } : {},
};

interface MTFundData extends PerformPlanData {
  token: string;
  amount: BigNumber;
}

export const mtFund = {
  ...mtPerformPlan,
  kind: TxMetaKind.fundMTAccount,
  description: ({ token, amount }: MTFundData) =>
    <React.Fragment>
      Fund margin account with <Money value={amount} token={token} />
    </React.Fragment>
};

export const mtReallocate = {
  ...mtPerformPlan,
  kind: TxMetaKind.reallocateMTAccount,
  description: () =>
    <React.Fragment>Reallocate margin account</React.Fragment>
};

export interface MTDrawData extends PerformPlanData {
  token: string;
  amount: BigNumber;
}

export const mtDraw = {
  ...mtPerformPlan,
  kind: TxMetaKind.drawMTAccount,
  description: ({ token, amount }: MTDrawData) =>
    <React.Fragment>
      Draw <Money value={amount} token={token} /> from margin account
    </React.Fragment>
};

export interface MTBuyData extends PerformPlanData {
  baseToken: string;
  amount: BigNumber;
  price: BigNumber;
  total: BigNumber;
}

export const mtBuy = {
  ...mtPerformPlan,
  kind: TxMetaKind.buyMTAccount,
  description: ({ baseToken, amount, total }: MTBuyData) =>
    <React.Fragment>
      Buy <Money value={amount} token={baseToken}/> for <Money value={total} token={'DAI'}/>
    </React.Fragment>
};

export interface MTSellData extends PerformPlanData {
  baseToken: string;
  amount: BigNumber;
  price: BigNumber;
  total: BigNumber;
}

export const mtSell = {
  ...mtPerformPlan,
  kind: TxMetaKind.sellMTAccount,
  description: ({ baseToken, amount, total }: MTSellData) =>
    <React.Fragment>
      Sell <Money value={amount} token={baseToken}/> for <Money value={total} token={'DAI'}/>
    </React.Fragment>
};
