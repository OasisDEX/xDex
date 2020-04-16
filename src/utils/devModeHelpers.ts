import { BigNumber } from 'bignumber.js'
import { concat, range } from 'lodash'
import { Dictionary } from 'ramda'
import { combineLatest, identity, Observable, of } from 'rxjs'
import { first, flatMap, tap } from 'rxjs/operators'
import { Calls$, ReadCalls$ } from '../blockchain/calls/calls'
import { NetworkConfig } from '../blockchain/config'
import { MTAccount } from '../marginTrading/state/mtAccount'
import { createProxyAddress$, readOsm } from '../marginTrading/state/mtAggregate'

export function pluginDevModeHelpers(
  context$: Observable<NetworkConfig>,
  calls$: Calls$,
  readCalls$: ReadCalls$,
  initializedAccount$: Observable<string>,
  onEveryBlock$: Observable<number>,
  mta$: Observable<MTAccount>,
) {
  ;(window as any).removeProxy = () =>
    calls$
      .pipe(
        flatMap((calls) =>
          calls.proxyAddress().pipe(
            flatMap((proxyAddress) => {
              if (!proxyAddress) {
                console.log('Proxy not found!')
                return of()
              }
              console.log('proxyAddress:', proxyAddress)
              return calls.setOwner({
                proxyAddress,
                ownerAddress: '0x0000000000000000000000000000000000000000',
              })
            }),
          ),
        ),
      )
      .subscribe(identity)

  ;(window as any).disapproveProxy = (token: string) =>
    calls$
      .pipe(
        flatMap((calls) =>
          calls.proxyAddress().pipe(
            flatMap((proxyAddress) => {
              if (!proxyAddress) {
                console.log('Proxy not found!')
                return of()
              }
              console.log('proxyAddress:', proxyAddress)
              return calls.disapproveProxy({
                proxyAddress,
                token,
              })
            }),
          ),
        ),
      )
      .subscribe(identity)

  ;(window as any).previewLinearOffers = (
    baseToken: string,
    quoteToken: string,
    midPrice: number,
    delta: number,
    baseAmount: number,
    count: number,
  ) => {
    const item = ({ pr, am }: { pr: number | string; am: number | string }) => ({
      [`PRICE ${quoteToken}`]: pr,
      [`AMOUNT ${baseToken}`]: am,
    })
    console.table(
      concat(
        range(1, count + 1)
          .map((i) => item({ pr: midPrice + i * delta, am: baseAmount }))
          .reverse(),
        [item({ pr: '---', am: '(spread)' })],
        range(1, count + 1).map((i) => item({ pr: midPrice - i * delta, am: baseAmount })),
      ),
    )
    console.log('requires', {
      [baseToken]: baseAmount * count,
      [quoteToken]: baseAmount * count * (midPrice - (delta * (count + 1)) / 2),
    })
  }

  ;(window as any).makeLinearOffers = (
    baseToken: string,
    quoteToken: string,
    midPrice: number,
    delta: number,
    baseAmount: number,
    count: number,
  ) =>
    calls$
      .pipe(
        first(),
        flatMap((calls) =>
          createProxyAddress$(context$, initializedAccount$, onEveryBlock$).pipe(
            first(),
            tap((proxyAddress) => console.log({ proxyAddress })),
            flatMap((proxyAddress) => {
              if (!proxyAddress) {
                console.log('Proxy not found!')
                return of()
              }
              return calls.makeLinearOffers({
                baseToken,
                quoteToken,
                midPrice,
                delta,
                baseAmount,
                count,
                proxyAddress,
              })
            }),
          ),
        ),
      )
      .subscribe(identity)

  ;(window as any).cancelAllOffers = (baseToken: string, quoteToken: string) =>
    calls$
      .pipe(
        first(),
        flatMap((calls) =>
          createProxyAddress$(context$, initializedAccount$, onEveryBlock$).pipe(
            first(),
            tap((proxyAddress) => console.log({ proxyAddress })),
            flatMap((proxyAddress) => {
              if (!proxyAddress) {
                console.log('Proxy not found!')
                return of()
              }
              return calls.cancelAllOffers({ baseToken, quoteToken, proxyAddress })
            }),
          ),
        ),
      )
      .subscribe(identity)

  ;(window as any).export = (token: string) =>
    calls$
      .pipe(
        first(),
        flatMap((calls) =>
          createProxyAddress$(context$, initializedAccount$, onEveryBlock$).pipe(
            first(),
            tap((proxyAddress) => console.log({ proxyAddress })),
            flatMap((proxyAddress) => {
              if (!proxyAddress) {
                console.log('Proxy not found!')
                return of()
              }
              return calls.mtExport({ token, proxyAddress })
            }),
          ),
        ),
      )
      .subscribe(identity)

  ;(window as any).drip = (token: string) =>
    calls$
      .pipe(
        first(),
        flatMap((calls) => calls.drip({ token })),
      )
      .subscribe(identity)

  ;(window as any).readPrice = (token: string) =>
    readCalls$
      .pipe(
        first(),
        flatMap((calls) => calls.readPrice({ token })),
        tap((price) => console.log(price.toString())),
      )
      .subscribe(identity)

  ;(window as any).changePrice = (token: string, price: number) =>
    calls$
      .pipe(
        first(),
        flatMap((calls) => calls.changePrice({ token, price })),
      )
      .subscribe(identity)

  ;(window as any).changePriceAndPoke = (token: string, price: number) =>
    calls$
      .pipe(
        first(),
        flatMap((calls) => calls.changePriceAndPoke({ token, price })),
      )
      .subscribe(identity)

  ;(window as any).printOsmInfo = (token: string) =>
    calls$
      .pipe(
        first(),
        flatMap((calls) => calls.printOsmInfo({ token })),
      )
      .subscribe(identity)

  ;(window as any).readOsm = (token: string) =>
    context$
      .pipe(
        first(),
        flatMap((context) => readOsm(context, token)),
        tap(({ next }) => console.log({ next: next && next.toString() })),
      )
      .subscribe(identity)

  ;(window as any).pokeOsm = (token: string) =>
    calls$
      .pipe(
        first(),
        flatMap((calls) => calls.pokeOsm({ token })),
      )
      .subscribe(identity)

  ;(window as any).pokeSpotter = (token: string) =>
    calls$
      .pipe(
        first(),
        flatMap((calls) => calls.pokeSpotter({ token })),
      )
      .subscribe(identity)

  ;(window as any).mtaDetails = () =>
    mta$.subscribe((mta) => {
      if (mta) {
        const ma = mta.marginableAssets[0]
        const maTable: Dictionary<any> = {}
        maTable.proxy = mta.proxy?._address
        maTable.daiAllowance = mta.daiAllowance
        if (ma) {
          for (const [key, value] of Object.entries(ma)) {
            if (typeof value === 'string' || typeof value === 'boolean') {
              maTable[key] = value
            }
            if (value instanceof BigNumber) {
              maTable[key] = value.toString()
            }
          }
          console.table(maTable)
        }
      }
    })

  console.log('Dev mode helpers installed!')

  ;(window as any).cancelAllOffers = (baseToken: string, quoteToken: string) =>
    calls$
      .pipe(
        first(),
        flatMap((calls) =>
          createProxyAddress$(context$, initializedAccount$, onEveryBlock$).pipe(
            first(),
            tap((proxyAddress) => console.log({ proxyAddress })),
            flatMap((proxyAddress) => {
              if (!proxyAddress) {
                console.log('Proxy not found!')
                return of()
              }
              return calls.cancelAllOffers({ baseToken, quoteToken, proxyAddress })
            }),
          ),
        ),
      )
      .subscribe(identity)
  ;(window as any).proxyERC20Balance = (token: string) =>
    combineLatest(readCalls$, calls$)
      .pipe(
        flatMap(([readCalls, calls]) =>
          calls.proxyAddress().pipe(
            flatMap((proxyAddress) => {
              if (!proxyAddress) {
                return of()
              }
              console.log('proxyAddress:', proxyAddress)
              return readCalls.proxyERC20Balance({ proxyAddress, token })
            }),
            tap((balance) => console.log(balance.toString())),
          ),
        ),
      )
      .subscribe(identity)
  ;(window as any).recoverERC20 = (token: string) =>
    calls$
      .pipe(
        flatMap((calls) =>
          calls.proxyAddress().pipe(
            flatMap((proxyAddress) => {
              if (!proxyAddress) {
                return of()
              }
              return calls.recoverERC20({ proxyAddress, token })
            }),
          ),
        ),
      )
      .subscribe(identity)
}
