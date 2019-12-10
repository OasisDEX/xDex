import { BigNumber } from 'bignumber.js';
import * as React from 'react';
import * as ReactModal from 'react-modal';

import classnames from 'classnames';
import { Dictionary } from 'ramda';
import { createNumberMask } from 'text-mask-addons/dist/textMaskAddons';
import { getToken } from '../../blockchain/config';
import { nullAddress } from '../../blockchain/utils';
import { BigNumberInput } from '../../utils/bigNumberInput/BigNumberInput';
import { FormChangeKind, ProgressStage } from '../../utils/form';
import { formatAmount } from '../../utils/formatters/format';
import { Money } from '../../utils/formatters/Formatters';
import { Button } from '../../utils/forms/Buttons';
import { ErrorMessage } from '../../utils/forms/ErrorMessage';
import { InputGroup, InputGroupAddon } from '../../utils/forms/InputGroup';
import { GasCost } from '../../utils/gasCost/GasCost';
import { BorderBox, Hr } from '../../utils/layout/LayoutHelpers';
import { ModalProps } from '../../utils/modal';
import { Panel, PanelBody, PanelFooter, PanelHeader } from '../../utils/panel/Panel';
import { Muted } from '../../utils/text/Text';
import { TransactionStateDescription } from '../../utils/text/TransactionStateDescription';
import { zero } from '../../utils/zero';
import {
  CashAsset,
  findAsset, findMarginableAsset,
  MarginableAsset, MTAccount,
  MTAccountState,
  UserActionKind,
} from '../state/mtAccount';
import {
  Message, MessageKind, MTTransferFormState, MTTransferFormTab
} from './mtTransferForm';
import * as styles from './mtTransferFormView.scss';

type MTFundFormProps = MTTransferFormState & ModalProps;

const tabLabels: Dictionary<string> = {
  [MTTransferFormTab.proxy]: 'Deploy proxy',
  [MTTransferFormTab.allowance]: 'Set allowance',
  [MTTransferFormTab.transfer]: 'Deposit',
};

export class MtTransferFormView extends React.Component<MTFundFormProps> {

  constructor(p: MTFundFormProps) {
    super(p);
  }

  public render() {

    // const ma = findMarginableAsset(this.props.ilk, mta);

    const allowance = (mta: MTAccount, token: string) =>  token === 'DAI' ? mta.daiAllowance :
      findMarginableAsset(token, mta)!.allowance;

    const onboardingTabs = Object.keys(MTTransferFormTab);

    const startIndex = this.props.startTab ? onboardingTabs.indexOf(this.props.startTab) : 0;

    return (
      <ReactModal
        ariaHideApp={false}
        isOpen={true}
        className={styles.modal}
        overlayClassName={styles.modalOverlay}
        closeTimeoutMS={250}
      >
        <Panel style={{ width: '450px', height: '575px' }} className={styles.modalChild}>
          <div className={styles.tabs}>
          {
            onboardingTabs.filter(
              (tab: string, index: number) => (index >= startIndex)
            ).map(tab => {
              return (<div
                className={
                  classnames({
                    [styles.tab]: true,
                    [styles.tabActive]: (tab === this.props.tab)
                  })
                }
                key={tab}>{tabLabels[tab]}</div>);
            })
          }
          </div>
          { this.props.mta && this.props.mta.proxy && this.props.mta.proxy.address === nullAddress ?
            <div className={styles.onboardingPanel}>
              <h3 className={styles.onboardingHeader}>Deploy proxy</h3>
              <div className={styles.onboardingParagraph}>
                Proxies are used to bundle multiple transactions into one,
                saving transaction time and gas costs. This only has to be done once.
              </div>
              <Button
                size="md"
                color="primary"
                onClick={() => this.setup()}
              >Deploy Proxy</Button>
            </div> :
            this.props.mta && !allowance(this.props.mta, this.props.token) ?
              <div className={styles.onboardingPanel}>
                <h3 className={styles.onboardingHeader}>Set allowance</h3>
                <div className={styles.onboardingParagraph}>
                  This permission allows Oasis smart contracts to interact with your {name}.
                  This has to be done for each asset type.
                </div>
              <Button
                size="md"
                color="primary"
                onClick={() => this.allowance()}
              >Set allowance</Button>
              </div>
              : <></>
          }
          { this.props.mta && allowance(this.props.mta, this.props.token) && this.props.mta.proxy ?
            <>
              <PanelBody paddingTop={true} style={{ height: '287px' }}>
                {this.AccountSummary()}
                <Hr color="dark" className={styles.hrBigMargin}/>
                {this.FormOrTransactionState()}
              </PanelBody>
              {this.Buttons()}
            </>
            : <>
            </>
          }
        </Panel>
      </ReactModal>
    );
  }

  private header(progress?: ProgressStage) {
    return !progress ?
      `${getToken(this.props.token).name} ${this.props.actionKind === UserActionKind.fund ?
        'deposit' : 'withdraw' }` :
      'Finalize transaction';
  }

  private amountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/,/g, '');
    this.props.change({
      kind: FormChangeKind.amountFieldChange,
      value: value === '' ? undefined : new BigNumber(value)
    });
  }

  // private ilkChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
  //   const value = e.target.value;
  //   this.props.change({
  //     value,
  //     kind: TransferFormChangeKind.ilkFieldChange,
  //   });
  // }

  private close = () => {
    this.props.cancel();
    this.props.close();
  }

  private getAsset(token: string): undefined | CashAsset | MarginableAsset {
    return findAsset(token, this.props.mta);
  }

  private AccountSummary = () => {
    const asset = this.getAsset(this.props.token);
    const baseToken = this.props.token === 'DAI' && this.props.ilk || this.props.token;
    const baseAsset = this.getAsset(baseToken) as MarginableAsset;

    // TODO: remove NaN conditions
    const liquidationPrice =
      this.props.liquidationPrice && !this.props.liquidationPrice.isNaN() ?
        this.props.liquidationPrice : zero;

    const liquidationPricePost = this.props.liquidationPricePost
    && !this.props.liquidationPricePost.isNaN() ? this.props.liquidationPricePost : zero;
    return(
      <>
          <div className={classnames(styles.orderSummaryRow, styles.orderSummaryRowDark)}>
            <div className={styles.orderSummaryLabel}>
              Purchasing Power
            </div>
            <div className={styles.orderSummaryValue}>
              {
                this.props.realPurchasingPower &&
                <Money
                  value={ this.props.realPurchasingPower}
                  token={'DAI'}
                  fallback="-"
                />
              }
              { this.props.realPurchasingPowerPost &&
              <>
                <span className={styles.transitionArrow} />
                { !this.props.realPurchasingPowerPost.isNaN() ?
                  <Money
                    value={ this.props.realPurchasingPowerPost}
                    token={'DAI'}
                    fallback="-"
                  />
                  : <span>-</span>
                }
              </>
              }
            </div>
          </div>
          <div className={classnames(styles.orderSummaryRow, styles.orderSummaryRowDark)}>
            <div className={styles.orderSummaryLabel}>
              Account Balance
            </div>
            <div className={styles.orderSummaryValue}>
              { baseAsset && !baseAsset.balance.isNaN() ?
                <Money
                  value={baseAsset.balance}
                  token={baseToken}
                  fallback="-"
                /> : <span>-</span>
              }
              {
                baseAsset && baseAsset.balance && this.props.balancePost &&
                !this.props.balancePost.isEqualTo(baseAsset.balance) &&
                <>
                  <span className={styles.transitionArrow} />
                  { !this.props.balancePost.isNaN() ?
                    <Money
                      value={this.props.balancePost}
                      token={baseToken}
                      fallback="-"
                    /> : <span>-</span>
                  }
                </>
              }
            </div>
          </div>
          <div className={classnames(styles.orderSummaryRow, styles.orderSummaryRowDark)}>
            <div className={styles.orderSummaryLabel}>
              Liquidation Price
            </div>
            <div className={styles.orderSummaryValue}>
              <Money
                value={liquidationPrice}
                token="USD"
                fallback="-"
                className={
                  classnames({
                    [styles.orderSummaryValuePositive]: baseAsset && baseAsset.safe,
                    [styles.orderSummaryValueNegative]: baseAsset && !baseAsset.safe
                  })
                }
              />
              {
                this.props.liquidationPricePost &&
                this.props.liquidationPrice &&
                !this.props.liquidationPrice.isEqualTo(this.props.liquidationPricePost) &&
                <>
                  <span className={styles.transitionArrow} />
                  <Money
                    value={liquidationPricePost}
                    token="USD"
                    fallback="-"
                    className={
                      classnames({
                        [styles.orderSummaryValuePositive]: this.props.isSafePost,
                        [styles.orderSummaryValueNegative]: !this.props.isSafePost,
                      })
                    }
                  />
                </>
              }
            </div>
          </div>
          <div className={classnames(styles.orderSummaryRow, styles.orderSummaryRowDark)}>
            <div className={styles.orderSummaryLabel}>
              DAI Balance
            </div>
            <div className={styles.orderSummaryValue}>
              { this.props.daiBalance && !this.props.daiBalance.isNaN() &&
              <Money
                value={this.props.daiBalance}
                token={'DAI'}
                fallback="-"
              />
              }
              {
                this.props.daiBalancePost && this.props.daiBalance &&
                !this.props.daiBalance.isEqualTo(this.props.daiBalancePost) &&
                <>
                  <span className={styles.transitionArrow} />
                  { !this.props.daiBalancePost.isNaN() ?
                    <Money
                      value={this.props.daiBalancePost}
                      token={'DAI'}
                      fallback="-"
                    /> : <span>-</span>
                  }
                </>
              }
            </div>
          </div>

        <div className={classnames(styles.orderSummaryRow, styles.orderSummaryRowDark)}>
          <div className={styles.orderSummaryLabel}>
            Wallet Balance
          </div>
          <div className={styles.orderSummaryValue}>
            {asset && formatAmount(asset.walletBalance, asset.name)} {this.props.token}
          </div>
        </div>
      </>
    );
  }

  private Form() {
    return (
      <div>
        {/*{this.props.token === 'DAI' ? this.TargetGroup() : null}*/}
        {this.AmountGroup(false)}
        { !!this.props.messages &&
        <ErrorMessage
          messages={this.props.messages.map(msg => this.messageContent(msg))}
        />
        }
      </div>
    );
  }

  private TransactionState() {
    const amount = this.props.amount || new BigNumber(0);
    return (
      <BorderBox className={styles.checklistBox}>
        <div className={styles.checklistLine} >
          <span className={styles.checklistTitle}>
            {getToken(this.props.token).name} deposit
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
    this.props.transfer(this.props);
  }

  private setup() {
    if (!this.props.mta) {
      return;
    }
    this.props.setup(this.props);
  }

  private allowance() {
    if (!this.props.mta || this.props.mta.state === MTAccountState.notSetup) {
      return;
    }
    this.props.allowance(this.props);
  }

  private Buttons() {
    const retry = this.props.progress === ProgressStage.fiasco;
    const depositAgain = this.props.progress === ProgressStage.done;
    const deposit = !retry && !depositAgain;
    const depositEnabled = this.props.readyToProceed && this.props.progress === undefined &&
      (this.props.token !== 'DAI' || !!this.props.ilk);
    const proceedName = this.props.actionKind === UserActionKind.fund ? 'Deposit' : 'Withdraw';
    return (
      <PanelFooter className={styles.buttons}>
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
