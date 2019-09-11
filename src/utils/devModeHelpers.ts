import { BigNumber } from 'bignumber.js';
import { identity, Observable, of } from 'rxjs';
import { first, flatMap, tap } from 'rxjs/operators';
import { Calls$ } from '../blockchain/calls/calls';
import { NetworkConfig } from '../blockchain/config';
import { web3 } from '../blockchain/web3';
import { createProxyAddress$ } from '../marginTrading/state/mtAggregate';

export function pluginDevModeHelpers(
  context$: Observable<NetworkConfig>,
  calls$: Calls$,
  initializedAccount$: Observable<string>,
  onEveryBlock$: Observable<number>
) {
  (window as any).removeProxy = () =>
    calls$.pipe(
      flatMap(calls =>
        calls.proxyAddress().pipe(
          flatMap(proxyAddress => {
            if (!proxyAddress) {
              console.log('Proxy not found!');
              return of();
            }
            console.log('proxyAddress:', proxyAddress);
            return calls.setOwner({
              proxyAddress,
              ownerAddress: '0x0000000000000000000000000000000000000000'
            });
          })
        )
      )
    ).subscribe(identity);

  (window as any).disapproveProxy = (token: string) =>
    calls$.pipe(
      flatMap(calls =>
        calls.proxyAddress().pipe(
          flatMap(proxyAddress => {
            if (!proxyAddress) {
              console.log('Proxy not found!');
              return of();
            }
            console.log('proxyAddress:', proxyAddress);
            return calls.disapproveProxy({
              proxyAddress, token,
              gasPrice: new BigNumber(web3.eth.gasPrice.toString()),
              gasEstimation: 1000000
            });
          })
        )
      )
    ).subscribe(identity);

  (window as any).removeMTProxy = () => {
    calls$.pipe(
      flatMap(calls =>
        createProxyAddress$(context$, initializedAccount$, onEveryBlock$).pipe(
          first(),
          flatMap(proxyAddress => {
            if (!proxyAddress) {
              console.log('Proxy not found!');
              return of();
            }
            console.log('proxyAddress:', proxyAddress);
            return calls.setOwner({
              proxyAddress,
              ownerAddress: '0x0000000000000000000000000000000000000000'
            });
          })
        )
      )
    ).subscribe(identity);
  };

  (window as any).makeLinearOffers = (
    baseToken: string, quoteToken: string,
    midPrice: number, delta: number, baseAmount: number, count: number,
  ) =>
    calls$.pipe(
      first(),
      flatMap(calls =>
        createProxyAddress$(context$, initializedAccount$, onEveryBlock$).pipe(
          first(),
          tap(proxyAddress => console.log({ proxyAddress })),
          flatMap(proxyAddress => {
            if (!proxyAddress) {
              console.log('Proxy not found!');
              return of();
            }
            return calls.makeLinearOffers(
              { baseToken, quoteToken, midPrice, delta, baseAmount, count, proxyAddress },
            );
          }),
        ),
      )
    ).subscribe(identity);

  (window as any).cancelAllOffers = (
    baseToken: string, quoteToken: string,
  ) =>
    calls$.pipe(
      first(),
      flatMap(calls =>
        createProxyAddress$(context$, initializedAccount$, onEveryBlock$).pipe(
          first(),
          tap(proxyAddress => console.log({ proxyAddress })),
          flatMap(proxyAddress => {
            if (!proxyAddress) {
              console.log('Proxy not found!');
              return of();
            }
            return calls.cancelAllOffers(
              { baseToken, quoteToken, proxyAddress },
            );
          }),
        ),
      )
    ).subscribe(identity);

  console.log('Dev mode helpers installed!');
}
