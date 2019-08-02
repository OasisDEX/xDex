import { BigNumber } from 'bignumber.js';
import { curry, unnest } from 'ramda';
import { bindNodeCallback, combineLatest, Observable, of } from 'rxjs';
import { concatMap, map, reduce, switchMap } from 'rxjs/operators';

import * as marginEngine from '../../blockchain/abi/margin-engine.abi.json';
import { NetworkConfig } from '../../blockchain/config';
import { amountFromWei } from '../../blockchain/utils';
import { web3 } from '../../blockchain/web3';

export enum MTHistoryEventKind {
  fund = 'fund',
  draw = 'draw',
  adjust = 'adjust',
  buy = 'buy',
  sell = 'sell',
  buyLev = 'buyLev',
  sellLev = 'sellLev',
  bite = 'bite',
  kick = 'kick',
  tend = 'tend',
  dent = 'dent',
  deal = 'deal',
}

export type MTHistoryEvent = MTMarginEvent | MTLiquidationEvent;

type MTMarginEvent = {
  timestamp: number;
  token: string;
} & ({
  kind: MTHistoryEventKind.fund;
  amount: BigNumber;
} | {
  kind: MTHistoryEventKind.draw;
  amount: BigNumber;
} | {
  kind: MTHistoryEventKind.adjust;
  dgem: BigNumber;
  ddai: BigNumber;
} | {
  kind: MTHistoryEventKind.buy;
  amount: BigNumber;
  payAmount: BigNumber;
} | {
  kind: MTHistoryEventKind.sell;
  amount: BigNumber;
  payAmount: BigNumber;
} | {
  kind: MTHistoryEventKind.buyLev;
  amount: BigNumber;
  payAmount: BigNumber;
} | {
  kind: MTHistoryEventKind.sellLev;
  amount: BigNumber;
  payAmount: BigNumber;
});

type MTLiquidationEvent = {
  timestamp: number;
  token: string;
} & ({
  kind: MTHistoryEventKind.bite;
  id: BigNumber;
  gem: BigNumber;
  dai: BigNumber;
} | {
  kind: MTHistoryEventKind.kick;
  id: BigNumber;
  gem: BigNumber;
  dai: BigNumber;
} | {
  kind: MTHistoryEventKind.tend;
  id: BigNumber;
  gem: BigNumber;
  dai: BigNumber;
} | {
  kind: MTHistoryEventKind.dent;
  id: BigNumber;
  gem: BigNumber;
  dai: BigNumber;
} | {
  kind: MTHistoryEventKind.deal;
  id: BigNumber;
});

export function bytes32(hex: string): string {
  const a = hex.match(/^0x(.*)$/);
  if (!a || !a[1]) {
    throw new Error('malformed hex value: ' + hex);
  }
  if (a[1].length > 64) {
    throw new Error('hex value overflow: ' + hex);
  }
  return `0x${'0'.repeat((64 - a[1].length))}${a[1]}`;
}

function subBytes(hex: string, start: number, length?: number): string {
  const a = hex.match(/^0x(.*)$/);
  if (!a || !a[1]) {
    throw new Error('malformed hex value: ' + hex);
  }
  return `0x${a[1].substr(2 * start, length && 2 * length)}`;
}

const marginEventFilter = (Event: any, context: NetworkConfig, token: string) => Event(
  { token: context.tokens[token].address },
  { fromBlock: context.startingBlock },
);

const eventFilters: (
  proxy: any, context: NetworkConfig, token: string, marginAccount: any
) => {[key in MTHistoryEventKind]: any} = (proxy, context, token, marginAccount) => ({
  [MTHistoryEventKind.fund]: marginEventFilter(marginAccount.Fund, context, token),
  [MTHistoryEventKind.draw]: marginEventFilter(marginAccount.Draw, context, token),
  [MTHistoryEventKind.adjust]: marginEventFilter(marginAccount.Adjust, context, token),
  [MTHistoryEventKind.buy]: marginEventFilter(marginAccount.Buy, context, token),
  [MTHistoryEventKind.sell]: marginEventFilter(marginAccount.Sell, context, token),
  [MTHistoryEventKind.buyLev]: marginEventFilter(marginAccount.BuyLev, context, token),
  [MTHistoryEventKind.sellLev]: marginEventFilter(marginAccount.SellLev, context, token),
  [MTHistoryEventKind.bite]: context.mcd.cat.contract.Bite(
    { urn: bytes32(proxy.address), ilk: context.ilks[token] },
    { fromBlock: context.startingBlock },
  ),
  [MTHistoryEventKind.kick]: context.mcd.flip[token].contract.Kick(
    { urn: bytes32(proxy.address) },
    { fromBlock: context.startingBlock },
  ),
  [MTHistoryEventKind.tend]: context.mcd.flip[token].contract.LogNote(
    { sig: subBytes(context.mcd.flip.DGX.contract.tend.getData(0, 0, 0), 0, 4) },
    { fromBlock: context.startingBlock },
  ),
  [MTHistoryEventKind.dent]: context.mcd.flip[token].contract.LogNote(
    { sig: subBytes(context.mcd.flip.DGX.contract.dent.getData(0, 0, 0), 0, 4) },
    { fromBlock: context.startingBlock },
  ),
  [MTHistoryEventKind.deal]: context.mcd.flip[token].contract.LogNote(
    { sig: subBytes(context.mcd.flip.DGX.contract.deal.getData(0), 0, 4) },
    { fromBlock: context.startingBlock },
  ),
});

const eventMappers: (token: string) => {[key in MTHistoryEventKind]: (
  event: {blockNumber: string, args: any},
  block: { timestamp: number },
) => MTHistoryEvent | any[]} = (token) => ({
  [MTHistoryEventKind.fund]: (
    event: {blockNumber: string, args: any},
    block: { timestamp: number },
  ) => ({
    token,
    timestamp: block.timestamp,
    kind: MTHistoryEventKind.fund,
    amount: amountFromWei(event.args.amount, token),
  } as MTHistoryEvent),
  [MTHistoryEventKind.draw]: (
    event: {blockNumber: string, args: any},
    block: { timestamp: number },
  ) => ({
    token,
    timestamp: block.timestamp,
    kind: MTHistoryEventKind.draw,
    amount: amountFromWei(event.args.amount, token),
  } as MTHistoryEvent),
  [MTHistoryEventKind.adjust]: (
    event: {blockNumber: string, args: any},
    block: { timestamp: number },
  ) => ({
    token,
    timestamp: block.timestamp,
    kind: MTHistoryEventKind.adjust,
    dgem: amountFromWei(event.args.dgem, token),
    ddai: amountFromWei(event.args.ddai, 'DAI'),
  } as MTHistoryEvent),
  [MTHistoryEventKind.buy]: (
    event: {blockNumber: string, args: any},
    block: { timestamp: number },
  ) => ({
    token,
    timestamp: block.timestamp,
    kind: MTHistoryEventKind.buy,
    amount: amountFromWei(event.args.amount, token),
    payAmount: amountFromWei(event.args.maxPayAmount, 'DAI'),
  } as MTHistoryEvent),
  [MTHistoryEventKind.sell]: (
    event: {blockNumber: string, args: any},
    block: { timestamp: number },
  ) => ({
    token,
    timestamp: block.timestamp,
    kind: MTHistoryEventKind.sell,
    amount: amountFromWei(event.args.amount, token),
    payAmount: amountFromWei(event.args.minPayAmount, 'DAI'),
  } as MTHistoryEvent),
  [MTHistoryEventKind.buyLev]: (
    event: {blockNumber: string, args: any},
    block: { timestamp: number },
  ) => ({
    token,
    timestamp: block.timestamp,
    kind: MTHistoryEventKind.buyLev,
    amount: amountFromWei(event.args.amount, token),
    payAmount: amountFromWei(event.args.maxPayAmount, 'DAI'),
  } as MTHistoryEvent),
  [MTHistoryEventKind.sellLev]: (
    event: {blockNumber: string, args: any},
    block: { timestamp: number },
  ) => ({
    token,
    timestamp: block.timestamp,
    kind: MTHistoryEventKind.sellLev,
    amount: amountFromWei(event.args.amount, token),
    payAmount: amountFromWei(event.args.minPayAmount, 'DAI'),
  } as MTHistoryEvent),
  [MTHistoryEventKind.bite]: (
    event: {blockNumber: string, args: any},
    block: { timestamp: number },
  ) => ({
    token,
    timestamp: block.timestamp,
    kind: MTHistoryEventKind.bite,
    id: event.args.flip,
    gem: amountFromWei(event.args.ink, token),
    dai: amountFromWei(event.args.tab, 'DAI'),
  } as MTHistoryEvent),
  [MTHistoryEventKind.kick]: (
    event: {blockNumber: string, args: any},
    block: { timestamp: number },
  ) => [{
    token,
    timestamp: block.timestamp,
    kind: MTHistoryEventKind.kick,
    id: event.args.id,
    gem: amountFromWei(event.args.lot, token),
    dai: amountFromWei(event.args.tab, 'DAI'),
  } as MTHistoryEvent, [event.args.id.toString(), event.args.urn]],
  [MTHistoryEventKind.tend]: (
    event: {blockNumber: string, args: any},
    block: { timestamp: number },
  ) => ({
    token,
    timestamp: block.timestamp,
    kind: 'tend',
    id: new BigNumber(web3.toDecimal(subBytes(event.args.fax, 4, 32))),
    gem: amountFromWei(
      new BigNumber(web3.toDecimal(subBytes(event.args.fax, 36, 32))), token
    ),
    dai: amountFromWei(
      new BigNumber(web3.toDecimal(subBytes(event.args.fax, 68, 32))), 'DAI'
    ),
  } as MTHistoryEvent),
  [MTHistoryEventKind.dent]: (
    event: {blockNumber: string, args: any},
    block: { timestamp: number },
  ) => ({
    token,
    timestamp: block.timestamp,
    kind: MTHistoryEventKind.dent,
    id: new BigNumber(web3.toDecimal(subBytes(event.args.fax, 4, 32))),
    gem: amountFromWei(
      new BigNumber(web3.toDecimal(subBytes(event.args.fax, 36, 32))), token
    ),
    dai: amountFromWei(
      new BigNumber(web3.toDecimal(subBytes(event.args.fax, 68, 32))), 'DAI'
    ),
  } as MTHistoryEvent),
  [MTHistoryEventKind.deal]: (
    event: {blockNumber: string, args: any},
    block: { timestamp: number },
  ) => ({
    token,
    timestamp: block.timestamp,
    kind: MTHistoryEventKind.deal,
    id: new BigNumber(web3.toDecimal(subBytes(event.args.fax, 4, 32))),
  } as MTHistoryEvent),
});

export function createMTHistory(
  _proxy: any,
  _context: NetworkConfig,
  _token: string,
): Observable<MTHistoryEvent[]> {
  return of([]);
}

export function createMTHistory2(
  proxy: any,
  context: NetworkConfig,
  token: string,
): Observable<MTHistoryEvent[]> {

  const marginAccount = web3.eth.contract(marginEngine as any).at(proxy.address);
  const filters = eventFilters(proxy, context, token, marginAccount);
  const mappers = eventMappers(token);

  const fetchMarginEvents = [
    MTHistoryEventKind.fund,
    MTHistoryEventKind.draw,
    MTHistoryEventKind.adjust,
    MTHistoryEventKind.buy,
    MTHistoryEventKind.sell,
    MTHistoryEventKind.buyLev,
    MTHistoryEventKind.sellLev,
  ].map(event =>
    bindNodeCallback(
      filters[event].get.bind(filters[event])
    )().pipe(
      switchMap((events: Array<{blockNumber: string, args: any}>) => of(...events).pipe(
        concatMap(e => bindNodeCallback(web3.eth.getBlock)(e.blockNumber).pipe(
          map(curry(mappers[event])(e)),
        )),
        reduce((a, e) => a.concat(e), []),
      )),
    )
  );

  return combineLatest(
    ...fetchMarginEvents,
    // bindNodeCallback(
    //   filters[MTHistoryEventKind.kick].get.bind(filters[MTHistoryEventKind.kick])
    // )().pipe(
    //   switchMap((events: Array<{blockNumber: string, args: any}>) => of(...events).pipe(
    //     concatMap(e => bindNodeCallback(web3.eth.getBlock)(e.blockNumber).pipe(
    //       map(curry(mappers[MTHistoryEventKind.kick])(e)),
    //     )),
    //     reduce<[MTHistoryEvent, [string, string]], [MTHistoryEvent[], Array<[string, string]>]>(
    //       ([a1, a2], [e1, e2]) => [[...a1, e1], [...a2, e2]], [[], []]
    //     ),
    //   )),
    //   map(([kicks, urns]) => [kicks, fromPairs(urns) as {[key: string]: any}]),
    //   switchMap(([kicks, urns]) => combineLatest(
    //     bindNodeCallback(
    //       filters[MTHistoryEventKind.bite].get.bind(filters[MTHistoryEventKind.bite])
    //     )().pipe(
    //       switchMap((events: Array<{blockNumber: string, args: any}>) => of(...events).pipe(
    //         concatMap(e => bindNodeCallback(web3.eth.getBlock)(e.blockNumber).pipe(
    //           map(curry(mappers[MTHistoryEventKind.bite])(e)),
    //         )),
    //         reduce((a, e) => a.concat(e), []),
    //       )),
    //     ),
    //     of(kicks),
    //     bindNodeCallback(
    //       filters[MTHistoryEventKind.tend].get.bind(filters[MTHistoryEventKind.tend])
    //     )().pipe(
    //       switchMap((events: Array<{blockNumber: string, args: any}>) => of(...events).pipe(
    //         concatMap(e => bindNodeCallback(web3.eth.getBlock)(e.blockNumber).pipe(
    //           map(curry(mappers[MTHistoryEventKind.tend])(e)),
    //           filter(note =>
    //             urns[(note as MTLiquidationEvent).id.toString()] === bytes32(proxy.address)
    //           ),
    //         )),
    //         reduce((a, e) => a.concat(e), []),
    //       )),
    //     ),
    //     bindNodeCallback(
    //       filters[MTHistoryEventKind.dent].get.bind(filters[MTHistoryEventKind.dent])
    //     )().pipe(
    //       switchMap((events: Array<{blockNumber: string, args: any}>) => of(...events).pipe(
    //         concatMap(e => bindNodeCallback(web3.eth.getBlock)(e.blockNumber).pipe(
    //           map(curry(mappers[MTHistoryEventKind.dent])(e)),
    //           filter(note =>
    //             urns[(note as MTLiquidationEvent).id.toString()] === bytes32(proxy.address)
    //           ),
    //         )),
    //         reduce((a, e) => a.concat(e), []),
    //       )),
    //     ),
    //     bindNodeCallback(
    //       filters[MTHistoryEventKind.deal].get.bind(filters[MTHistoryEventKind.deal])
    //     )().pipe(
    //       switchMap((events: Array<{blockNumber: string, args: any}>) => of(...events).pipe(
    //         concatMap(e => bindNodeCallback(web3.eth.getBlock)(e.blockNumber).pipe(
    //           map(curry(mappers[MTHistoryEventKind.deal])(e)),
    //           filter(
    //             note =>
    //               urns[(note as MTLiquidationEvent).id.toString()] === bytes32(proxy.address)
    //           ),
    //         )),
    //         reduce((a, e) => a.concat(e), []),
    //       )),
    //     ),
    //   )),
    //   map((events: MTHistoryEvent[][]) => unnest(events)),
    // )
  ).pipe(
    map((events: MTHistoryEvent[][]) => unnest(events)),
    map((events: MTHistoryEvent[]) => events.sort((e1, e2) => e1.timestamp - e2.timestamp)),
  );
}
