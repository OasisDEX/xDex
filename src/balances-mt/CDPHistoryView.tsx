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
                  <span className={styles.headerDark}>Total</span> DAI
                </th>
                <th>
                  <span className={styles.headerDark}>Debt</span> DAI
                </th>
                <th>
                  <span className={styles.headerDark}>Liqu. Price</span> USD
                </th>
                <th>
                  TIME
                </th>
              </tr>
              </thead>
              <tbody>
              { this.props.history.filter(h => h.kind !== MTHistoryEventKind.adjust)
                .reverse().map((e, i) => {

                  const liquidationEvents = [
                    MTHistoryEventKind.bite,
                    MTHistoryEventKind.kick,
                    MTHistoryEventKind.dent,
                    MTHistoryEventKind.tend,
                    MTHistoryEventKind.deal,
                    MTHistoryEventKind.redeem,
                  ];

                  console.log(e.kind, e);
                  if (liquidationEvents.indexOf(e.kind) >= 0) {
                    const { lot, bid, tab, amount } = e as any;
                    return <tr key={i}>
                      <td className={classnames(styles.eventName, styles.cellLeftAligned)}>
                        {e.kind}
                      </td>
                      <td colSpan={5}>
                        {lot && <>
                            lot: <FormatAmount value={lot} token={e.token} fallback={''} />;
                        </>}
                        {bid && <>
                            bid: <FormatAmount value={bid} token={'DAI'} fallback={''} />;
                        </>}
                        {tab && <>
                            tab: <FormatAmount value={tab} token={'DAI'} fallback={''} />;
                        </>}
                        {amount && <>
                            amount: <FormatAmount value={amount} token={e.token} fallback={''} />;
                        </>}
                      </td>
                      <td>
                        <InfoLabel>
                          { formatDateTime(new Date(e.timestamp), true) }
                        </InfoLabel>
                      </td>
                    </tr>;
                  }
                  let sign = '';
                  let DAIsign = '';
                  const dAmount = e.dAmount && !e.dAmount.isNaN() ? e.dAmount : zero;
                  const dDAIAmount = e.dDAIAmount && !e.dDAIAmount.isNaN() ? e.dDAIAmount : zero;
                  const debtDelta = e.debtDelta && !e.debtDelta.isNaN() ? e.debtDelta : zero;
                  const liquidationPriceDelta =
                    e.liquidationPriceDelta && !e.liquidationPriceDelta.isNaN() ?
                      e.liquidationPriceDelta : zero;

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
                  }

                  return (
                  <tr key={i}>
                    <td className={
                      classnames(styles.eventName, styles.cellLeftAligned)
                    }>{displayName}</td>
                    <td>{
                      e.priceDai && !e.priceDai.isNaN() ? e.priceDai.toFixed(2)
                        : <span>-</span>
                    }</td>
                    <td>
                      <>
                        {sign} <FormatAmount value={dAmount} token={e.token} />
                      </>
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
