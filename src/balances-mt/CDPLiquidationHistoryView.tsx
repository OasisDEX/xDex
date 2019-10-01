import classnames from 'classnames';
import * as React from 'react';

import { MarginableAsset } from '../marginTrading/state/mtAccount';
import { formatDateTime } from '../utils/formatters/format';
import { Table } from '../utils/table/Table';
import * as styles from './CDPHistoryView.scss';

export class CDPLiquidationHistoryView extends React.Component<MarginableAsset> {
  public render() {
    return (
      <div className={styles.contentWithScroll}>
        <Table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.cellLeftAligned}>Type</th>
              <th><span className={styles.headerDark}>Auction</span> #</th>
              <th><span className={styles.headerDark}>Lot</span> {this.props.name}</th>
              <th><span className={styles.headerDark}>Bid</span> DAI</th>
              <th><span className={styles.headerDark}>Tab</span> DAI</th>
              <th>Time</th>
            </tr>
          </thead>
          <tbody>
            {this.props.rawLiquidationHistory.map((e, i) => (
              <tr key={i}>
                <td className={
                  classnames(styles.eventName, styles.cellLeftAligned)
                }>{e.type}</td>
                <td>{e.auctionId}</td>
                <td>{e.lot.isNaN() ? '' : e.lot.toFixed(0)}</td>
                <td>{e.bid.isNaN() ? '' : e.bid.toFixed(0)}</td>
                <td>{e.tab.isNaN() ? '' : e.tab.toFixed(0)}</td>
                <td>{formatDateTime(new Date(e.timestamp), true)}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      </div>
    );
  }
}
