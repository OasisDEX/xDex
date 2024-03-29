/*
 * Copyright (C) 2020 Maker Ecosystem Growth Holdings, INC.
 */

import { BigNumber } from 'bignumber.js';
import React, { useContext } from 'react';
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
import { LoadingIndicator } from '../../utils/loadingIndicator/LoadingIndicator';
import { Panel, PanelBody, PanelFooter, PanelHeader } from '../../utils/panel/Panel';
import { Muted } from '../../utils/text/Text';
import { TransactionStateDescription } from '../../utils/text/TransactionStateDescription';
import { zero } from '../../utils/zero';

import * as ReactDOM from 'react-dom';
import { ModalProps } from 'src/utils/modalHook';
import { useObservable } from 'src/utils/observableHook';
import { trackingEvents } from '../../analytics/analytics';
import { theAppContext } from '../../AppContext';
import { SvgImage } from '../../utils/icons/utils';
import { MtSimpleOrderFormBody } from '../simple/mtOrderFormView';
import * as stylesOrder from '../simple/mtOrderFormView.scss';
import {
  CashAsset,
  findAsset,
  findMarginableAsset,
  MarginableAsset,
  MTAccount,
  MTAccountState,
  UserActionKind,
} from '../state/mtAccount';
import checkIconSvg from './check-icon.svg';
import { Message, MessageKind, MTTransferFormState, MTTransferFormTab } from './mtTransferForm';
import * as styles from './mtTransferFormView.scss';

type MTFundFormProps = MTTransferFormState & ModalProps;

const tabLabels: Dictionary<string> = {
  [MTTransferFormTab.proxy]: 'Deploy proxy',
  [MTTransferFormTab.transfer]: 'Deposit',
  [MTTransferFormTab.buy]: 'Buy',
};

interface StepComponentProps {
  title: string;
  description: string;
  btnLabel: string;
  btnAction: () => void;
  btnDisabled: boolean;
  stepCompleted: boolean;
  isLoading: boolean;
  tid?: string;
}

class StepComponent extends React.Component<StepComponentProps> {
  public render() {
    const { title, description, btnLabel, btnAction, stepCompleted, btnDisabled, isLoading, tid } = this.props;

    return (
      <div className={styles.onboardingPanel}>
        <h3 className={styles.onboardingHeader}>{title}</h3>
        <div className={styles.onboardingParagraph}>{description}</div>
        <Button
          size="md"
          data-test-id={tid}
          color={stepCompleted ? 'primaryOutlinedDone' : 'primary'}
          disabled={btnDisabled || isLoading || stepCompleted}
          onClick={() => btnAction()}
          className={classnames({ [styles.buttonDone]: stepCompleted })}
        >
          {stepCompleted ? (
            <SvgImage data-test-id="step-completed" image={checkIconSvg} />
          ) : isLoading && !btnDisabled ? (
            <LoadingIndicator inline={true} />
          ) : (
            btnLabel
          )}
        </Button>
      </div>
    );
  }
}

export class MtTransferFormView extends React.Component<MTFundFormProps> {
  private amountInput?: HTMLElement;

  constructor(p: MTFundFormProps) {
    super(p);
  }

  public render() {
    const { mta, token, progress, startTab, withOnboarding, ilk } = this.props;

    const onModalRef = (node: any) => {
      if (node) {
        node.addEventListener('click', (e: any) => {
          if (e.target.classList.contains(styles.modal)) {
            this.close();
          }
        });
      }
    };

    let currentTab = MTTransferFormTab.transfer;
    let onboardingTabs: string[] = [];
    let startIndex = 0;

    const isLoading =
      !mta || progress === ProgressStage.waitingForApproval || progress === ProgressStage.waitingForConfirmation;

    const allowance = (_mta: MTAccount, _token: string) =>
      _token === 'DAI' ? _mta.daiAllowance : findMarginableAsset(_token, _mta)!.allowance;

    if (withOnboarding) {
      onboardingTabs = Object.keys(MTTransferFormTab);
      startIndex = startTab ? onboardingTabs.indexOf(startTab) : 0;
      currentTab = MTTransferFormTab.proxy;

      if (mta && mta.proxy && mta.proxy.options.address !== nullAddress && allowance(mta, token)) {
        currentTab = MTTransferFormTab.transfer;
      }

      const ma = findMarginableAsset((token === 'DAI' && ilk) || token, mta);

      if (mta && ma && ma.purchasingPower.gt(zero)) {
        currentTab = MTTransferFormTab.buy;
      }
    }

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
        <Panel className={styles.modalChild} data-test-id="modal">
          {withOnboarding ? (
            <div className={styles.tabs}>
              {onboardingTabs
                .filter((_tab: string, index: number) => index >= startIndex)
                .map((_tab) => {
                  return (
                    <div
                      data-test-id={(_tab === currentTab && 'active-tab') || ''}
                      className={classnames({
                        [styles.tab]: true,
                        [styles.tabActive]: _tab === currentTab,
                      })}
                      key={_tab}
                    >
                      {tabLabels[_tab]}
                    </div>
                  );
                })}
            </div>
          ) : (
            <PanelHeader data-test-id="header">{this.getActionName()}</PanelHeader>
          )}
          {mta ? (
            <>
              {currentTab === MTTransferFormTab.proxy && (
                <>
                  <StepComponent
                    title="Deploy proxy"
                    description={`Proxies are used to bundle multiple transactions into one,
                saving transaction time and gas costs. This only has to be done once.`}
                    tid="create-proxy"
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
                    tid="set-allowance"
                    btnLabel="Set allowance"
                    btnAction={() => this.allowance()}
                    isLoading={isLoading}
                    btnDisabled={mta.proxy && mta.proxy.options.address === nullAddress}
                    stepCompleted={mta && allowance(mta, token)}
                  />
                  <div className={styles.onboardingPanel}>
                    <Button
                      size="md"
                      className={styles.cancelButton}
                      block={true}
                      data-test-id="close-modal"
                      color="greyOutlined"
                      onClick={() => this.close()}
                    >
                      Cancel
                    </Button>
                  </div>
                </>
              )}
              {currentTab === MTTransferFormTab.transfer && (
                <>
                  <PanelBody paddingTop={true} style={{ height: '287px' }} data-test-id="transfer">
                    {this.AccountSummary()}
                    <Hr color="dark" className={styles.hrBigMargin} />
                    {this.FormOrTransactionState()}
                  </PanelBody>
                  {this.Buttons()}
                </>
              )}
              {currentTab === MTTransferFormTab.buy && (
                <>
                  <MTSimpleOrderBuyPanel close={this.props.close} />
                </>
              )}
            </>
          ) : (
            <LoadingIndicator />
          )}
        </Panel>
      </ReactModal>
    );
  }

  public handleSetMaxAmount = () => {
    const { token, balances, actionKind } = this.props;

    if (balances) {
      const maxValue = actionKind === UserActionKind.fund ? balances[token] : this.getMaxWithdrawAmount();
      this.handleSetMax(maxValue, FormChangeKind.amountFieldChange);
    }
  };

  public handleAmountFocus = () => {
    if (this.amountInput) {
      this.amountInput.focus();
    }
  };

  private getMaxWithdrawAmount = (): BigNumber => {
    const { daiBalance, ilk, token } = this.props;
    const baseToken = (token === 'DAI' && ilk) || token;
    const baseAsset = this.getAsset(baseToken) as MarginableAsset;
    return token === 'DAI' ? (daiBalance && daiBalance.gt(zero) ? daiBalance : zero) : baseAsset.availableBalance;
  };

  private amountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/,/g, '');
    this.props.change({
      kind: FormChangeKind.amountFieldChange,
      value: value === '' ? undefined : new BigNumber(value),
    });
  };

  private close = () => {
    this.props.cancel();
    this.props.close();
  };

  private getAsset(token: string): undefined | CashAsset | MarginableAsset {
    return findAsset(token, this.props.mta);
  }

  private AccountSummary = () => {
    const {
      token,
      ilk,
      liquidationPrice,
      liquidationPricePost,
      realPurchasingPower,
      realPurchasingPowerPost,
      balancePost,
      isSafePost,
      daiBalance,
      daiBalancePost,
      balances,
    } = this.props;
    const baseToken = (token === 'DAI' && ilk) || token;
    const baseAsset = this.getAsset(baseToken) as MarginableAsset;
    const liquidationPriceDisplay = liquidationPrice ? liquidationPrice : zero;
    const liquidationPricePostDisplay = liquidationPricePost ? liquidationPricePost : zero;
    return (
      <>
        <div className={styles.subtitle}>{`${getToken(token).name} (${token}) ${this.getActionName()}`}</div>
        <div className={classnames(styles.orderSummaryRow, styles.orderSummaryRowDark)}>
          <div className={styles.orderSummaryLabel}>Purchasing Power</div>
          <div className={styles.orderSummaryValue}>
            {realPurchasingPower && <Money value={realPurchasingPower} token={'DAI'} fallback="-" />}
            {realPurchasingPowerPost && (
              <>
                <span className={styles.transitionArrow} />
                {realPurchasingPowerPost ? (
                  <Money value={realPurchasingPowerPost} token={'DAI'} fallback="-" />
                ) : (
                  <span>-</span>
                )}
              </>
            )}
          </div>
        </div>
        <div className={classnames(styles.orderSummaryRow, styles.orderSummaryRowDark)}>
          <div className={styles.orderSummaryLabel}>Account Balance</div>
          <div className={styles.orderSummaryValue}>
            {baseAsset && baseAsset.balance ? (
              <Money value={baseAsset.balance} token={baseToken} fallback="-" />
            ) : (
              <span>-</span>
            )}
            {baseAsset && baseAsset.balance && balancePost && !balancePost.isEqualTo(baseAsset.balance) && (
              <>
                <span className={styles.transitionArrow} />
                {balancePost ? <Money value={balancePost} token={baseToken} fallback="-" /> : <span>-</span>}
              </>
            )}
          </div>
        </div>
        <div className={classnames(styles.orderSummaryRow, styles.orderSummaryRowDark)}>
          <div className={styles.orderSummaryLabel}>Liquidation Price</div>
          <div className={styles.orderSummaryValue}>
            <Money
              value={liquidationPriceDisplay}
              token="USD"
              fallback="-"
              className={classnames({
                [styles.orderSummaryValuePositive]: baseAsset && baseAsset.safe,
                [styles.orderSummaryValueNegative]: baseAsset && !baseAsset.safe,
              })}
            />
            {liquidationPricePost && liquidationPrice && !liquidationPrice.isEqualTo(liquidationPricePost) && (
              <>
                <span className={styles.transitionArrow} />
                <Money
                  value={liquidationPricePostDisplay}
                  token="USD"
                  fallback="-"
                  className={classnames({
                    [styles.orderSummaryValuePositive]: isSafePost,
                    [styles.orderSummaryValueNegative]: !isSafePost,
                  })}
                />
              </>
            )}
          </div>
        </div>
        <div className={classnames(styles.orderSummaryRow, styles.orderSummaryRowDark)}>
          <div className={styles.orderSummaryLabel}>DAI Balance</div>
          <div className={styles.orderSummaryValue}>
            {daiBalance && <Money value={daiBalance} token={'DAI'} fallback="-" />}
            {daiBalancePost && daiBalance && !daiBalance.isEqualTo(daiBalancePost) && (
              <>
                <span className={styles.transitionArrow} />
                {daiBalancePost ? <Money value={daiBalancePost} token={'DAI'} fallback="-" /> : <span>-</span>}
              </>
            )}
          </div>
        </div>

        <div className={classnames(styles.orderSummaryRow, styles.orderSummaryRowDark)}>
          <div className={styles.orderSummaryLabel}>Wallet Balance (Available to deposit)</div>
          <div className={styles.orderSummaryValue}>
            {balances && formatAmount(balances[token], token)} {token}
          </div>
        </div>
      </>
    );
  };

  private Form() {
    return (
      <div>
        {this.AmountGroup(false)}
        {!!this.props.messages && (
          <ErrorMessage messages={this.props.messages.map((msg) => this.messageContent(msg))} />
        )}
      </div>
    );
  }

  private TransactionState() {
    const amount = this.props.amount || new BigNumber(0);
    return (
      <BorderBox className={styles.checklistBox}>
        <div className={styles.checklistLine}>
          <span className={styles.checklistTitle}>{getToken(this.props.token).name} deposit</span>
          <div className={styles.checklistSummary} data-test-id="tx-status">
            <TransactionStateDescription progress={this.props.progress} />
          </div>
        </div>
        <Hr color="dark" className={styles.hrSmallMargin} />
        <div className={styles.checklistLine}>
          <span className={styles.checklistTitle}>Amount</span>
          <Muted className={styles.checklistSummary}>
            {formatAmount(amount, this.props.token)} {this.props.token}
          </Muted>
        </div>
        <Hr color="dark" className={styles.hrSmallMargin} />
        <div className={styles.checklistLine}>
          <span className={styles.checklistTitle}>Gas cost</span>
          <Muted className={styles.checklistSummary}>
            <GasCost
              gasEstimationStatus={this.props.gasEstimationStatus}
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
    const { mta, amount, actionKind, token } = this.props;
    if (mta && mta.state !== MTAccountState.notSetup && amount) {
      this.props.transfer(this.props);
      trackingEvents.transferTokens(actionKind, token);
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

  private getActionName() {
    const { actionKind } = this.props;
    return actionKind === UserActionKind.fund ? 'Deposit' : 'Withdraw';
  }

  private Buttons() {
    const { progress, readyToProceed, token, ilk } = this.props;
    const retry = progress === ProgressStage.fiasco;
    const depositAgain = progress === ProgressStage.done;
    const deposit = !retry && !depositAgain;
    const depositEnabled = readyToProceed && progress === undefined && (token !== 'DAI' || !!ilk);
    const proceedName = `${this.getActionName()} ${token}`;

    return (
      <PanelFooter className={styles.buttons}>
        {deposit && (
          <Button
            size="md"
            className={styles.confirmButton}
            data-test-id={`${this.getActionName().toLowerCase()}-btn`}
            disabled={!depositEnabled}
            block={true}
            color="primary"
            onClick={() => {
              this.transfer();
            }}
          >
            {proceedName}
          </Button>
        )}
        {retry && (
          <Button
            size="md"
            className={styles.confirmButton}
            block={true}
            onClick={() => {
              this.transfer();
            }}
          >
            Retry
          </Button>
        )}
        {depositAgain && (
          <Button size="md" className={styles.confirmButton} block={true} onClick={() => this.props.reset()}>
            {proceedName} again
          </Button>
        )}
        <Button
          size="md"
          className={styles.cancelButton}
          block={true}
          data-test-id="close-modal"
          color="greyOutlined"
          onClick={() => this.close()}
        >
          Cancel
        </Button>
      </PanelFooter>
    );
  }

  private handleSetMax = (value: BigNumber, kind: FormChangeKind.amountFieldChange) => {
    this.props.change({ kind, value });
  };

  private AmountGroup(disabled: boolean) {
    const { token, balances, actionKind } = this.props;

    const maxTotal = balances
      ? actionKind === UserActionKind.fund
        ? balances[token]
        : this.getMaxWithdrawAmount()
      : zero;

    return (
      <InputGroup sizer="md" disabled={disabled}>
        <InputGroupAddon border="right">Amount</InputGroupAddon>
        <BigNumberInput
          ref={(el: any) => (this.amountInput = (el && (ReactDOM.findDOMNode(el) as HTMLElement)) || undefined)}
          type="text"
          mask={createNumberMask({
            allowDecimal: true,
            decimalLimit: getToken(this.props.token).digits,
            prefix: '',
          })}
          onChange={this.amountChange}
          value={(this.props.amount || null) && formatAmount(this.props.amount as BigNumber, this.props.token)}
          placeholder={`Max. ${formatAmount(maxTotal, token)}`}
          guide={true}
          placeholderChar={' '}
          disabled={disabled}
          data-test-id="amount-input"
        />
        <InputGroupAddon className={stylesOrder.setMaxBtnAddon} onClick={() => this.handleSetMaxAmount()}>
          <Button size="sm" type="button" className={stylesOrder.setMaxBtn}>
            Set Max
          </Button>
        </InputGroupAddon>
        <InputGroupAddon className={stylesOrder.inputCurrencyAddon} onClick={this.handleAmountFocus}>
          {token}
        </InputGroupAddon>
      </InputGroup>
    );
  }

  private messageContent(msg: Message) {
    switch (msg.kind) {
      case MessageKind.insufficientAvailableAmount:
        return msg.token === 'DAI'
          ? `Your balance is too low to withdraw that amount`
          : `You don't have enough free collateral to withdraw that amount`;
      case MessageKind.insufficientAmount:
        return `Your balance is too low to deposit that amount`;
      case MessageKind.dustAmount:
        return `Transfer below token limit`;
      case MessageKind.impossibleToPlan:
        return msg.message;
      case MessageKind.minDebt:
        return `Dai debt below ${msg.message} DAI limit`;
      case MessageKind.purchasingPowerEqZero:
        return (
          <div style={{ marginTop: '8px' }}>
            Postfund purchasing power should be greater than zero.
            <br />
            Min amount to deposit is {msg.minDepositAmount.toPrecision(4, 2)} {msg.token}.
          </div>
        );
    }
  }
}

export function MTSimpleOrderBuyPanel({ close }: ModalProps) {
  const state = useObservable(useContext(theAppContext).mtOrderFormLoadable$);

  if (!state) return null;

  const { status, value } = state;

  if (status === 'loaded' && value && value.mta) {
    const formState = value;
    const { mta } = formState;
    const ma = findMarginableAsset(formState.baseToken, mta);

    if (mta && mta.proxy && ma && (ma.balance.gt(zero) || ma.dai.gt(zero))) {
      return (
        <div className={stylesOrder.buyFormWrapper}>
          <MtSimpleOrderFormBody {...{ ...state, ...formState, close }} />
          <Button
            size="md"
            className={styles.cancelButton}
            data-test-id="close-modal"
            block={true}
            color="greyOutlined"
            onClick={() => close()}
          >
            Cancel
          </Button>
        </div>
      );
    }
  }

  return (
    <div className={stylesOrder.orderPanel}>
      <PanelHeader>Manage Your Position</PanelHeader>
      <LoadingIndicator size="lg" />
    </div>
  );
}
