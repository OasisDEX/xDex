import * as React from 'react';
import * as ReactModal from 'react-modal';

import classnames from 'classnames';
import { MarginableAsset, MTHistoryEventKind } from '../marginTrading/state/mtAccount';
import { formatDateTime } from '../utils/formatters/format';
import { FormatAmount, FormatCrypto, FormatFiat } from '../utils/formatters/Formatters';
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
    const { name } = this.props;
    return (
      <div className={styles.contentWithScroll}>
          <Table className={styles.table}>
              <thead>
              <tr>
                <th>Type</th>
                <th>Amount</th>
                <th>Price</th>
                <th>{name} Bal</th>
                <th>DAI Bal</th>
                <th>Equity (DAI)</th>
                <th>Liq. Price (USD)</th>
                <th>Time</th>
              </tr>
              </thead>
              <tbody>
              { this.props.history.map((e, i) => {
                const dAmount = e.dAmount ? e.dAmount : zero;
                const dDAIAmount = e.dDAIAmount  ? e.dDAIAmount : zero;

                let displayName: string | React.ReactNode = '';
                let amount: React.ReactNode = <></>;
                switch (e.kind) {
                  case MTHistoryEventKind.drawDai:
                    displayName = 'Withdraw';
                    amount = <><FormatCrypto value={dDAIAmount} token="DAI" /> DAI</>;
                    break;
                  case MTHistoryEventKind.drawGem:
                    amount = <><FormatFiat value={dAmount} token={e.token} /> {e.token}</>;
                    displayName = 'Withdraw';
                    break;
                  case MTHistoryEventKind.fundDai:
                    amount = <><FormatCrypto value={dDAIAmount} token="DAI" /> DAI</>;
                    displayName = 'Deposit';
                    break;
                  case MTHistoryEventKind.fundGem:
                    amount = <><FormatFiat value={dAmount} token={e.token} /> {e.token}</>;
                    displayName = 'Deposit';
                    break;
                  case MTHistoryEventKind.buyLev:
                    amount = <><FormatFiat value={dAmount} token={e.token} /> {e.token}</>;
                    displayName = <span className={styles.eventPositive}>Buy</span>;
                    break;
                  case MTHistoryEventKind.sellLev:
                    amount = <><FormatFiat value={dAmount} token={e.token} /> {e.token}</>;
                    displayName = <span className={styles.eventNegative}>Sell</span>;
                    break;
                  case MTHistoryEventKind.bite:
                    amount = <><FormatFiat value={dAmount} token={e.token} /> {e.token}</>;
                    displayName = `Grab (#${e.auctionId})`;
                    break;
                  case MTHistoryEventKind.deal:
                    displayName = `Deal (#${e.auctionId})`;
                    break;
                  case MTHistoryEventKind.redeem:
                    amount = <><FormatFiat value={dAmount} token={e.token} /> {e.token}</>;
                    displayName = `Redeem`;
                    break;
                  default:
                    displayName = e.kind;
                }

                const price = e.priceDai ? e.priceDai : e.price;

                return (
                  <tr key={i}>
                    <td className={classnames(styles.eventName, styles.cellLeftAligned)}>
                      {displayName}
                    </td>
                    <td>
                      {amount}
                    </td>
                    <td>
                      {
                      price
                        ? <FormatAmount value={price} token="DAI"/>
                        : <>-</>
                      }
                    </td>
                    <td>{
                      e.balance &&
                        <FormatCrypto value={e.balance} token={e.token}/>
                      }
                    </td>
                    <td>
                      {e.daiBalance &&
                        <FormatCrypto value={e.daiBalance} token="DAI"/>
                      }
                    </td>
                    <td>
                     <FormatCrypto value={e.equity} token="DAI" />
                    </td>
                    <td>
                      <>{
                          e.liquidationPrice && e.liquidationPrice.gt(zero)
                            ? <FormatAmount value={e.liquidationPrice} token="USD"/>
                            : <>-</>
                        }
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
}
