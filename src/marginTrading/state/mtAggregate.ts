import { BigNumber } from 'bignumber.js';
import { bindNodeCallback, combineLatest, Observable, of } from 'rxjs/index';
import {
  distinctUntilChanged,
  exhaustMap,
  map,
  mergeMap,
  shareReplay, startWith,
  switchMap
} from 'rxjs/operators';
import * as dsProxy from '../../blockchain/abi/ds-proxy.abi.json';
import { AssetKind, NetworkConfig, tokens } from '../../blockchain/config';
import { web3 } from '../../blockchain/web3';

import { ReadCalls, ReadCalls$ } from '../../blockchain/calls/calls';

import { flatten } from 'lodash';
import { MTAccount, MTAccountNotSetup, MTAccountSetup, MTAccountState } from './mtAccount';
import { calculateMTAccount, } from './mtCalculate';
import { createMTHistory, createMTHistory2, MTHistoryEvent } from './mtHistory';
import { getCashCore, getMarginableCore, getNonMarginableCore } from './mtTestUtils';

export function aggregateMTAccountState(
  proxy: any,
  calls: ReadCalls,
  context: NetworkConfig
): Observable<MTAccountSetup> {

  const assetNames: string[] = Object.values(tokens)
    .filter((t: any) =>
      t.assetKind === AssetKind.marginable ||
      t.assetKind === AssetKind.nonMarginable // ||
      // t.symbol === 'DAI'
    )
    .map(t => t.symbol);

  const marginableAssetNames: string[] = Object.values(tokens)
    .filter((t: any) => t.assetKind === AssetKind.marginable)
    .map(t => t.symbol);

  const tokenNames = [...assetNames, 'DAI'];

  return combineLatest(
    calls.mtBalance({ tokens: tokenNames, proxyAddress: proxy.address }),
    combineLatest(
      ...marginableAssetNames.map(token => createMTHistory(proxy, context, token))
    ).pipe(
      map(flatten)
    )
  ).pipe(
    map(([balanceResult, events]) => {
      const marginables = [...tokenNames.entries()]
        .filter(([_i, token]) => tokens[token].assetKind === AssetKind.marginable)
        .map(([i, token]) => {
          return getMarginableCore({
            name: token,
            assetKind: AssetKind.marginable,
            balance: balanceResult.assets[i].urnBalance,
            ...balanceResult.assets[i],
            safeCollRatio: new BigNumber(tokens[token].safeCollRatio as number),
            rate: new BigNumber(14.33), // todo: get interest rate from smart contract
            history: events.filter(e => e.token === token)
          });
        });

      const nonMarginables = [...tokenNames.entries()]
        .filter(([_i, token]) => tokens[token].assetKind === AssetKind.nonMarginable)
        .map(([i, token]) => {
          // console.log(
          //   token,
          //   result.assets[i].urnBalance.toString(),
          //   result.assets[i].walletBalance.toString(),
          //   result.assets[i].marginBalance.toString()
          // );
          return getNonMarginableCore({
            name: token,
            assetKind: AssetKind.nonMarginable,
            balance: balanceResult.assets[i].marginBalance,
            walletBalance: balanceResult.assets[i].walletBalance,
            marginBalance: balanceResult.assets[i].marginBalance,
            referencePrice: balanceResult.assets[i].referencePrice,
            allowance: balanceResult.assets[i].allowance,
          });
        });

      const cashResult = balanceResult.assets[balanceResult.assets.length - 1];

      const cash = getCashCore({
        balance: cashResult.marginBalance,
        marginBalance: cashResult.marginBalance,
        allowance: cashResult.allowance,
        walletBalance: cashResult.walletBalance
      });

      return calculateMTAccount(proxy, cash, marginables, nonMarginables);
    })
  );
}

const notSetup: MTAccountNotSetup = { state: MTAccountState.notSetup };

const nullAddress = '0x0000000000000000000000000000000000000000';

function createProxyAddress$(
  context$: Observable<NetworkConfig>,
  initializedAccount$: Observable<string>,
  onEveryBlock$: Observable<number>
): Observable<string | undefined> {
  return combineLatest(context$, initializedAccount$, onEveryBlock$).pipe(
    exhaustMap(
      ([context, account]) => {
        return bindNodeCallback(context.marginProxyRegistry.contract.proxies)(account).pipe(
          mergeMap((proxyAddress: string) => {
            if (proxyAddress === nullAddress) {
              return of(undefined);
            }
            const proxy = web3.eth.contract(dsProxy as any).at(proxyAddress);
            return bindNodeCallback(proxy.owner)().pipe(
              mergeMap((ownerAddress: string) =>
                ownerAddress === account ?
                  of(proxyAddress) :
                  of(undefined)
              )
            );
          })
        );
      }
    ),
    distinctUntilChanged()
  );
}

export function createMta$(
  context$: Observable<NetworkConfig>,
  initializedAccount$: Observable<string>,
  onEveryBlock$: Observable<number>,
  calls$: ReadCalls$,
): Observable<MTAccount> {

  const proxyAddress$ = createProxyAddress$(context$, initializedAccount$, onEveryBlock$);

  const mtAccount$: Observable<MTAccount> = combineLatest(context$, calls$, proxyAddress$).pipe(
    switchMap(([context, calls, proxyAddress]) => {
      if (proxyAddress === undefined) {
        return of(notSetup);
      }
      const proxy = web3.eth.contract(dsProxy as any).at(proxyAddress);
      return onEveryBlock$.pipe(
        switchMap(() => aggregateMTAccountState(proxy, calls, context)),
      );
    }),
    shareReplay(1)
  );

  const marginableNames: string[] = Object.values(tokens)
    .filter((t: any) => t.assetKind === AssetKind.marginable)
    .map(t => t.symbol);

  // let's fetch history temporarily in a separate pipeline
  const mtHistory$ = combineLatest(context$, proxyAddress$, onEveryBlock$).pipe(
    exhaustMap(([context, proxyAddress]) => {
      if (!proxyAddress) {
        return of([]);
      }
      const proxy = web3.eth.contract(dsProxy as any).at(proxyAddress);
      return combineLatest(
        marginableNames.map(token => createMTHistory2(proxy, context, token))
      );
    }),
    startWith(marginableNames.map(() => [] as MTHistoryEvent[])),
    shareReplay(1)
  );

  return combineLatest(mtAccount$, mtHistory$).pipe(
    map(([mta, histories]) =>
      mta.state === MTAccountState.notSetup ?
        mta :
        {
          ...mta,
          marginableAssets: mta.marginableAssets.map(ma => ({
            ...ma,
            history: histories[marginableNames.indexOf(ma.name)]
          }))
        }
    ),
  );
}
