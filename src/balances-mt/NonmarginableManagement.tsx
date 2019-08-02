import classnames from 'classnames';
import * as React from 'react';

import { tokens } from '../blockchain/config';
import { NonMarginableAsset } from '../marginTrading/state/mtAccount';
import { Money } from '../utils/formatters/Formatters';
import { Hr } from '../utils/layout/LayoutHelpers';
import { Panel, PanelHeader } from '../utils/panel/Panel';
import { Currency, Muted } from '../utils/text/Text';
import * as styles from './CDPRiskManagement.scss';

export class NonmarginableManagement
  extends React.Component<NonMarginableAsset>
{
  public render() {
    return (
      <Panel style={{ width: '100%' }}>
        <PanelHeader bordered={true}>
          {tokens[this.props.name].iconColor}
          {/*<TokenBgColoredIcon token={this.props.name} style={{ marginRight: '0.75em' }}  />*/}
          <Currency value={tokens[this.props.name].name}/>
        </PanelHeader>
        <div className={styles.panelBody}>
          <div className={styles.flex}>
            { this.purchasingPower() }
          </div>
          <Hr color="dark" />
          <div className={styles.flex}>
            { this.balance() }
          </div>
        </div>
      </Panel>
    );
  }

  private purchasingPower() {
    return (
      <div className={classnames(styles.box, styles.centered)} style={{ flexGrow: 0 }} >
        <Muted>
          Purchasing power
        </Muted>
        <Money value={this.props.purchasingPower}
               token="DAI"
               className={styles.largeFontSize}
        />
      </div>
    );
  }

  private balance() {
    return (
      <div className={styles.box} style={{ flexGrow: 0 }}>
        Balance
        <div className={styles.detailedRow}>
          <Muted>Total</Muted>
          <Money value={this.props.balance}
                 token={this.props.name}
                 className={styles.detailedMoney}
          />
        </div>
      </div>
    );
  }
}
