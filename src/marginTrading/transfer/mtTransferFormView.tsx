import { BigNumber } from 'bignumber.js';
import * as React from 'react';
import * as ReactModal from 'react-modal';

import { createNumberMask } from 'text-mask-addons/dist/textMaskAddons';
import { AssetKind, tokens } from '../../blockchain/config';
import { BigNumberInput } from '../../utils/bigNumberInput/BigNumberInput';
import { connect } from '../../utils/connect';
import { FormChangeKind, ProgressStage } from '../../utils/form';
import { formatAmount } from '../../utils/formatters/format';
import { Money } from '../../utils/formatters/Formatters';
import { Button } from '../../utils/forms/Buttons';
import { ErrorMessage } from '../../utils/forms/ErrorMessage';
import { InputGroup, InputGroupAddon } from '../../utils/forms/InputGroup';
import { GasCost } from '../../utils/gasCost/GasCost';
import { inject } from '../../utils/inject';
import { BorderBox, Hr } from '../../utils/layout/LayoutHelpers';
import { Loadable, loadablifyLight } from '../../utils/loadable';
import { ModalOpenerProps, ModalProps } from '../../utils/modal';
import { Panel, PanelBody, PanelFooter, PanelHeader } from '../../utils/panel/Panel';
import { Muted } from '../../utils/text/Text';
import { TransactionStateDescription } from '../../utils/text/TransactionStateDescription';
import { zero } from '../../utils/zero';
import { MTAllocateState } from '../allocate/mtOrderAllocateDebtForm';
import {
  DrawAllocateFormView,
  FundAllocateFormView
} from '../allocate/mtOrderAllocateDebtFormView';
import { CreateMTAllocateForm$Props } from '../order/mtOrderFormView';
import { prepareDrawRequest } from '../plan/planDraw';
import { prepareFundRequest } from '../plan/planFund';
import {
  CashAsset,
  findAsset,
  MarginableAsset,
  MTAccountState,
  NonMarginableAsset,
  UserActionKind,
} from '../state/mtAccount';
import { Message, MessageKind, MTTransferFormState, } from './mtTransferForm';
import * as styles from './mtTransferFormView.scss';

type MTFundFormProps =
  MTTransferFormState & ModalProps & ModalOpenerProps & CreateMTAllocateForm$Props;

export class MtTransferFormView extends React.Component<MTFundFormProps> {

  constructor(p: MTFundFormProps) {
    super(p);
    this.amountChange = this.amountChange.bind(this);
    this.close = this.close.bind(this);
  }

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
          <PanelHeader bordered={true}>{this.header(this.props.progress)}</PanelHeader>
          <PanelBody paddingTop={true} style={{ height: '287px' }}>
            {this.AccountSummary()}
            <Hr color="dark" className={styles.hrBigMargin} />
            {this.FormOrTransactionState()}
          </PanelBody>
          {this.Buttons()}
        </Panel>
      </ReactModal>
    );
  }

  private header(progress?: ProgressStage) {
    return !progress ?
      `${tokens[this.props.token].name} ${this.props.actionKind === UserActionKind.fund ?
        'deposit' : 'withdraw' }` :
      'Finalize transaction';
  }

  private amountChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value.replace(/,/g, '');
    this.props.change({
      kind: FormChangeKind.amountFieldChange,
      value: value === '' ? undefined : new BigNumber(value)
    });
  }

  private close() {
    this.props.cancel();
    this.props.close();
  }

  private getAsset(token: string): undefined | CashAsset | MarginableAsset | NonMarginableAsset {
    return findAsset(token, this.props.mta);
  }

  private AccountSummary = () => {
    const asset = this.getAsset(this.props.token);

    return(
      <table className={styles.balanceTable}>
        <tbody>
        <tr>
          <td><Muted>Wallet</Muted></td>
          <td>{asset && formatAmount(asset.walletBalance, asset.name)} {this.props.token}</td>
        </tr>
        <tr>
          <td><Muted>Margin account</Muted></td>
          <td>{ asset && formatAmount(asset.balance, this.props.token)} {this.props.token}</td>
        </tr>
        { asset && asset.assetKind === AssetKind.marginable &&
          <tr>
            <td><Muted>Available amount</Muted></td>
            <td><Money value={asset.availableBalance} token={this.props.token} /></td>
          </tr>
        }
        {asset &&
        (asset.assetKind === AssetKind.marginable ||
          asset.assetKind === AssetKind.nonMarginable) &&
          <tr>
            <td><Muted>Purchasing power</Muted></td>
            <td>{formatAmount(asset.purchasingPower, 'DAI')} DAI
            </td>
          </tr>
        }
        </tbody>
      </table>
    );
  }

  private Form() {
    return (
      <div>
        {this.AmountGroup(false)}
        { !!this.props.messages &&
          <ErrorMessage
            messages={this.props.messages.map(msg => this.messageContent(msg))}
          />
        }

        <table className={styles.balanceTable}>
          <tbody>
            <tr>
              <td><Muted>Gas cost</Muted></td>
              <td>
                <GasCost gasEstimationStatus={this.props.gasEstimationStatus}
                         gasEstimationUsd={this.props.gasEstimationUsd}
                         gasEstimationEth={this.props.gasEstimationEth}
                />
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  }

  private TransactionState() {
    const amount = this.props.amount || new BigNumber(0);
    return (
      <BorderBox className={styles.checklistBox}>
        <div className={styles.checklistLine} >
          <span className={styles.checklistTitle}>
            {tokens[this.props.token].name} deposit
          </span>
          <div className={styles.checklistSummary}>
            <TransactionStateDescription progress={this.props.progress}/>
          </div>
        </div>
        <Hr color="dark" className={styles.hrSmallMargin} />
        <div className={styles.checklistLine} >
          <span className={styles.checklistTitle}>Amount</span>
          <Muted className={styles.checklistSummary}>
            {formatAmount(amount, this.props.token)} {this.props.token}
          </Muted>
        </div>
        <Hr color="dark" className={styles.hrSmallMargin} />
        <div className={styles.checklistLine} >
          <span className={styles.checklistTitle}>Gas cost</span>
          <Muted className={styles.checklistSummary}>
            <GasCost gasEstimationStatus={this.props.gasEstimationStatus}
                     gasEstimationUsd={this.props.gasEstimationUsd}
                     gasEstimationEth={this.props.gasEstimationEth}
            />
          </Muted>
        </div>
      </BorderBox>
    );
  }

  private FormOrTransactionState() {
    return this.props.progress ? this.TransactionState() : this.Form();
  }

  private transfer() {
    if (!this.props.mta || this.props.mta.state === MTAccountState.notSetup || !this.props.amount) {
      return;
    }

    // always false for now -- separate transfer from reallocations
    if (this.props.mta.totalDebt.lt(zero)) {
      const prepareRequest = this.props.actionKind === UserActionKind.fund ?
        prepareFundRequest : prepareDrawRequest;
      const view = this.props.actionKind === UserActionKind.fund ?
        FundAllocateFormView : DrawAllocateFormView;

      const transferProps = {
        amount: this.props.amount,
        token: this.props.token,
      };

      const allocateForm$ = this.props.createMTAllocateForm$(
        this.props.mta.proxy,
        prepareRequest(
          this.props.amount ,
          this.props.token,
          this.props.mta)
      );

      this.props.open(
        connect<Loadable<MTAllocateState>, ModalProps>(
          inject(view, transferProps),
          loadablifyLight(allocateForm$)
        )
      );
      return;
    }

    this.props.transfer(this.props);
  }

  private Buttons() {
    const retry = this.props.progress === ProgressStage.fiasco;
    const depositAgain = this.props.progress === ProgressStage.done;
    const deposit = !retry && !depositAgain;
    const depositEnabled = this.props.readyToProceed && this.props.progress === undefined;
    const proceedName = this.props.actionKind === UserActionKind.fund ? 'Deposit' : 'Withdraw';
    return (
      <PanelFooter className={styles.buttons}>
      <Button size="md" className={styles.button} onClick={this.close} >Close</Button>
      {deposit &&
        <Button size="md"
                className={styles.button}
                disabled={!depositEnabled}
                onClick={() => this.transfer()}
        >
          {proceedName}
        </Button>
      }
      {retry  &&
        <Button size="md"
                className={styles.button}
                onClick={() => this.transfer()}
        >
          Retry
        </Button>
      }
      {depositAgain &&
        <Button size="md"
                className={styles.button}
                onClick={() => this.props.reset()}
        >
          {proceedName} again
        </Button>
      }
    </PanelFooter>);
  }

  private AmountGroup(disabled: boolean) {
    return (
      <InputGroup sizer="md" disabled={disabled}>
        <InputGroupAddon border="right">Amount</InputGroupAddon>
        <BigNumberInput
          type="text"
          mask={createNumberMask({
            allowDecimal: true,
            decimalLimit: 5,
            prefix: ''
          })}
          onChange={this.amountChange}
          value={
            (this.props.amount || null) &&
            formatAmount(this.props.amount as BigNumber, this.props.token)
          }
          guide={true}
          placeholderChar={' '}
          disabled={disabled}
        />
      </InputGroup>
    );
  }

  private messageContent(msg: Message) {
    switch (msg.kind) {
      case MessageKind.insufficientAvailableAmount:
        return  `Your available balance is too low to fund this order`;
      case MessageKind.insufficientAmount:
        return  `Your balance is too low to fund this order`;
      case MessageKind.dustAmount:
        return `Order below token limit`;
      case MessageKind.impossibleToPlan:
        return msg.message;
    }
  }

}
