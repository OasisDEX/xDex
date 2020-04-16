import apolloBoost, { gql } from 'apollo-boost';
import { BigNumber } from 'bignumber.js';
import { from, Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { NetworkConfig } from '../../blockchain/config';
import { MTHistoryEvent } from './mtAccount';

export type RawMTHistoryEvent = Exclude<MTHistoryEvent, 'dAmount' | 'dDAIAmount'>;

export function createRawMTHistoryFromCache(
  proxy: string,
  context: NetworkConfig,
  token: string,
): Observable<RawMTHistoryEvent[]> {
  const client = new apolloBoost({
    uri: context.oasisDataService.url,
  });

  const q = gql`
    query allLeveragedEvents($token: String, $proxy: String) {
      allLeveragedEvents(filter: { ilk: { equalTo: $token }, owner: { equalTo: $proxy } }) {
        nodes {
          type
          ilk
          amount
          payAmount
          minPayAmount
          maxPayAmount
          dgem
          ddai
          auctionId
          lot
          bid
          ink
          tab
          timestamp
          price
        }
      }
    }
  `;

  const variables = {
    // devMode: config.devMode,
    proxy: proxy.toLowerCase(),
    token: context.mcd.ilks[token],
  };

  return from(client.query({ variables, query: q })).pipe(
    map((result: any) =>
      result.data.allLeveragedEvents.nodes.map(
        ({
          type,
          ilk,
          amount,
          payAmount,
          minPayAmount,
          maxPayAmount,
          dgem,
          ddai,
          auctionId,
          lot,
          bid,
          ink,
          tab,
          timestamp,
          price,
        }: any) => ({
          ilk,
          timestamp,
          amount: new BigNumber(amount),
          payAmount: payAmount ? new BigNumber(payAmount) : undefined,
          maxPayAmount: maxPayAmount ? new BigNumber(maxPayAmount) : undefined,
          minPayAmount: minPayAmount ? new BigNumber(minPayAmount) : undefined,
          dgem: new BigNumber(dgem),
          ddai: new BigNumber(ddai),
          auctionId: new BigNumber(auctionId),
          lot: new BigNumber(lot),
          bid: new BigNumber(bid),
          ink: new BigNumber(ink),
          tab: new BigNumber(tab),
          kind: type,
          token: ilk,
          price: price ? new BigNumber(price) : undefined,
        }),
      ),
    ),
  );
}
