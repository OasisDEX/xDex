import apolloBoost, { gql } from 'apollo-boost';
import { BigNumber } from 'bignumber.js';
import { from, Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { NetworkConfig } from '../../blockchain/config';
import { MTHistoryEvent } from './mtAccount';

export type RawMTHistoryEvent = Exclude<MTHistoryEvent, 'dAmount' | 'dDAIAmount' >;

export function createRawMTLiquidationHistoryFromCache$(
  context: NetworkConfig,
  urn: string,
): Observable<RawMTHistoryEvent[]> {
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
        lot, // Amount of asset that is up for auction/sale.
        bid, // Current highest bid.
        tab, // total dai wanted
        timestamp,
      }: any) => ({
        timestamp,
        kind: type,
        id: auctionId,
        ...(lot ? { lot: new BigNumber(lot) } : undefined),
        ...(bid ? { lot: new BigNumber(bid) } : undefined),
        ...(tab ? { lot: new BigNumber(tab) } : undefined),
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
