import * as React from 'react';
import * as ReactModal from 'react-modal';

import { MarginableAsset, MTHistoryEventKind } from '../marginTrading/state/mtAccount';
import { formatDateTime } from '../utils/formatters/format';
import { Button } from '../utils/forms/Buttons';
import { ModalProps } from '../utils/modal';
import { Panel, PanelFooter, PanelHeader } from '../utils/panel/Panel';
import { Table } from '../utils/table/Table';
import { InfoLabel } from '../utils/text/Text';
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
                <th style={{ width: '125px' }} >
                  Type
                </th>
                <th style={{ width: '125px' }} >
                  <span className={styles.headerDark}>Price</span> DAI
                </th>
                <th style={{ width: '125px' }} >
                  <span className={styles.headerDark}>Amount</span> WETH
                </th>
                <th style={{ width: '125px' }} >
                  <span className={styles.headerDark}>Total</span> DAI
                </th>
                <th style={{ width: '125px' }} >
                  <span className={styles.headerDark}>Debt</span> DAI
                </th>
                <th style={{ width: '125px' }} >
                  <span className={styles.headerDark}>Liq. Price</span> USD
                </th>
                <th style={{ width: '190px' }} >
                  Time
                </th>
              </tr>
              </thead>
              <tbody>
              { this.props.history.filter(h => h.kind !== MTHistoryEventKind.adjust).map((e, i) => {
                let sign = '';
                let DAIsign = '';
                if (
                  e.kind === MTHistoryEventKind.fundGem ||
                  e.kind === MTHistoryEventKind.drawDai ||
                  e.kind === MTHistoryEventKind.buyLev) {
                  sign = '+';
                  DAIsign = '-';
                }
                if (
                  e.kind === MTHistoryEventKind.drawGem ||
                  e.kind === MTHistoryEventKind.fundDai ||
                  e.kind === MTHistoryEventKind.sellLev) {
                  sign = '-';
                  DAIsign = '+';
                }

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
                }
                return (
                  <tr key={i}>
                    <td className={styles.eventName}>{displayName}</td>
                    <td>{
                      e.priceDai && !e.priceDai.isNaN() ? e.priceDai.toFixed(2)
                        : <span>-</span>
                    }</td>
                    <td>
                      {
                        e.dAmount && !e.dAmount.isNaN() ?
                          <React.Fragment>{sign} {e.dAmount.toString()}</React.Fragment>
                          : <span>0.0</span>
                      }
                    </td>
                    <td>
                      {
                        e.dDAIAmount && !e.dDAIAmount.isNaN() ?
                          <React.Fragment>{DAIsign} {e.dDAIAmount.toString()}</React.Fragment>
                          : <span>0.0</span>
                      }
                    </td>
                    <td>
                      { e.debtDelta && !e.debtDelta.isNaN() ?
                        <React.Fragment>{e.debtDelta.toString()}</React.Fragment>
                        :  <span>0.0</span>
                      }
                    </td>
                <td>
                      { e.liquidationPriceDelta && !e.liquidationPriceDelta.isNaN() ?
                        <React.Fragment>{e.liquidationPriceDelta.toFixed(1)}</React.Fragment>
                        :  <span>-</span>
                      }
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
