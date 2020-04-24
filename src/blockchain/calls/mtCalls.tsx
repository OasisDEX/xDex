import { BigNumber } from 'bignumber.js';
import * as React from 'react';
// @ts-ignore
import Web3Utils from 'web3-utils';

import { Operation, OperationKind } from '../../marginTrading/state/mtAccount';
import { Money } from '../../utils/formatters/Formatters';
import { Currency } from '../../utils/text/Text';
import { one } from '../../utils/zero';
import * as dsProxy from '../abi/ds-proxy.abi.json';
import { NetworkConfig } from '../config';
import { MIN_ALLOWANCE } from '../network';
import { amountFromWei, amountToWei } from '../utils';
import { web3 } from '../web3';
import { DEFAULT_GAS } from './callsHelpers';
import { TxMetaKind } from './txMeta';

export const setupMTProxy = {
  call: (_data: {}, context: NetworkConfig) => context.instantProxyRegistry.contract.methods['build()'],
  prepareArgs: () => [],
  options: () => ({ gas: DEFAULT_GAS }), // this should be estimated as in setupProxy
  kind: TxMetaKind.setupMTProxy,
  description: () => <React.Fragment>Setup MT proxy</React.Fragment>,
};

export interface ApproveData {
  token: string;
  proxyAddress: string;
}

export const approveMTProxy = {
  call: ({ token }: ApproveData, context: NetworkConfig) =>
    context.tokens[token].contract.methods['approve(address,uint256)'],
  prepareArgs: ({ token, proxyAddress }: ApproveData, context: NetworkConfig) => {
    console.log('proxyAddress', proxyAddress, 'token', token, context.tokens[token].contract.options.address);
    return [proxyAddress, -1];
  },
  options: () => ({ gas: DEFAULT_GAS }),
  kind: TxMetaKind.approveMTProxy,
  description: ({ token }: ApproveData) => (
    <React.Fragment>
      Approve MT proxy to transfer <Currency value={token} />
    </React.Fragment>
  ),
};

export interface MTBalanceData {
  tokens: string[];
  proxyAddress?: string;
}

export interface MTBalanceResult {
  [index: string]: {
    walletBalance: BigNumber;
    marginBalance: BigNumber;
    urnBalance: BigNumber;
    debt: BigNumber;
    dai: BigNumber;
    referencePrice: BigNumber;
    minCollRatio: BigNumber;
    allowance: boolean;
    fee: BigNumber;
    liquidationPenalty: BigNumber;
    minDebt: BigNumber;
  };
}

const BalanceOuts = 10;
const secondsPerYear = 60 * 60 * 24 * 365;

BigNumber.config({ POW_PRECISION: 100 });

function mtBalancePostprocess({ data }: { data: BigNumber[] }, { tokens }: MTBalanceData): MTBalanceResult {
  const balanceResult: MTBalanceResult = {};
  tokens.forEach((token: string, i: number) => {
    const row = i * BalanceOuts;

    balanceResult[token] = {
      walletBalance: amountFromWei(new BigNumber(data[row]), token),
      marginBalance: amountFromWei(new BigNumber(data[row + 1]), token),
      urnBalance: amountFromWei(new BigNumber(data[row + 2]), token),
      debt: amountFromWei(new BigNumber(data[row + 3]), 'DAI'),
      dai: amountFromWei(new BigNumber(data[row + 4]), 'DAI'),
      referencePrice: amountFromWei(new BigNumber(data[row + 5]), 'DAI'),
      minCollRatio: amountFromWei(new BigNumber(data[row + 6]), 'ETH'),
      allowance: new BigNumber(data[row + 7]).gte(MIN_ALLOWANCE),
      fee: new BigNumber(data[row + 8]).div(new BigNumber(10).pow(27)).pow(secondsPerYear).minus(one),
      liquidationPenalty: new BigNumber(data[row + 9]).div(new BigNumber(10).pow(27)),
      minDebt: amountFromWei(new BigNumber(data[row + 10]), 'DAI'),
    };
  });
  return balanceResult;
}

export const mtBalance = {
  call: (_data: MTBalanceData, context: NetworkConfig) => context.proxyActions.contract.methods.balance,
  prepareArgs: ({ proxyAddress, tokens }: MTBalanceData, context: NetworkConfig) => {
    return [
      proxyAddress,
      tokens.map(
        (token) => (token !== 'DAI' ? Web3Utils.fromAscii(context.mcd.ilks[token]) : token), // DAI is temporary
      ),
      tokens.map((token) => context.tokens[token].address),
      context.mcd.vat,
      context.mcd.spot.address,
      context.mcd.jug.address,
      context.mcd.cat.address,
      context.cdpManager,
    ];
  },
  postprocess: mtBalancePostprocess,
};

function toWei(name: string, amount?: BigNumber) {
  return amount ? amountToWei(amount, name).toFixed(0) : undefined;
}

function argsOfPerformOperations({ plan }: { plan: Operation[] }, context: NetworkConfig) {
  if (plan.length !== 1) {
    throw new Error('plan must contain a single operation');
  }

  const fundArgs = (op: Operation, token: string) => [
    context.cdpManager,
    Web3Utils.fromAscii(context.mcd.ilks[op.name]),
    toWei(token, (op as any).amount),
    context.tokens[token].address,
    context.mcd.joins[token],
  ];

  const fundDaiArgs = (op: Operation, token: string) => [...fundArgs(op, token), context.mcd.vat];

  const drawArgs = (op: Operation, token: string) => [
    context.cdpManager,
    Web3Utils.fromAscii(context.mcd.ilks[op.name]),
    toWei(token, (op as any).amount),
    context.mcd.joins[token],
  ];

  const drawDaiArgs = (op: Operation, token: string) => [
    ...drawArgs(op, token),
    context.mcd.vat,
    context.mcd.jug.address,
  ];

  const buySellArgs = (op: Operation) => {
    const maxTotalAdjustedWithSlippage = (op as any).maxTotal.times(
      op.kind === OperationKind.buyRecursively
        ? one.plus((op as any).slippageLimit)
        : one.minus((op as any).slippageLimit),
    );
    console.log('amount:', (op as any).amount.toString());
    console.log(
      `adjusting maxTotal with slippage ${(op as any).slippageLimit.toString()}:`,
      (op as any).maxTotal.toString(),
      '->',
      maxTotalAdjustedWithSlippage.toString(),
    );
    console.log('price:', maxTotalAdjustedWithSlippage.div((op as any).amount).toString());
    return [
      [
        context.tokens[op.name].address,
        context.mcd.joins[op.name],
        context.tokens.DAI.address,
        context.mcd.joins.DAI,
        context.cdpManager,
        context.otc.address,
        context.mcd.vat,
        ...(op.kind === OperationKind.buyRecursively ? [context.mcd.jug.address] : []),
      ],
      Web3Utils.fromAscii(context.mcd.ilks[op.name]),
      toWei(op.name, (op as any).amount),
      toWei('DAI', maxTotalAdjustedWithSlippage),
    ];
  };

  const types = {
    [OperationKind.fundGem]: () =>
      context.proxyActions.contract.methods.fundGem(...fundArgs(plan[0], plan[0].name)).encodeABI(),
    [OperationKind.fundDai]: () =>
      context.proxyActions.contract.methods.fundDai(...fundDaiArgs(plan[0], 'DAI')).encodeABI(),
    [OperationKind.drawGem]: () =>
      context.proxyActions.contract.methods.drawGem(...drawArgs(plan[0], plan[0].name)).encodeABI(),
    [OperationKind.drawDai]: () =>
      context.proxyActions.contract.methods.drawDai(...drawDaiArgs(plan[0], 'DAI')).encodeABI(),
    [OperationKind.buyRecursively]: () =>
      context.proxyActions.contract.methods.buyLev(...buySellArgs(plan[0])).encodeABI(),
    [OperationKind.sellRecursively]: () =>
      context.proxyActions.contract.methods.sellLev(...buySellArgs(plan[0])).encodeABI(),
  };

  if (!types[plan[0].kind]) {
    throw new Error(`unknown operation: ${plan[0].kind}`);
  }
  return [context.proxyActions.address, types[plan[0].kind]()];
}

interface PerformPlanData {
  plan: Operation[];
  proxy: any;
  gas?: number;
}

const mtPerformPlan = {
  call: ({ proxy }: PerformPlanData, _context: NetworkConfig) => {
    return proxy.methods['execute(address,bytes)'];
  },
  prepareArgs: argsOfPerformOperations,
  // options: () => ({ gas: DEFAULT_GAS * 6 }), // TODO
  options: ({ gas }: PerformPlanData) => (gas ? { gas } : {}),
};

interface MTFundData extends PerformPlanData {
  token: string;
  amount: BigNumber;
}

export const mtFund = {
  ...mtPerformPlan,
  kind: TxMetaKind.fundMTAccount,
  options: () => ({ gas: DEFAULT_GAS }),
  description: ({ token, amount }: MTFundData) => (
    <React.Fragment>
      Fund margin account with <Money value={amount} token={token} />
    </React.Fragment>
  ),
};

export const mtReallocate = {
  ...mtPerformPlan,
  kind: TxMetaKind.reallocateMTAccount,
  options: () => ({ gas: DEFAULT_GAS }),
  description: () => <React.Fragment>Reallocate margin account</React.Fragment>,
};

export interface MTDrawData extends PerformPlanData {
  token: string;
  amount: BigNumber;
}

export const mtDraw = {
  ...mtPerformPlan,
  kind: TxMetaKind.drawMTAccount,
  options: () => ({ gas: DEFAULT_GAS }),
  description: ({ token, amount }: MTDrawData) => (
    <React.Fragment>
      Draw <Money value={amount} token={token} /> from margin account
    </React.Fragment>
  ),
};

export interface MTBuyData extends PerformPlanData {
  baseToken: string;
  amount: BigNumber;
  price: BigNumber;
  total: BigNumber;
  slippageLimit: BigNumber;
}

export const mtBuy = {
  ...mtPerformPlan,
  kind: TxMetaKind.buyMTAccount,
  options: () => ({ gas: DEFAULT_GAS }),
  description: ({ baseToken, amount, total }: MTBuyData) => (
    <React.Fragment>
      Buy <Money value={amount} token={baseToken} /> for <Money value={total} token={'DAI'} />
    </React.Fragment>
  ),
};

export interface MTSellData extends PerformPlanData {
  baseToken: string;
  amount: BigNumber;
  price: BigNumber;
  total: BigNumber;
  slippageLimit: BigNumber;
}

export const mtSell = {
  ...mtPerformPlan,
  kind: TxMetaKind.sellMTAccount,
  options: () => ({ gas: DEFAULT_GAS }),
  description: ({ baseToken, amount, total }: MTSellData) => (
    <React.Fragment>
      Sell <Money value={amount} token={baseToken} /> for <Money value={total} token={'DAI'} />
    </React.Fragment>
  ),
};

interface MTRedeemData {
  proxy: any;
  token: string;
  amount: BigNumber;
}

export const mtRedeem = {
  call: ({ proxy }: MTRedeemData) => {
    return proxy.methods['execute(address,bytes)'];
  },
  prepareArgs: ({ token, amount }: MTRedeemData, context: NetworkConfig) => {
    return [
      context.proxyActions.address,
      context.proxyActions.contract.methods
        .redeem(context.cdpManager, Web3Utils.fromAscii(context.mcd.ilks[token]), amountToWei(amount, token).toFixed())
        .encodeABI(),
    ];
  },
  kind: TxMetaKind.redeem,
  options: () => ({ gas: DEFAULT_GAS }),
  description: ({ token, amount }: MTRedeemData) => (
    <React.Fragment>
      Redeem <Money value={amount} token={token} /> from Vat
    </React.Fragment>
  ),
};

interface MTExportData {
  proxyAddress: string;
  token: string;
}

export const mtExport = {
  call: ({ proxyAddress }: MTExportData) => {
    return new web3.eth.Contract(dsProxy as any, proxyAddress).methods['execute(address,bytes)'];
  },
  prepareArgs: ({ token }: MTExportData, context: NetworkConfig) => {
    return [
      context.proxyActions.address,
      context.proxyActions.contract.methods
        .export(
          context.cdpManager,
          Web3Utils.fromAscii(context.mcd.ilks[token]),
          context.mcd.vat,
          context.mcd.dssCdpManager,
        )
        .encodeABI(),
    ];
  },
  kind: TxMetaKind.export,
  description: ({ token }: MTExportData) => (
    <React.Fragment>Export {token} leveraged position to Oasis Borrow</React.Fragment>
  ),
};

export const osmParams = {
  call: (_data: any, context: NetworkConfig) => {
    return context.mcd.osms[_data.token].contract.methods.zzz;
  },
  prepareArgs: () => {
    return [];
  },
  postprocess: (results: any, _data: any) => ({ [_data.token]: new BigNumber(results) }),
};
