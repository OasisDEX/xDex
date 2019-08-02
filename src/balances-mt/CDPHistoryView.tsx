import * as React from 'react';
import * as ReactModal from 'react-modal';

import { MarginableAsset } from '../marginTrading/state/mtAccount';
import { MTHistoryEvent, MTHistoryEventKind } from '../marginTrading/state/mtHistory';
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
                  <td style={{ width: '125px' }} >Date</td>
                  <td style={{ width: '60px' }} >Event</td>
                  <td style={{ width: '40px' }} >Id</td>
                  <td style={{ width: '190px' }} >Description</td>
              </tr>
              </thead>
              <tbody>
              { this.props.history.map((e, i) => (
                  <tr key={i}>
                    <td>
                      <InfoLabel>
                        { formatDateTime(new Date(e.timestamp * 1000), true) }
                      </InfoLabel>
                    </td>
                    <td className={styles.eventName}>{e.kind}</td>
                    <td>
                      <InfoLabel>{(e as any).id && (e as any).id.toString()}</InfoLabel>
                    </td>
                    <td>{ this.eventDecription(e)}</td>
                  </tr>
                )
              )}
              </tbody>
          </Table>
      </div>
    );
  }

  private eventDecription(event: MTHistoryEvent) {
    if (event.kind === MTHistoryEventKind.deal) {
      return null;
    }
    return (
      <div>
      <span>
        { (event as any).gem && (event as any).gem.toString() } { event.token }
      </span>
        <span style={{ marginLeft: '1em' }}>
        { (event as any).dai && (event as any).dai.toString() } DAI
      </span>
      </div>
    );
  }
}
