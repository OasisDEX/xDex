import { BigNumber } from 'bignumber.js';
import { identity, Observable, of } from 'rxjs';
import { first, flatMap } from 'rxjs/operators';
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

  console.log('Dev mode helpers installed!');
}