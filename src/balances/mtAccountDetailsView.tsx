import * as React from 'react';

import { MTAccount, MTAccountState } from '../marginTrading/state/mtAccount';
import { FormatAmount, FormatCrypto, FormatFiat, FormatPercent } from '../utils/formatters/Formatters';
import { Panel, PanelHeader } from '../utils/panel/Panel';
import { Table } from '../utils/table/Table';
import { Currency } from '../utils/text/Text';
import * as styles from './mtAccountDetailsView.scss';

export class MtAccountDetailsView extends React.Component<MTAccount> {
  public render() {
    if (this.props.state !== MTAccountState.setup) {
      return (
        <Panel>
          <PanelHeader>MCD Margin Trading table</PanelHeader>
          <p>Sorry, you have no setup Margin Trading Account</p>
        </Panel>
      );
    }
    return (
      <Panel>
        <PanelHeader>MCD Margin Trading table</PanelHeader>
        <Table className={styles.table} align="right">
          <thead>
            <tr>
              <th style={{ width: '10%' }} className={styles.left}>
                Asset
              </th>
              <th style={{ width: '13%' }}>Amount</th>
              <th style={{ width: '8%' }}>Price</th>
              <th style={{ width: '13%' }}>Value</th>
              <th style={{ width: '10%' }}>Debt</th>
              <th style={{ width: '10%' }}>Available debt</th>
              <th style={{ width: '10%' }}>Current coll. ratio</th>
              <th style={{ width: '10%' }}>Min coll. ratio</th>
              <th style={{ width: '10%' }}>Safe coll. ratio</th>
              <th style={{ width: '10%' }}>Max safe leverage</th>
              <th style={{ width: '15%' }}>Purchasing power</th>
            </tr>
          </thead>
          <tbody>
            {/*<tr>*/}
            {/*<td colSpan={13} className={`${styles.center} ${styles.middleTh}`} >*/}
            {/*Marginable assets*/}
            {/*</td>*/}
            {/*</tr>*/}
            {this.props.marginableAssets.map((ma) => (
              <tr key={ma.name}>
                <td className={styles.left}>
                  <Currency value={ma.name} />
                </td>
                <td>
                  <FormatAmount value={ma.balance} token={ma.name} />
                </td>
                <td>
                  <FormatAmount value={ma.referencePrice} token="DAI" />
                </td>
                <td>
                  <FormatFiat value={ma.balanceInCash} token="DAI" />
                </td>
                <td>
                  <FormatCrypto value={ma.debt} token="DAI" />
                </td>
                <td>
                  <FormatCrypto value={ma.availableDebt} token="DAI" />
                </td>
                <td>
                  <FormatPercent value={ma.currentCollRatio} multiply={true} fallback="-" />
                </td>
                <td>
                  <FormatPercent value={ma.minCollRatio} multiply={true} />
                </td>
                <td>
                  <FormatPercent value={ma.safeCollRatio} multiply={true} />
                </td>
                <td>{ma.maxSafeLeverage.toFixed(1)}</td>
                <td>
                  <FormatAmount value={undefined} token="DAI" />
                </td>
              </tr>
            ))}
            {/*<tr>*/}
            {/*<td colSpan={13} className={`${styles.center} ${styles.middleTh}`} >*/}
            {/*Non-marginable assets*/}
            {/*</td>*/}
            {/*</tr>*/}

            {/*{ this.props.nonMarginableAssets.map(ma => (*/}
            {/*  <tr key={ma.name}>*/}
            {/*    <td className={styles.left}><Currency value={ma.name} /></td>*/}
            {/*    <td><FormatAmount value={ma.balance} token={ma.name} /></td>*/}
            {/*    <td><FormatAmount value={ma.referencePrice} token="DAI" /></td>*/}
            {/*    <td><FormatAmount value={ma.balanceInCash} token="DAI" /></td>*/}
            {/*    <td />*/}
            {/*    <td />*/}
            {/*    <td />*/}
            {/*    <td />*/}
            {/*    <td />*/}
            {/*    <td />*/}
            {/*    <td><FormatAmount value={undefined} token="DAI" /></td>*/}
            {/*  </tr>*/}
            {/*))}*/}
            {/*<tr>*/}
            {/*<td colSpan={13} className={`${styles.center} ${styles.middleTh}`}>Cash</td>*/}
            {/*</tr>*/}
            {/*<tr>*/}
            {/*  <td className={styles.left}>{this.props.cash.name}</td>*/}
            {/*  <td>*/}
            {/*    <FormatAmount value={this.props.cash.balance} token={this.props.cash.name} />*/}
            {/*  </td>*/}
            {/*</tr>*/}
          </tbody>
        </Table>
      </Panel>
    );
  }
}
