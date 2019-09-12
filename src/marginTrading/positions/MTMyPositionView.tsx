import { BigNumber } from 'bignumber.js';
import * as React from 'react';
import { CDPHistoryView } from '../../balances-mt/CDPHistoryView';
import { formatPercent, formatPrecision } from '../../utils/formatters/format';
import { Money } from '../../utils/formatters/Formatters';
import { one, zero } from '../../utils/zero';
import { MarginableAsset } from '../state/mtAccount';
import * as styles from './MTMyPositionView.scss';

export class MTMyPositionView extends
  React.Component<MarginableAsset & {purchasingPower?: BigNumber, pnl?: BigNumber}>
{
  public render() {
    const equity = this.props.balance.times(this.props.referencePrice).minus(this.props.debt);
    const leverage = this.props.leverage && !this.props.leverage.isNaN()
      ? this.props.leverage :
        this.props.balance.gt(zero) ? one : zero;
    return (
      <div>
        <div className={styles.MTPositionPanel}>
        <div className={styles.MTPositionColumn}>
          <div className={styles.summaryRow}>
            <div className={styles.summaryLabel}>
              Type:
            </div>
            <div className={styles.summaryValue}>
              <>Long - { formatPrecision(leverage, 1) }x</>
            </div>
          </div>
          <div className={styles.summaryRow}>
            <div className={styles.summaryLabel}>
               PnL:
            </div>
            <div className={styles.summaryValue}>
              { this.props.pnl && (!this.props.pnl.isNaN()) &&
                this.props.pnl.gt(zero) ?
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
              { this.props.purchasingPower ?
                <Money value={this.props.purchasingPower} token="DAI"/> :  <span>-</span>
              }
            </div>
          </div>
          <div className={styles.summaryRow}>
            <div className={styles.summaryLabel}>
              Average Price
            </div>
            <div className={styles.summaryValue}>
              { this.props.referencePrice &&
                <Money value={this.props.referencePrice} token="DAI" />
              }
            </div>
          </div>
          <div className={styles.summaryRow}>
            <div className={styles.summaryLabel}>
              Liq. Price
            </div>
            <div className={styles.summaryValue}>
              {
                this.props.liquidationPrice && !this.props.liquidationPrice.isNaN()
                && this.props.liquidationPrice.gt(zero) ?
                <>
                  {formatPrecision(this.props.liquidationPrice, 2)} USD
                </>
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
                <Money value={equity} token="DAI" /> : <span>-</span>
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
                  <Money
                    value={this.props.debt}
                    token="DAI"
                    fallback="-"
                  /> : <span>-</span>
              }
            </div>
          </div>
        </div>
      </div>
      <CDPHistoryView {...this.props}/>
    </div>);
  }
}
