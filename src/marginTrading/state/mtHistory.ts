import apolloBoost, { gql } from 'apollo-boost';
import { BigNumber } from 'bignumber.js';
import { from, Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { NetworkConfig } from '../../blockchain/config';
import { MTHistoryEvent } from './mtAccount';

// export function bytes32(hex: string): string {
//   const a = hex.match(/^0x(.*)$/);
//   if (!a || !a[1]) {
//     throw new Error('malformed hex value: ' + hex);
//   }
//   if (a[1].length > 64) {
//     throw new Error('hex value overflow: ' + hex);
//   }
//   return `0x${'0'.repeat((64 - a[1].length))}${a[1]}`;
// }
//
// function subBytes(hex: string, start: number, length?: number): string {
//   const a = hex.match(/^0x(.*)$/);
//   if (!a || !a[1]) {
//     throw new Error('malformed hex value: ' + hex);
//   }
//   return `0x${a[1].substr(2 * start, length && 2 * length)}`;
// }
//
// const marginEventFilter = (Event: any, context: NetworkConfig, token: string) => Event(
//   { token: context.tokens[token].address },
//   { fromBlock: context.startingBlock },
// );

// const eventFilters: (
//   proxy: any, context: NetworkConfig, token: string, marginAccount: any
// ) => {[key in MTHistoryEventKind]: any} = (proxy, context, token, marginAccount) => {
//   return ({
//     [MTHistoryEventKind.fundGem]: marginEventFilter(marginAccount.FundGem, context, token),
//     [MTHistoryEventKind.fundDai]: marginEventFilter(marginAccount.FundDai, context, token),
//     [MTHistoryEventKind.drawGem]: marginEventFilter(marginAccount.DrawGem, context, token),
//     [MTHistoryEventKind.drawDai]: marginEventFilter(marginAccount.DrawDai, context, token),
//     [MTHistoryEventKind.adjust]: marginEventFilter(marginAccount.Adjust, context, token),
//     [MTHistoryEventKind.buyLev]: marginEventFilter(marginAccount.BuyLev, context, token),
//     [MTHistoryEventKind.sellLev]: marginEventFilter(marginAccount.SellLev, context, token),
//     [MTHistoryEventKind.bite]: context.mcd.cat.contract.Bite(
//     { urn: bytes32(proxy.address), ilk: context.ilks[token] },
//     { fromBlock: context.startingBlock },
//   ),
//     [MTHistoryEventKind.kick]: context.mcd.flip[token].contract.Kick(
//     { urn: bytes32(proxy.address) },
//     { fromBlock: context.startingBlock },
//   ),
//     [MTHistoryEventKind.tend]: context.mcd.flip[token].contract.LogNote(
//     { sig: subBytes(context.mcd.flip[token].contract.tend.getData(0, 0, 0), 0, 4) },
//     { fromBlock: context.startingBlock },
//   ),
//     [MTHistoryEventKind.dent]: context.mcd.flip[token].contract.LogNote(
//     { sig: subBytes(context.mcd.flip[token].contract.dent.getData(0, 0, 0), 0, 4) },
//     { fromBlock: context.startingBlock },
//   ),
//     [MTHistoryEventKind.deal]: context.mcd.flip[token].contract.LogNote(
//     { sig: subBytes(context.mcd.flip[token].contract.deal.getData(0), 0, 4) },
//     { fromBlock: context.startingBlock },
//   ),
//   });
// };

// const eventMappers: (token: string) => {[key in MTHistoryEventKind]: (
//   event: {blockNumber: string, args: any},
//   block: { timestamp: number },
// ) => MTHistoryEvent | any[]} = (token) => ({
//   [MTHistoryEventKind.fundGem]: (
//     event: {blockNumber: string, args: any},
//     block: { timestamp: number },
//   ) => ({
//     token,
//     timestamp: block.timestamp,
//     kind: MTHistoryEventKind.fundGem,
//     amount: amountFromWei(event.args.amount, token),
//   } as MTHistoryEvent),
//   [MTHistoryEventKind.fundDai]: (
//     event: {blockNumber: string, args: any},
//     block: { timestamp: number },
//   ) => ({
//     token,
//     timestamp: block.timestamp,
//     kind: MTHistoryEventKind.fundDai,
//     amount: amountFromWei(event.args.amount, token),
//   } as MTHistoryEvent),
//   [MTHistoryEventKind.drawGem]: (
//     event: {blockNumber: string, args: any},
//     block: { timestamp: number },
//   ) => ({
//     token,
//     timestamp: block.timestamp,
//     kind: MTHistoryEventKind.drawGem,
//     amount: amountFromWei(event.args.amount, token),
//   } as MTHistoryEvent),
//   [MTHistoryEventKind.drawDai]: (
//     event: {blockNumber: string, args: any},
//     block: { timestamp: number },
//   ) => ({
//     token,
//     timestamp: block.timestamp,
//     kind: MTHistoryEventKind.drawDai,
//     amount: amountFromWei(event.args.amount, token),
//   } as MTHistoryEvent),
//   [MTHistoryEventKind.adjust]: (
//     event: {blockNumber: string, args: any},
//     block: { timestamp: number },
//   ) => ({
//     token,
//     timestamp: block.timestamp,
//     kind: MTHistoryEventKind.adjust,
//     dgem: amountFromWei(event.args.dgem, token),
//     ddai: amountFromWei(event.args.ddai, 'DAI'),
//   } as MTHistoryEvent),
//   [MTHistoryEventKind.buyLev]: (
//     event: {blockNumber: string, args: any},
//     block: { timestamp: number },
//   ) => ({
//     token,
//     timestamp: block.timestamp,
//     kind: MTHistoryEventKind.buyLev,
//     amount: amountFromWei(event.args.amount, token),
//     payAmount: amountFromWei(event.args.maxPayAmount, 'DAI'),
//   } as MTHistoryEvent),
//   [MTHistoryEventKind.sellLev]: (
//     event: {blockNumber: string, args: any},
//     block: { timestamp: number },
//   ) => ({
//     token,
//     timestamp: block.timestamp,
//     kind: MTHistoryEventKind.sellLev,
//     amount: amountFromWei(event.args.amount, token),
//     payAmount: amountFromWei(event.args.minPayAmount, 'DAI'),
//   } as MTHistoryEvent),
//   [MTHistoryEventKind.bite]: (
//     event: {blockNumber: string, args: any},
//     block: { timestamp: number },
//   ) => ({
//     token,
//     timestamp: block.timestamp,
//     kind: MTHistoryEventKind.bite,
//     id: event.args.flip,
//     gem: amountFromWei(event.args.ink, token),
//     dai: amountFromWei(event.args.tab, 'DAI'),
//   } as MTHistoryEvent),
//   [MTHistoryEventKind.kick]: (
//     event: {blockNumber: string, args: any},
//     block: { timestamp: number },
//   ) => [{
//     token,
//     timestamp: block.timestamp,
//     kind: MTHistoryEventKind.kick,
//     id: event.args.id,
//     gem: amountFromWei(event.args.lot, token),
//     dai: amountFromWei(event.args.tab, 'DAI'),
//   } as MTHistoryEvent, [event.args.id.toString(), event.args.urn]],
//   [MTHistoryEventKind.tend]: (
//     event: {blockNumber: string, args: any},
//     block: { timestamp: number },
//   ) => ({
//     token,
//     timestamp: block.timestamp,
//     kind: MTHistoryEventKind.tend,
//     id: new BigNumber(web3.toDecimal(subBytes(event.args.fax, 4, 32))),
//     gem: amountFromWei(
//       new BigNumber(web3.toDecimal(subBytes(event.args.fax, 36, 32))), token
//     ),
//     dai: amountFromWei(
//       new BigNumber(web3.toDecimal(subBytes(event.args.fax, 68, 32))), 'DAI'
//     ),
//   } as MTHistoryEvent),
//   [MTHistoryEventKind.dent]: (
//     event: {blockNumber: string, args: any},
//     block: { timestamp: number },
//   ) => ({
//     token,
//     timestamp: block.timestamp,
//     kind: MTHistoryEventKind.dent,
//     id: new BigNumber(web3.toDecimal(subBytes(event.args.fax, 4, 32))),
//     gem: amountFromWei(
//       new BigNumber(web3.toDecimal(subBytes(event.args.fax, 36, 32))), token
//     ),
//     dai: amountFromWei(
//       new BigNumber(web3.toDecimal(subBytes(event.args.fax, 68, 32))), 'DAI'
//     ),
//   } as MTHistoryEvent),
//   [MTHistoryEventKind.deal]: (
//     event: {blockNumber: string, args: any},
//     block: { timestamp: number },
//   ) => ({
//     token,
//     timestamp: block.timestamp,
//     kind: MTHistoryEventKind.deal,
//     id: new BigNumber(web3.toDecimal(subBytes(event.args.fax, 4, 32))),
//   } as MTHistoryEvent),
// });

export interface RawMTLiquidationHistoryEvent {
  type: string;
  auctionId: number;
  lot: BigNumber;
  bid: BigNumber;
  tab: BigNumber;
  timestamp: number;
}

export type RawMTHistoryEvent = Exclude<MTHistoryEvent, 'dAmount' | 'dDAIAmount' >;

export function createRawMTLiquidationHistoryFromCache(
  context: NetworkConfig,
  urn: string,
): Observable<RawMTLiquidationHistoryEvent[]> {
  const client = new apolloBoost({
    uri: context.oasisDataService.url,
  });

  const q = gql`
    query allLeveragedLiquidationEvents($urn: String) {
      allLeveragedLiquidationEvents(filter: {
        urn: {equalTo: $urn}
      }) {
        nodes {
          type
          auctionId
          lot
          bid
          tab
          timestamp
        }
      }
    }
  `;

  const variables = {
    // devMode: config.devMode,
    urn,
  };

  return from(client.query({ variables, query: q })).pipe(
    map((result: any) =>
      result.data.allLeveragedLiquidationEvents.nodes.map(({
        type,
        auctionId,
        lot,
        bid,
        tab,
        timestamp,
      }: any) => ({
        type,
        auctionId,
        timestamp,
        lot: new BigNumber(lot),
        bid: new BigNumber(bid),
        tab: new BigNumber(tab),
      })),
    ),
  );
}

export function createRawMTHistoryFromCache(
  proxy: any,
  context: NetworkConfig,
  token: string
): Observable<RawMTHistoryEvent[]> {
  const client = new apolloBoost({
    uri: context.oasisDataService.url,
  });

  const q = gql`
    query allLeveragedEvents($token: String, $proxy: String) {
      allLeveragedEvents(
      filter: {
      ilk: {equalTo: $token },
      address: {equalTo: $proxy}
      }
      ) {
        nodes {
          type
          ilk
          amount
          payAmount
          dgem
          ddai
          timestamp
        }
      }
    }
  `;

  const variables = {
    // devMode: config.devMode,
    token: context.ilks[token],
    proxy: proxy.address
  };

  return from(client.query({ variables, query: q })).pipe(
    map((result: any) =>
      result.data.allLeveragedEvents.nodes.map(({
        type,
        ilk,
        amount,
        payAmount,
        dgem,
        ddai,
        timestamp
      }: any) => ({
        ilk,
        timestamp,
        amount: new BigNumber(amount),
        payAmount: new BigNumber(payAmount),
        dgem:  new BigNumber(dgem),
        ddai:  new BigNumber(ddai),
        kind: type,
        token: ilk
      })),
    ),
  );
}

// export function createRawMTHistory(
//   proxy: any,
//   context: NetworkConfig,
//   token: string,
// ): Observable<RawMTHistoryEvent[]> {
//
//   const marginAccount = web3.eth.contract(proxyActions as any).at(proxy.address);
//   const filters = eventFilters(proxy, context, token, marginAccount);
//   const mappers = eventMappers(token);
//
//   const fetchMarginEvents = [
//     MTHistoryEventKind.fundGem,
//     MTHistoryEventKind.fundDai,
//     MTHistoryEventKind.drawGem,
//     MTHistoryEventKind.drawDai,
//     MTHistoryEventKind.adjust,
//     MTHistoryEventKind.buyLev,
//     MTHistoryEventKind.sellLev,
//   ].map(event =>
//     bindNodeCallback(
//       filters[event].get.bind(filters[event])
//     )().pipe(
//       switchMap((events: Array<{blockNumber: string, args: any}>) => of(...events).pipe(
//         concatMap(e => bindNodeCallback(web3.eth.getBlock)(e.blockNumber).pipe(
//           map(curry(mappers[event])(e)),
//         )),
//         reduce((a, e) => a.concat(e), []),
//       )),
//     )
//   );
//
//   return combineLatest(
//     ...fetchMarginEvents,
//     // bindNodeCallback(
//     //   filters[MTHistoryEventKind.kick].get.bind(filters[MTHistoryEventKind.kick])
//     // )().pipe(
//     //   switchMap((events: Array<{blockNumber: string, args: any}>) => of(...events).pipe(
//     //     concatMap(e => bindNodeCallback(web3.eth.getBlock)(e.blockNumber).pipe(
//     //       map(curry(mappers[MTHistoryEventKind.kick])(e)),
//     //     )),
//     //   reduce<[MTHistoryEvent, [string, string]], [MTHistoryEvent[], Array<[string, string]>]>(
//     //       ([a1, a2], [e1, e2]) => [[...a1, e1], [...a2, e2]], [[], []]
//     //     ),
//     //   )),
//     //   map(([kicks, urns]) => [kicks, fromPairs(urns) as {[key: string]: any}]),
//     //   switchMap(([kicks, urns]) => combineLatest(
//     //     bindNodeCallback(
//     //       filters[MTHistoryEventKind.bite].get.bind(filters[MTHistoryEventKind.bite])
//     //     )().pipe(
//     //       switchMap((events: Array<{blockNumber: string, args: any}>) => of(...events).pipe(
//     //         concatMap(e => bindNodeCallback(web3.eth.getBlock)(e.blockNumber).pipe(
//     //           map(curry(mappers[MTHistoryEventKind.bite])(e)),
//     //         )),
//     //         reduce((a, e) => a.concat(e), []),
//     //       )),
//     //     ),
//     //     of(kicks),
//     //     bindNodeCallback(
//     //       filters[MTHistoryEventKind.tend].get.bind(filters[MTHistoryEventKind.tend])
//     //     )().pipe(
//     //       switchMap((events: Array<{blockNumber: string, args: any}>) => of(...events).pipe(
//     //         concatMap(e => bindNodeCallback(web3.eth.getBlock)(e.blockNumber).pipe(
//     //           map(curry(mappers[MTHistoryEventKind.tend])(e)),
//     //           filter(note =>
//     //             urns[(note as MTLiquidationEvent).id.toString()] === bytes32(proxy.address)
//     //           ),
//     //         )),
//     //         reduce((a, e) => a.concat(e), []),
//     //       )),
//     //     ),
//     //     bindNodeCallback(
//     //       filters[MTHistoryEventKind.dent].get.bind(filters[MTHistoryEventKind.dent])
//     //     )().pipe(
//     //       switchMap((events: Array<{blockNumber: string, args: any}>) => of(...events).pipe(
//     //         concatMap(e => bindNodeCallback(web3.eth.getBlock)(e.blockNumber).pipe(
//     //           map(curry(mappers[MTHistoryEventKind.dent])(e)),
//     //           filter(note =>
//     //             urns[(note as MTLiquidationEvent).id.toString()] === bytes32(proxy.address)
//     //           ),
//     //         )),
//     //         reduce((a, e) => a.concat(e), []),
//     //       )),
//     //     ),
//     //     bindNodeCallback(
//     //       filters[MTHistoryEventKind.deal].get.bind(filters[MTHistoryEventKind.deal])
//     //     )().pipe(
//     //       switchMap((events: Array<{blockNumber: string, args: any}>) => of(...events).pipe(
//     //         concatMap(e => bindNodeCallback(web3.eth.getBlock)(e.blockNumber).pipe(
//     //           map(curry(mappers[MTHistoryEventKind.deal])(e)),
//     //           filter(
//     //             note =>
//     //               urns[(note as MTLiquidationEvent).id.toString()] === bytes32(proxy.address)
//     //           ),
//     //         )),
//     //         reduce((a, e) => a.concat(e), []),
//     //       )),
//     //     ),
//     //   )),
//     //   map((events: MTHistoryEvent[][]) => unnest(events)),
//     // )
//   ).pipe(
//     map((events: MTHistoryEvent[][]) => unnest(events)),
//     map((events: MTHistoryEvent[]) => events.sort((e1, e2) => e1.timestamp - e2.timestamp)),
//   );
// }
