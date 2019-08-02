import * as React from 'react';
import * as ReactModal from 'react-modal';
import { connect } from '../../utils/connect';
import { FormStage, GasEstimationStatus, ProgressStage } from '../../utils/form';
import { Button } from '../../utils/forms/Buttons';
import { GasCost } from '../../utils/gasCost/GasCost';
import { BorderBox, Hr } from '../../utils/layout/LayoutHelpers';
import { ModalOpenerProps, ModalProps } from '../../utils/modal';
import { Panel, PanelBody, PanelFooter, PanelHeader } from '../../utils/panel/Panel';
import { Muted } from '../../utils/text/Text';
import { TransactionStateDescription } from '../../utils/text/TransactionStateDescription';
import { MTAccountState } from '../state/mtAccount';
import { MTSetupFormState, MTSetupProgressState } from './mtSetupForm';
import * as styles from './mtSetupFormView.scss';

export class MTSetupButton extends React.Component<MTSetupFormState & ModalOpenerProps> {
  public render() {
    return (
      <div style={{ marginBottom: '1em' }}>
        <Button size="lg" color="white"
                disabled={
                  this.props.mtaState === MTAccountState.setup ||
                  this.props.stage !== FormStage.idle
                }
                onClick={() => this.setup()}
                style={{ fontSize: '15px' }}
        >
          Create proxy
        </Button>
      </div>
    );
  }

  private setup() {
    const setup$ = this.props.setup();
    const MTSetupModalRxTx = connect<MTSetupProgressState, ModalProps>(MTSetupModal, setup$);
    this.props.open(MTSetupModalRxTx);
  }
}

export class MTSetupModal extends React.Component<MTSetupProgressState & ModalProps> {
  public render() {
    return (
      <ReactModal
        ariaHideApp={false}
        isOpen={true}
        className={styles.modal}
        overlayClassName={styles.modalOverlay}
        closeTimeoutMS={250}
      >
      <Panel style={{ width: '360px', height: '411px' }} className={styles.modalChild}>
        <PanelHeader bordered={true}>Proxy setup</PanelHeader>
        <PanelBody paddingVertical={true}
                   style={{ height: '287px' }}>

          <BorderBox className={styles.checklistBox}>
            <div className={styles.checklistLine} >
              <span className={styles.checklistTitle}>Create Proxy</span>
              <div className={styles.checklistSummary}>
                <TransactionStateDescription progress={this.props.stage}/>
              </div>
            </div>
            <Hr color="dark" className={styles.hrSmallMargin} />
            <div className={styles.checklistLine} >
              <span className={styles.checklistTitle}>Gas cost</span>
              <Muted className={styles.checklistSummary}>
                <GasCost gasEstimationStatus={GasEstimationStatus.calculated}
                         gasEstimationUsd={this.props.gasEstimationUsd}
                         gasEstimationEth={this.props.gasEstimationEth}
                />
              </Muted>
            </div>
          </BorderBox>
        </PanelBody>
        <PanelFooter>
          { this.props.stage === ProgressStage.done ||
            this.props.stage === ProgressStage.canceled ||
            this.props.stage === ProgressStage.fiasco ?
            <Button size="md" block={true} onClick={this.props.close} >Close</Button> :
            <Button size="md" block={true} onClick={this.props.cancel} >Cancel</Button>
          }
        </PanelFooter>
      </Panel>
      </ReactModal>
    );
  }
}
