import { BigNumber } from 'bignumber.js';
import { Observable } from 'rxjs/internal/Observable';
import { map } from 'rxjs/operators';

import { MTAccount, MTAccountState } from '../marginTrading/state/mtAccount';
import { zero } from '../utils/zero';

export type MTSummary = {
  state: MTAccountState.notSetup;
} | {
  state: MTAccountState.setup;
  totalDebt: BigNumber;
  totalEquity: BigNumber;
  totalCurrentLeverage?: BigNumber;
};

export function calculateMTSummary(mta: MTAccount): MTSummary {
  if (mta.state !== MTAccountState.setup) {
    return {
      state: MTAccountState.notSetup
    };
  }
  const totalDebt = mta.marginableAssets
    .reduce(
      (sum, asset) => sum.plus(asset.debt),
      zero
    );
  const totalEquity = mta.marginableAssets
    .reduce(
      (sum, asset) => sum.plus(asset.balanceInCash),
      zero
    )
    .plus(mta.nonMarginableAssets.reduce(
      (sum, asset) => sum.plus(asset.balanceInCash),
      zero
    ))
    .plus(mta.cash.marginBalance);

  const totalCurrentLeverage = totalEquity.eq(totalDebt) ?
    undefined :
    (totalEquity).dividedBy(totalEquity.minus(totalDebt));

  return {
    totalDebt,
    totalEquity,
    totalCurrentLeverage,
    state: MTAccountState.setup,
  };
}

export function createMTSummary$(
    mta$: Observable<MTAccount>,
): Observable<MTSummary> {
  return mta$.pipe(
    map((mta) => calculateMTSummary(mta))
  );
}
