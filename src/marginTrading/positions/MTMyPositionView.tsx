import { default as BigNumber } from 'bignumber.js';
import classnames from 'classnames';
import * as React from 'react';
import { Observable } from 'rxjs/index';
import { first, switchMap } from 'rxjs/internal/operators';
import { CDPHistoryView } from '../../balances/CDPHistoryView';
import { Calls$ } from '../../blockchain/calls/calls';
import { TxMetaKind } from '../../blockchain/calls/txMeta';
import { isDone, TxState } from '../../blockchain/transactions';
import { formatPrecision } from '../../utils/formatters/format';
import { FormatPercent, Money } from '../../utils/formatters/Formatters';
import { Button } from '../../utils/forms/Buttons';
import { SvgImage } from '../../utils/icons/utils';
import { LoadingIndicator } from '../../utils/loadingIndicator/LoadingIndicator';
import { ModalOpenerProps } from '../../utils/modal';
import { minusOne, one, zero } from '../../utils/zero';
import {
  MarginableAsset,
  MTAccount
} from '../state/mtAccount';
import { CreateMTFundForm$ } from '../transfer/mtTransferForm';
import * as styles from './MTMyPositionView.scss';
import warningIconSvg from './warning-icon.svg';

interface MTMyPositionViewProps {
  mta: MTAccount;
  ma: MarginableAsset;
  createMTFundForm$: CreateMTFundForm$;
  approveMTProxy: (args: {token: string; proxyAddress: string}) => Observable<TxState>;
  redeem: (args: {token: string; proxy: any, amount: BigNumber}) => void;
  close?: () => void;
  transactions: TxState[];
}

interface RedeemButtonProps {
  disabled: boolean;
  redeem: () => void;
  token: string;
  transactions: TxState[];
}

class RedeemButton extends React.Component<RedeemButtonProps> {

  public render() {
    const txInProgress = Boolean(this.props.transactions.find((t: TxState) =>
      t.meta.kind === TxMetaKind.redeem &&
      !isDone(t) &&
      t.meta.args.token === this.props.token
    ));

    return (<Button
        size="md"
        disabled={this.props.disabled || txInProgress}
        className={styles.redeemButton}
        onClick={this.props.redeem}
      >
        {txInProgress ? <LoadingIndicator className={styles.buttonLoading} /> : 'Redeem'}
      </Button>
    );
  }
}

export function createRedeem(calls$: Calls$) {
  return (args: {token: string; proxy: any, amount: BigNumber}): Observable<TxState> => {
    const r = calls$.pipe(
      first(),
      switchMap(calls => {
        return calls.mtRedeem(args);
      })
    );
    r.subscribe();
    return r;
  };
}

export class MTMyPositionView extends
  React.Component<MTMyPositionViewProps & ModalOpenerProps>
{
  public render() {

    const { ma, mta } = this.props;
    const leverage = ma.leverage ? ma.leverage : ma.balance.gt(zero) ? one : zero;
    const liquidationPrice = ma.liquidationPrice ? ma.liquidationPrice : zero;
    const { liquidationPenalty } = ma;
    const liquidationPenalityPercent = liquidationPenalty.gt(zero) ?
      liquidationPenalty.minus(1).times(100) : zero;

    return (
      <div>
        <div className={styles.MTPositionPanel}>
          <div className={styles.MTPositionColumn}>
            <div className={styles.summaryRow}>
              <div className={styles.summaryLabel}>
                Leverage
              </div>
              <div className={styles.summaryValue}>
                Long - { formatPrecision(leverage, 1) }x
              </div>
            </div>
            <div className={styles.summaryRow}>
              <div className={styles.summaryLabel}>
                Stability Fee
              </div>
              <div className={styles.summaryValue}>
                <FormatPercent
                  value={ma.fee}
                  fallback="-"
                  multiply={false}
                />
              </div>
            </div>
            <div className={styles.summaryRow}>
              <div className={styles.summaryLabel}>
                Liquidation Penalty
              </div>
              <div className={styles.summaryValue}>
                <FormatPercent
                  value={liquidationPenalityPercent}
                  fallback="-"
                  multiply={false}
                />
              </div>
            </div>
          </div>

          <div className={styles.MTPositionColumn}>
            <div className={styles.summaryRow}>
              <div className={styles.summaryLabel}>
                Liquidation Price
              </div>
              <div className={styles.summaryValue}>
                {
                  liquidationPrice.gt(zero) ?
                    <Money
                      value={liquidationPrice}
                      token="USD"
                      fallback="-"
                      className={
                        classnames({
                          [styles.summaryValuePositive]: ma && ma.safe,
                          [styles.summaryValueNegative]: ma && !ma.safe,
                        })
                      }
                    /> : <span>-</span>
                }
              </div>
            </div>
            <div className={styles.summaryRow}>
              <div className={styles.summaryLabel}>
                Current Price
              </div>
              <div className={styles.summaryValue}>
                {ma.referencePrice &&
                  <Money value={ma.referencePrice} token="USD"/>
                }
              </div>
            </div>
          </div>
          <div className={styles.MTPositionColumn}>
            <div className={styles.summaryRow}>
              <div className={styles.summaryLabel}>
                Balance
              </div>
              <div className={styles.summaryValue}>
                {
                  ma.balance ?
                    <Money
                      value={ma.balance}
                      token={ma.name}
                      fallback="-"
                    /> : <span>-</span>
                }
              </div>
            </div>
            <div className={styles.summaryRow}>
              <div className={styles.summaryLabel}>
                DAI Balance
              </div>
              <div className={styles.summaryValue}>
                { ma && ma.debt.gt(zero) ?
                  <Money
                    value={ma.debt.times(minusOne)}
                    token="DAI"
                    fallback="-"
                  /> : ma && ma.dai ?
                    <Money
                      value={ma.dai}
                      token="DAI"
                      fallback="-"
                    /> : <span>-</span>
                }
              </div>
            </div>
            <div className={styles.summaryRow}>
              <div className={styles.summaryLabel}>
                Equity
              </div>
              <div className={styles.summaryValue}>
                {
                  ma.equity &&
                    <Money
                      value={ma.equity}
                      token="DAI"
                      fallback="-"
                    />
                }

              </div>
            </div>
            <div className={styles.summaryRow}>
              <div className={styles.summaryLabel}>
                Purchasing power
              </div>
              <div className={styles.summaryValue}>
                {
                  ma.purchasingPower &&
                    formatPrecision(ma.purchasingPower, 2)
                }
              </div>
            </div>
          </div>
        </div>
        <div>
          {
            ma.bitable === 'imminent' &&
            // tslint:disable
            <div className={styles.warningMessage}>
              <SvgImage image={warningIconSvg}/>
              <span>
              The {ma.name} price&nbsp;
                ({ma.osmPriceNext && ma.osmPriceNext.toString()} USD)
              is approaching your Liquidation Price and your position will soon be liquidated.
              You&nbsp;may rescue your Position by paying off Dai debt or deposit&nbsp;
                {ma.name} in the next {ma.nextPriceUpdateDelta} minutes.
              </span>
            </div>
            // tslint:enable
          }
          {
            ma.bitable === 'yes' &&
            <div className={styles.warningMessage}>
              <SvgImage image={warningIconSvg}/>
              <span>
                <Money
                  value={ma.amountBeingLiquidated}
                  token={ma.name}
                  fallback="-"
                />
                &nbsp;of total <Money
                value={ma.balance}
                token={ma.name}
                fallback="-"
              />&nbsp;is being liquidated from your position.&nbsp;
                { ma.redeemable.gt(zero) &&
                // tslint:disable
                <><br />You can redeem <Money
                  value={ma.redeemable}
                  token={ma.name}
                  fallback="-"
                /> collateral.
                </>
                  // tslint:enable
                }
            </span>

              <RedeemButton
                redeem={() => this.props.redeem({
                  token: ma.name,
                  proxy: mta.proxy,
                  amount: ma.redeemable})}

                token={ma.name}
                disabled={ma.redeemable.eq(zero)}
                transactions={this.props.transactions}
              />
            </div>
          }
          {
            ma.bitable === 'no' && ma.redeemable.gt(zero) &&
            <div className={styles.infoMessage}>
              <span>
                Your Position has been liquidated.
                Please redeem {ma.redeemable.toString()}
                &nbsp;{ma.name} of collateral.
              </span>
              <Button
                size="md"
                disabled={ma.redeemable.eq(zero)}
                className={styles.redeemButton}
              >Redeem</Button>
            </div>
          }
        </div>
        <CDPHistoryView {...ma} />
      </div>);
  }
}
