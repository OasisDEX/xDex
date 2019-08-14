import * as React from 'react';
import { CDPHistoryView } from '../../balances-mt/CDPHistoryView';
import { formatPercent, formatPrecision, formatPrice } from '../../utils/formatters/format';
import { MarginableAsset } from '../state/mtAccount';
import * as styles from './MTMyPositionView.scss';

export class MTMyPositionView extends React.Component<MarginableAsset>
{
  public render() {
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
                this.props.leverage &&
                <React.Fragment>Long - { formatPrecision(this.props.leverage, 1) }x</React.Fragment>
              }
            </div>
          </div>
          <div className={styles.summaryRow}>
            <div className={styles.summaryLabel}>
               PnL:
            </div>
            <div className={styles.summaryValue}>
              123%
            </div>
          </div>
          <div className={styles.summaryRow}>
            <div className={styles.summaryLabel}>
               Coll. Ratio
            </div>
            <div className={styles.summaryValue}>
              { this.props.currentCollRatio && formatPercent(this.props.currentCollRatio) }
            </div>
          </div>
        </div>
        <div className={styles.MTPositionColumn}>
          <div className={styles.summaryRow}>
            <div className={styles.summaryLabel}>
              Open Price
            </div>
            <div className={styles.summaryValue}>
              123
            </div>
          </div>
          <div className={styles.summaryRow}>
            <div className={styles.summaryLabel}>
              Liquidation Price
            </div>
            <div className={styles.summaryValue}>
              {
                this.props.liquidationPrice &&
              formatPrice(this.props.liquidationPrice, this.props.name)
              }
            </div>
          </div>
          <div className={styles.summaryRow}>
            <div className={styles.summaryLabel}>
              Price Feed
            </div>
            <div className={styles.summaryValue}>
              { this.props.referencePrice && this.props.referencePrice.toString() }
            </div>
          </div>
        </div>
        <div className={styles.MTPositionColumn}>
          <div className={styles.summaryRow}>
            <div className={styles.summaryLabel}>
              Amount
            </div>
            <div className={styles.summaryValue}>
              { this.props.balance && formatPrice(this.props.balance, this.props.name)}
            </div>
          </div>
          <div className={styles.summaryRow}>
            <div className={styles.summaryLabel}>
              Dai generated
            </div>
            <div className={styles.summaryValue}>
              { this.props.debt.toString() }
            </div>
          </div>
          <div className={styles.summaryRow}>
            <div className={styles.summaryLabel}>
              Interest Owed
            </div>
            <div className={styles.summaryValue}>
              1234
            </div>
          </div>
        </div>
      </div>
      <CDPHistoryView {...this.props}/>
    </div>);
  }
}
