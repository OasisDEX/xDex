import { BigNumber } from 'bignumber.js';
import * as React from 'react';
import { CDPHistoryView } from '../../balances-mt/CDPHistoryView';
import { formatPercent, formatPrecision, formatPrice } from '../../utils/formatters/format';
import { Money } from '../../utils/formatters/Formatters';
import { MarginableAsset } from '../state/mtAccount';
import * as styles from './MTMyPositionView.scss';

export class MTMyPositionView extends
  React.Component<MarginableAsset & {purchasingPower?: BigNumber, pnl?: BigNumber}>
{
  public render() {
    const equity = this.props.balance.times(this.props.referencePrice).minus(this.props.debt);
    return (
      <div>
        <div className={styles.MTPositionPanel}>
        <div className={styles.MTPositionColumn}>
          <div className={styles.summaryRow}>
            <div className={styles.summaryLabel}>
              Type:
            </div>
            <div className={styles.summaryValue}>
              {
                this.props.leverage && !this.props.leverage.isNaN() ?
                <React.Fragment>Long - { formatPrecision(this.props.leverage, 1) }x</React.Fragment>
                  : <span>-</span>
              }
            </div>
          </div>
          <div className={styles.summaryRow}>
            <div className={styles.summaryLabel}>
               PnL:
            </div>
            <div className={styles.summaryValue}>
              { this.props.pnl && !this.props.pnl.isNaN() ?
                formatPercent(this.props.pnl) : <span>-</span>
              }
            </div>
          </div>
          <div className={styles.summaryRow}>
            <div className={styles.summaryLabel}>
               Coll. Ratio
            </div>
            <div className={styles.summaryValue}>
              { this.props.currentCollRatio && !this.props.currentCollRatio.isNaN() ?
                formatPercent(this.props.currentCollRatio.times(100)) : <span>-</span>
              }
            </div>
          </div>
        </div>
        <div className={styles.MTPositionColumn}>
          <div className={styles.summaryRow}>
            <div className={styles.summaryLabel}>
              Purchasing Power
            </div>
            <div className={styles.summaryValue}>
              { this.props.purchasingPower && this.props.purchasingPower.toFixed(2) } DAI
            </div>
          </div>
          <div className={styles.summaryRow}>
            <div className={styles.summaryLabel}>
              Average Price
            </div>
            <div className={styles.summaryValue}>
              { this.props.referencePrice && this.props.referencePrice.toString() } DAI
            </div>
          </div>
          <div className={styles.summaryRow}>
            <div className={styles.summaryLabel}>
              Liq. Price
            </div>
            <div className={styles.summaryValue}>
              {
                this.props.liquidationPrice && !this.props.liquidationPrice.isNaN() ?
                <React.Fragment>
                  {formatPrecision(this.props.liquidationPrice, 2)} USD
                </React.Fragment>
                : <span>-</span>
              }
            </div>
          </div>
        </div>
        <div className={styles.MTPositionColumn}>
          <div className={styles.summaryRow}>
            <div className={styles.summaryLabel}>
              Equity
            </div>
            <div className={styles.summaryValue}>
              {
                equity && !equity.isNaN() ?
                formatPrice(equity, this.props.name) : <span>-</span>
              }
            </div>
          </div>
          <div className={styles.summaryRow}>
            <div className={styles.summaryLabel}>
              Amount
            </div>
            <div className={styles.summaryValue}>
              {
                this.props.balance && !this.props.balance.isNaN() ?
                  <Money
                    value={this.props.balance}
                    token={this.props.name}
                    fallback="-"
                  /> : <span>-</span>
              }
            </div>
          </div>
          <div className={styles.summaryRow}>
            <div className={styles.summaryLabel}>
              Dai debt
            </div>
            <div className={styles.summaryValue}>
              {
                this.props.debt && !this.props.debt.isNaN() ?
                this.props.debt.toString() : <span>-</span>
              }
            </div>
          </div>
        </div>
      </div>
      <CDPHistoryView {...this.props}/>
    </div>);
  }
}
