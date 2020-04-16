import { default as BigNumber } from 'bignumber.js';
import classnames from 'classnames';
import * as React from 'react';
import { combineLatest } from 'rxjs';
import { Observable } from 'rxjs/index';
import { first, switchMap } from 'rxjs/internal/operators';
import { map } from 'rxjs/operators';
import { CDPHistoryView } from '../../balances/CDPHistoryView';
import { Calls$ } from '../../blockchain/calls/calls';
import { transactions$, TxState } from '../../blockchain/transactions';
import { formatPrecision } from '../../utils/formatters/format';
import { CryptoMoney, FormatPercent, Money } from '../../utils/formatters/Formatters';
import { ModalOpenerProps } from '../../utils/modal';
import { WarningTooltip } from '../../utils/tooltip/Tooltip';
import { minusOne, one, zero } from '../../utils/zero';
import { findMarginableAsset, MarginableAsset, MTAccount } from '../state/mtAccount';
import { CreateMTFundForm$ } from '../transfer/mtTransferForm';
import * as styles from './MTMyPositionView.scss';

/* tslint:disable */
const stabilityFeeTooltip = `
  This is the annualised fee that is charged against your Dai Debt.
  This fee is variable and is set by MakerDAO Governance.
`;

const liquidationPenaltyTooltip = `
  This is additional fee that you will pay on top of your debt when your position is liquidated.
  There could be also other costs involved depending on the price your collateral is sold for.
`;

const markPriceTooltip = `
  This is price used to determine if your position is safe from liquidation, and comes from Maker Oracles.
  If the Mark Price falls below your Liquidation Price, your position becomes at risk of liquidation.
`;

const collateralBalanceTooltip = (collateral: string) => `
  This is the amount of ${collateral} you currently have locked within your Leverage Account.
  This ${collateral} is used as collateral against any debt you have, and may be sold 
  if the Mark Price falls below your Liquidation Price.
`;

const daiBalanceTooltip = `
  This is the amount of Dai you have in your Leverage Account.
  When negative, this represents your debt, and how much you owe.
  When positive, this is how much Dai is available for you to withdraw.
`;

const equityTooltip = `
  This represents the current value of your Leveraged Position.
  It is calculated as the sum of your WETH and DAI balances.
  Another way to look at it, is if you were to sell your entire position,
  this would approximately be the value you could withdraw at the end.
`;
/* tslint:enable */

interface MTMyPositionViewProps {
  mta: MTAccount;
  ma: MarginableAsset;
  createMTFundForm$: CreateMTFundForm$;
  approveMTProxy: (args: { token: string; proxyAddress: string }) => Observable<TxState>;
  redeem: (args: { token: string; proxy: any; amount: BigNumber }) => void;
  close?: () => void;
  transactions: TxState[];
  inDai: boolean;
  daiPrice: BigNumber;
}

export function createRedeem(calls$: Calls$) {
  return (args: { token: string; proxy: any; amount: BigNumber }): Observable<TxState> => {
    const r = calls$.pipe(
      first(),
      switchMap((calls) => {
        return calls.mtRedeem(args);
      }),
    );
    r.subscribe();
    return r;
  };
}

export function createMTMyPositionView$(
  mtOrderFormLoadable$: Observable<any>,
  createMTFundForm$: CreateMTFundForm$,
  calls$: Calls$,
  daiPriceUsd$: Observable<BigNumber | undefined>,
  approveMTProxy: (args: { token: string; proxyAddress: string }) => Observable<TxState>,
) {
  const redeem = createRedeem(calls$);
  return combineLatest(mtOrderFormLoadable$, transactions$, daiPriceUsd$).pipe(
    map(([state, transactions, daiPrice]) => {
      return state.status === 'loaded' && state.value
        ? {
            status: state.status,
            value: {
              createMTFundForm$,
              approveMTProxy,
              transactions,
              redeem,
              daiPrice,
              account: state.value.account,
              mta: state.value.mta,
              ma: findMarginableAsset(state.tradingPair.base, state.value.mta),
            },
          }
        : {
            value: state.value,
            status: state.status,
            error: state.error,
          };
    }),
  );
}

export class MTMyPositionView extends React.Component<MTMyPositionViewProps & ModalOpenerProps> {
  public render() {
    const { ma, inDai, daiPrice } = this.props;
    const { liquidationPenalty } = ma;
    const leverage = ma.leverage ? ma.leverage : ma.balance.gt(zero) ? one : zero;
    const liquidationPrice = ma.liquidationPrice ? ma.liquidationPrice : zero;
    const liquidationPriceMarket =
      ma.liquidationPrice && ma.midpointPrice && daiPrice.gt(zero) ? ma.liquidationPrice.div(daiPrice) : zero;

    const liquidationPriceDisplay = inDai
      ? liquidationPriceMarket.gt(zero)
        ? liquidationPriceMarket
        : undefined
      : liquidationPrice.gt(zero)
      ? liquidationPrice
      : undefined;

    const markPrice =
      ma.markPrice.gt(liquidationPrice) && liquidationPrice.gt(ma.referencePrice) ? ma.referencePrice : ma.markPrice;

    const markPriceDisplay = inDai
      ? markPrice && daiPrice && daiPrice.gt(zero)
        ? markPrice.div(daiPrice)
        : undefined
      : markPrice;
    return (
      <div data-test-id="my-position">
        <div className={styles.MTPositionPanel} data-test-id="summary">
          <div className={styles.MTPositionColumn}>
            <div className={styles.summaryRow}>
              <div className={styles.summaryLabel}>Leverage</div>
              <div className={styles.summaryValue}>
                {leverage.gt(zero) ? <> Long - {formatPrecision(leverage, 1)}x</> : <span>-</span>}
              </div>
            </div>
            <div className={styles.summaryRow}>
              <div className={styles.summaryLabel}>
                <span>Stability Fee</span>
                <WarningTooltip id="stability-fee" text={stabilityFeeTooltip} />
              </div>
              <div className={styles.summaryValue} data-test-id="stability-fee">
                <FormatPercent value={ma.fee} fallback="-" multiply={false} precision={2} />
              </div>
            </div>
            <div className={styles.summaryRow}>
              <div className={styles.summaryLabel}>
                <span>Liquidation Penalty</span>
                <WarningTooltip id="liquidation-penalty" text={liquidationPenaltyTooltip} />
              </div>
              <div className={styles.summaryValue}>
                <FormatPercent
                  data-test-id="penalty"
                  value={liquidationPenalty}
                  fallback="-"
                  multiply={false}
                  precision={2}
                />
              </div>
            </div>
          </div>

          <div className={styles.MTPositionColumn}>
            <div className={styles.summaryRow}>
              <div className={styles.summaryLabel}>
                <span>Liquidation Price</span>
              </div>
              <div className={styles.summaryValue} data-test-id="liquidation-price">
                {inDai && liquidationPriceDisplay && '~'}
                <Money
                  value={liquidationPriceDisplay}
                  token={inDai ? 'DAI' : 'USD'}
                  fallback="-"
                  className={classnames({
                    [styles.summaryValuePositive]: ma && ma.safe,
                    [styles.summaryValueNegative]: ma && !ma.safe,
                  })}
                />
              </div>
            </div>
            <div className={styles.summaryRow}>
              <div className={styles.summaryLabel}>
                <span>Mark Price</span>
                <WarningTooltip id="mark-price" text={markPriceTooltip} />
              </div>
              <div className={styles.summaryValue} data-test-id="price">
                {markPriceDisplay ? (
                  <>
                    {inDai && '~'}
                    <Money value={markPriceDisplay} token={inDai ? 'DAI' : 'USD'} />
                  </>
                ) : (
                  <>N/A</>
                )}
              </div>
            </div>
          </div>
          <div className={styles.MTPositionColumn}>
            <div className={styles.summaryRow}>
              <div className={styles.summaryLabel}>
                <span>{ma.name} Bal</span>
                <WarningTooltip id="col-balance" text={collateralBalanceTooltip(ma.name)} />
              </div>
              <div className={styles.summaryValue}>
                {ma.balance ? (
                  <CryptoMoney data-test-id="col-balance" value={ma.balance} token={ma.name} fallback="-" />
                ) : (
                  <span>-</span>
                )}
                <br />
                {ma.balanceInDai && (
                  <>
                    (<CryptoMoney value={ma.balanceInDai} token="DAI" fallback="-" />)
                  </>
                )}
              </div>
            </div>
            <div className={styles.summaryRow}>
              <div className={styles.summaryLabel}>
                <span>DAI Bal</span>
                <WarningTooltip id="dai-balance" text={daiBalanceTooltip} />
              </div>
              <div className={styles.summaryValue} data-test-id="dai-balance">
                {ma && ma.debt.gt(zero) ? (
                  <CryptoMoney value={ma.debt.times(minusOne)} token="DAI" fallback="-" />
                ) : ma && ma.dai ? (
                  <CryptoMoney value={ma.dai} token="DAI" fallback="-" />
                ) : (
                  <span>-</span>
                )}
              </div>
            </div>
            <div className={styles.summaryRow}>
              <div className={styles.summaryLabel} data-test-id="equity">
                <span>Equity</span>
                <WarningTooltip id="equity" text={equityTooltip} />
              </div>
              <div className={styles.summaryValue}>
                {ma.equity && <CryptoMoney value={ma.equity} token="DAI" fallback="-" />}
              </div>
            </div>
          </div>
        </div>
        <CDPHistoryView {...ma} />
      </div>
    );
  }
}
