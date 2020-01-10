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
import { SvgImage } from '../../utils/icons/utils';
import { BorderBox, Hr } from '../../utils/layout/LayoutHelpers';
import { LoadingIndicator } from '../../utils/loadingIndicator/LoadingIndicator';
import { ModalProps } from '../../utils/modal';
import { Panel, PanelBody, PanelFooter } from '../../utils/panel/Panel';
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
import checkIconSvg from './check-icon.svg';
import {
  Message, MessageKind, MTTransferFormState, MTTransferFormTab
} from './mtTransferForm';
import * as styles from './mtTransferFormView.scss';

type MTFundFormProps = MTTransferFormState & ModalProps;

const tabLabels: Dictionary<string> = {
  [MTTransferFormTab.proxy]: 'Deploy proxy',
  [MTTransferFormTab.transfer]: 'Deposit',
};

interface StepComponentProps {
  title: string;
  description: string;
  btnLabel: string;
  btnAction: () => void;
  btnDisabled: boolean;
  stepCompleted: boolean;
  isLoading: boolean;
}

class StepComponent extends React.Component<StepComponentProps> {
  public render() {
    const { title, description, btnLabel, btnAction,
      stepCompleted, btnDisabled, isLoading } = this.props;

    return (<div className={styles.onboardingPanel}>
      <h3 className={styles.onboardingHeader}>{title}</h3>
      <div className={styles.onboardingParagraph}>{description}</div>
      <Button
        size="md"
        color={stepCompleted ? 'primaryOutlinedDone' : 'primary'}
        disabled={btnDisabled || isLoading || stepCompleted}
        onClick={() => btnAction()}
        className={classnames({ [styles.buttonDone]: stepCompleted })}
      >{
        stepCompleted ? <SvgImage image={checkIconSvg}/> :
          isLoading && !btnDisabled ?  <LoadingIndicator inline={true} /> : btnLabel
      }</Button>

    </div>);
  }
}

export class MtTransferFormView extends React.Component<MTFundFormProps> {

  constructor(p: MTFundFormProps) {
    super(p);
  }

  public render() {

    const onModalRef = (node: any) => {
      if (node) {
        node.addEventListener('click', (e: any) => {
          if (e.target.classList.contains(styles.modal)) {
            this.close();
          }
        });
      }
    };

    const allowance = (_mta: MTAccount, _token: string) =>  _token === 'DAI' ? _mta.daiAllowance :
      findMarginableAsset(_token, _mta)!.allowance;

    const onboardingTabs = Object.keys(MTTransferFormTab);

    const startIndex = this.props.startTab ? onboardingTabs.indexOf(this.props.startTab) : 0;

    const { mta, token, progress } = this.props;

    const isLoading = (progress === ProgressStage.waitingForApproval
      || progress === ProgressStage.waitingForConfirmation);

    const currentTab = mta &&
    (mta.proxy && mta.proxy.options.address !== nullAddress && allowance(mta, token)) ?
      MTTransferFormTab.transfer : MTTransferFormTab.proxy;

    return (
      <ReactModal
        ariaHideApp={false}
        isOpen={true}
        className={styles.modal}
        overlayClassName={styles.modalOverlay}
        closeTimeoutMS={250}
        overlayRef={onModalRef}
        shouldCloseOnEsc={true}
      >
        <Panel className={styles.modalChild}>
          <div className={styles.tabs}>
            {
              onboardingTabs.filter(
                (_tab: string, index: number) => (index >= startIndex)
              ).map(_tab => {
                return (<div
                  className={
                    classnames({
                      [styles.tab]: true,
                      [styles.tabActive]: (_tab === currentTab)
                    })
                  }
                  key={_tab}>{tabLabels[_tab]}</div>);
              })
            }
          </div>

          {mta ?
            <>
              {currentTab === MTTransferFormTab.proxy ?
                <>
                  <StepComponent
                    title="Deploy proxy"
                    description={`Proxies are used to bundle multiple transactions into one,
                saving transaction time and gas costs. This only has to be done once.`}
                    btnLabel="Deploy Proxy"
                    btnAction={() => this.setup()}
                    btnDisabled={mta.proxy && mta.proxy.options.address !== nullAddress}
                    isLoading={isLoading}
                    stepCompleted={mta.proxy && mta.proxy.options.address !== nullAddress}
                  />
                  <StepComponent
                    title="Set allowance"
                    description={`This permission allows Oasis smart contracts
                   to interact with your ${token}.
                   This has to be done for each asset type.`}
                    btnLabel="Set allowance"
                    btnAction={() => this.allowance()}
                    isLoading={isLoading}
                    btnDisabled={
                      mta.proxy && mta.proxy.options.address === nullAddress
                    }
                    stepCompleted={mta && allowance(mta, token)}
                  />
                </> :
                <>
                  {allowance(mta, token) && mta.proxy && <>
                    <PanelBody paddingTop={true} style={{ height: '287px' }}>
                      {this.AccountSummary()}
                      <Hr color="dark" className={styles.hrBigMargin}/>
                      {this.FormOrTransactionState()}
                    </PanelBody>
                    {this.Buttons()}
                  </>
                  }
                </>
              }
            </> : <LoadingIndicator/>
          }
        </Panel>
      </ReactModal>
    );
  }

  private amountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/,/g, '');
    this.props.change({
      kind: FormChangeKind.amountFieldChange,
      value: value === '' ? undefined : new BigNumber(value)
    });
  }

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

    const liquidationPrice = this.props.liquidationPrice ?
      this.props.liquidationPrice : zero;

    const liquidationPricePost = this.props.liquidationPricePost ?
      this.props.liquidationPricePost : zero;

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
                { this.props.realPurchasingPowerPost ?
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
              { baseAsset && baseAsset.balance ?
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
                  { this.props.balancePost ?
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
              { this.props.daiBalance &&
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
                  { this.props.daiBalancePost ?
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
    if (this.props.mta && this.props.mta.state !== MTAccountState.notSetup && this.props.amount) {
      this.props.transfer(this.props);
    }
  }

  private setup() {
    if (this.props.mta) {
      this.props.setup(this.props);
    }
  }

  private allowance() {
    if (this.props.mta && this.props.mta.state !== MTAccountState.notSetup) {
      this.props.allowance(this.props);
    }
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
