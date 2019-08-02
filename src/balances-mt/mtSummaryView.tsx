import { BigNumber } from 'bignumber.js';
import classnames from 'classnames';
import * as React from 'react';

import { MTAccountState } from '../marginTrading/state/mtAccount';
import { Money } from '../utils/formatters/Formatters';
import { Panel, PanelHeader } from '../utils/panel/Panel';
import { Muted } from '../utils/text/Text';
import { MTSummary } from './mtSummary';
import * as styles from './mtSummaryView.scss';

export class MtSummaryView extends React.Component<MTSummary> {
  public render() {
    if (this.props.state !== MTAccountState.setup) {
      return null;
    }

    return (
      <Panel style={{ width: '100%' }}>
        <PanelHeader bordered={true} >Margin account summary</PanelHeader>
        <div className={styles.flex}>
          { this.totalDebt(this.props.totalDebt)}
          { this.totalAssets(this.props.totalEquity)}
          { this.totalCurrentLeverage(this.props.totalCurrentLeverage)}
        </div>
      </Panel>
    );
  }

  private totalDebt(totalDebt: BigNumber) {
    return (
      <div className={classnames(styles.box, styles.centered)}>
        <Muted>
         Total debt
        </Muted>
        <Money value={totalDebt}
          token="DAI"
          className={styles.largeFontSize}
          greyedNonSignZeros={false}
        />
    </div>
    );
  }

  private totalAssets(totalEquity: BigNumber) {
    return (
      <div className={classnames(styles.box, styles.centered)}>
        <Muted>
         Total assets
        </Muted>
        <Money value={totalEquity}
          token="DAI"
          className={styles.largeFontSize}
          greyedNonSignZeros={false}
        />
    </div>
    );
  }

  private totalCurrentLeverage(totalCurrentLeverage?: BigNumber) {
    const lev = totalCurrentLeverage === undefined ?
      '-' :
      `x${totalCurrentLeverage.decimalPlaces(2)}`;
    return (
      <div className={classnames(styles.box, styles.centered)}>
        <Muted>
         Current leverage
        </Muted>
        <div className={styles.largeFontSize}>
          {lev}
        </div>
    </div>
    );
  }
}
