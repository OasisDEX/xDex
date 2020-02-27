import * as React from 'react';
import * as ReactModal from 'react-modal';

import classnames from 'classnames';
import { MarginableAsset, MTHistoryEventKind } from '../marginTrading/state/mtAccount';
import { formatDateTime } from '../utils/formatters/format';
import { FormatAmount } from '../utils/formatters/Formatters';
import { Button } from '../utils/forms/Buttons';
import { ModalProps } from '../utils/modal';
import { Panel, PanelFooter, PanelHeader } from '../utils/panel/Panel';
import { Table } from '../utils/table/Table';
import { InfoLabel } from '../utils/text/Text';
import { zero } from '../utils/zero';
import * as styles from './CDPHistoryView.scss';

export class CDPHistoryViewModal extends React.Component<MarginableAsset & ModalProps> {
  public render() {
    return (
      <ReactModal
        ariaHideApp={false}
        isOpen={true}
        className={styles.modal}
        overlayClassName={styles.modalOverlay}
        closeTimeoutMS={250}
      >
        <Panel style={{ width: '454px' }} className={styles.modalChild}>
          <PanelHeader bordered={true}>
            Details of {this.props.name} history
          </PanelHeader>
          <CDPHistoryView {...this.props}/>
          <PanelFooter>
            <Button size="md" block={true} onClick={this.props.close} >Close</Button>
          </PanelFooter>
        </Panel>
      </ReactModal>
    );
  }
}

export class CDPHistoryView extends React.Component<MarginableAsset> {
  public render() {
    return (
      <div className={styles.contentWithScroll}>
          <Table className={styles.table}>
              <thead>
              <tr>
                <th className={styles.cellLeftAligned}>
                  TYPE
                </th>
                <th>
                  <span className={styles.headerDark}>Price</span> DAI
                </th>
                <th>
                  <span className={styles.headerDark}>Amount</span> {this.props.name}
                </th>
                <th>
                  <span className={styles.headerDark}>Redeem</span> {this.props.name}
                </th>
                <th>
                  <span className={styles.headerDark}>Total</span> DAI
                </th>
                <th>
                  <span className={styles.headerDark}>Debt</span> DAI
                </th>
                <th>
                  <span className={styles.headerDark}>Liq. Price</span> USD
                </th>
                <th>
                  TIME
                </th>
              </tr>
              </thead>
              <tbody>
              { this.props.history.map((e, i) => {
                let sign = '';
                let DAIsign = '';
                const dAmount = e.dAmount ? e.dAmount : zero;
                const dDAIAmount = e.dDAIAmount  ? e.dDAIAmount : zero;
                const debtDelta = e.debtDelta ? e.debtDelta : zero;
                const liquidationPriceDelta = e.liquidationPriceDelta ?
                  e.liquidationPriceDelta : zero;

                if (
                  e.kind === MTHistoryEventKind.fundGem ||
                  e.kind === MTHistoryEventKind.drawDai ||
                  e.kind === MTHistoryEventKind.buyLev ||
                  e.kind === MTHistoryEventKind.redeem
                  ) {
                  sign = '+';
                  DAIsign = '-';
                }
                if (
                  e.kind === MTHistoryEventKind.drawGem ||
                  e.kind === MTHistoryEventKind.fundDai ||
                  e.kind === MTHistoryEventKind.sellLev
                  ) {
                  sign = '-';
                  DAIsign = '+';
                }
                if (
                  e.kind === MTHistoryEventKind.bite
                ) {
                  DAIsign = '+';
                }

                if (dDAIAmount.isEqualTo(zero)) { DAIsign = ''; }
                if (dAmount.isEqualTo(zero)) { sign = ''; }

                let displayName = '';
                switch (e.kind) {
                  case MTHistoryEventKind.drawDai:
                  case MTHistoryEventKind.drawGem:
                    displayName = 'Withdraw';
                    break;
                  case MTHistoryEventKind.fundDai:
                  case MTHistoryEventKind.fundGem:
                    displayName = 'Deposit';
                    break;
                  case MTHistoryEventKind.buyLev:
                    displayName = 'Buy';
                    break;
                  case MTHistoryEventKind.sellLev:
                    displayName = 'Sell';
                    break;
                  default:
                    displayName = e.kind;
                }

                return (
                  <tr key={i}>
                    <td className={
                      classnames(styles.eventName, styles.cellLeftAligned)
                    }>{displayName}</td>
                    <td>{
                      e.priceDai ? <FormatAmount value={e.priceDai} token="DAI" />
                        : e.price ? <FormatAmount value={e.price} token="DAI" />
                        : <span>-</span>
                    }</td>
                    <td>
                      <>
                        {sign} <FormatAmount value={dAmount} token={e.token} />
                      </>
                    </td>
                    <td>
                      {
                        e.redeemable &&
                        <>
                          <FormatAmount value={e.redeemable} token={e.token} />
                        </>
                      }
                    </td>
                    <td>
                      <>
                        {DAIsign} <FormatAmount value={dDAIAmount} token="DAI" />
                      </>
                    </td>
                    <td>
                      <>
                        <FormatAmount value={debtDelta} token="DAI" />
                      </>
                    </td>
                    <td>
                      <>
                        <FormatAmount value={liquidationPriceDelta} token="USD" />
                      </>
                    </td>
                    <td>
                      <InfoLabel>
                        { formatDateTime(new Date(e.timestamp), true) }
                      </InfoLabel>
                    </td>
                  </tr>
                );
              }
              )}
              </tbody>
          </Table>
      </div>
    );
  }

//   private eventDecription(event: MTHistoryEvent) {
//     if (event.kind === MTHistoryEventKind.deal) {
//       return null;
//     }
//     return (
//       <div>
//       <span>
//         { (event as any).gem && (event as any).gem.toString() } { event.token }
//       </span>
//         <span style={{ marginLeft: '1em' }}>
//         { (event as any).dai && (event as any).dai.toString() } DAI
//       </span>
//       </div>
//     );
//   }

}
