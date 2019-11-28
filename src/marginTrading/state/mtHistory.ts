import apolloBoost, { gql } from 'apollo-boost';
import { BigNumber } from 'bignumber.js';
import { from, Observable, throwError } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';

import { NetworkConfig } from '../../blockchain/config';
import { MTHistoryEvent } from './mtAccount';

export type RawMTHistoryEvent = Exclude<MTHistoryEvent, 'dAmount' | 'dDAIAmount' >;

export function createRawMTHistoryFromCache(
  proxy: string,
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
      owner: {equalTo: $proxy}
      }
      ) {
        nodes {
          type
          ilk
          amount
          payAmount
          dgem
          ddai
          auctionId
          lot
          bid
          timestamp
        }
      }
    }
  `;

  const variables = {
    // devMode: config.devMode,
    proxy,
    token: context.ilks[token],
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
        auctionId,
        lot,
        bid,
        timestamp
      }: any) => ({
        ilk,
        timestamp,
        amount: new BigNumber(amount),
        payAmount: new BigNumber(payAmount),
        dgem:  new BigNumber(dgem),
        ddai:  new BigNumber(ddai),
        auctionId: new BigNumber(auctionId),
        lot: new BigNumber(lot),
        bid: new BigNumber(bid),
        kind: type,
        token: ilk
      })),
    ),
    // tap(x => console.log(token, context.ilks[token], x))
  );
}
