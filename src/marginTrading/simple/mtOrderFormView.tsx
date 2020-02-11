import { BigNumber } from 'bignumber.js';
import * as classnames from 'classnames';
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { createNumberMask } from 'text-mask-addons/dist/textMaskAddons';
import * as formStyles from '../../exchange/offerMake/OfferMakeForm.scss';
import { OfferType } from '../../exchange/orderbook/orderbook';
import { ApproximateInputValue } from '../../utils/Approximate';
import { BigNumberInput, lessThanOrEqual } from '../../utils/bigNumberInput/BigNumberInput';
import { connect } from '../../utils/connect';
import { FormChangeKind, ProgressStage } from '../../utils/form';
import {
  formatAmount,
  formatPrecision,
  formatPrice
} from '../../utils/formatters/format';
import { FormatPercent, Money } from '../../utils/formatters/Formatters';
import { Button, ButtonGroup } from '../../utils/forms/Buttons';
import { ErrorMessage } from '../../utils/forms/ErrorMessage';
import { InputGroup, InputGroupAddon } from '../../utils/forms/InputGroup';
import { Radio } from '../../utils/forms/Radio';
import { SettingsIcon } from '../../utils/icons/Icons';
import { Hr } from '../../utils/layout/LayoutHelpers';
import { LoggedOut } from '../../utils/loadingIndicator/LoggedOut';
import { ModalOpenerProps, ModalProps } from '../../utils/modal';
import { PanelBody, PanelFooter, PanelHeader } from '../../utils/panel/Panel';
import { Muted } from '../../utils/text/Text';
import { minusOne, zero } from '../../utils/zero';
import {
  findMarginableAsset,
  MarginableAsset,
  MTAccountState,
  UserActionKind
} from '../state/mtAccount';
import { MTTransferFormState } from '../transfer/mtTransferForm';
import { MtTransferFormView } from '../transfer/mtTransferFormView';
import { Message, MessageKind, MTSimpleFormState, ViewKind } from './mtOrderForm';
import * as styles from './mtOrderFormView.scss';
import { MTSimpleOrderPanelProps } from './mtOrderPanel';

// const DevInfos = ({ value }: { value: MTSimpleFormState }) => {
//   //  assetKind: AssetKind.marginable;
//   // urnBalance: BigNumber;
//   // debt: BigNumber;
//   // referencePrice: BigNumber;
//   // minCollRatio: BigNumber;
//   // safeCollRatio: BigNumber;
//   // fee: BigNumber;
//
//   let balance = null;
//   let debt = null;
//   let cash = null;
//   let referencePrice = null;
//   let leverage = null;
//   let urnBalance = null;
//
//   if (value.mta && value.mta.state === MTAccountState.setup) {
//     const ma = findMarginableAsset(value.baseToken, value.mta);
//     balance = ma!.balance;
//     debt = ma!.debt;
//     cash = ma!.dai;
//     urnBalance = ma!.urnBalance;
//     referencePrice = ma!.referencePrice;
//     leverage = balance.times(referencePrice).div(balance.times(referencePrice).minus(debt));
//   }
//   return (<div style={{
//     position: 'fixed',
//     top: '1em',
//     right: '1em',
//     background: 'rgba(20,20,20, 0.6)',
//     padding: '5px',
//     zIndex: 1000
//   }}>
//       <h3>Internals:</h3>
//       progress:
//       {value.progress}
//       <br/>
//       total:
//       {value.total && value.total.toString()}
//       <br/>
//       price:
//       {value.price && value.price.toString()}
//       <br/>
//       DAI:
//       {cash && cash.toString()}
//       <br/>
//       realPurchasingPower:
//       {value.realPurchasingPower && value.realPurchasingPower.toString()}
//       <br/>
//       collRatio:
//       {value.collRatio && value.collRatio.toFormat(2)}
//       <br/>
//       collRatioPost:
//       {value.collRatioPost && value.collRatioPost.toFormat(2)}
//       <br/>
//       liquidationPrice:
//       {value.liquidationPrice && value.liquidationPrice.toFormat(2)}
//       <br/>
//       liquidationPricePost:
//       {value.liquidationPricePost && value.liquidationPricePost.toFormat(2)}
//       <br/>
//       MA:
//       <br/>
//       <>
//         Balance:
//         {balance && balance.toString()}
//         <br/>
//         Debt:
//         {debt && debt.toString()}
//         <br/>
//         urnBalance:
//         {urnBalance && urnBalance.toString()}
//         <br/>
//         referencePrice:
//         {referencePrice && referencePrice.toString()}
//         <br/>
//         LEVERAGE:
//         {leverage && leverage.toString()}
//         <br/>
//       </> : null
//
//       <br/>
//       Plan:
//       {value.plan &&
//       <pre>{JSON.stringify(value.plan, null, 4)}</pre>}
//       <br/>
//       Messages:
//       {value.messages &&
//       <pre>{JSON.stringify(value.messages, null, 4)}</pre>}
//     </div>
//   );
// };

enum depositMessageType {
  onboarding = 'onboarding',
  collRatioUnsafe = 'collRatioUnsafe',
}

export class MtSimpleOrderFormBody extends React.Component<MTSimpleFormState & {close?: () => void}> {

  private amountInput?: HTMLElement;
  private priceInput?: HTMLElement;
  private slippageLimitInput?: HTMLElement;

  public handleKindChange(kind: OfferType) {
    this.props.change({
      kind: FormChangeKind.kindChange,
      newKind: kind,
    });
  }

  public handleTotalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/,/g, '');
    this.props.change({
      kind: FormChangeKind.totalFieldChange,
      value: value === '' ? undefined : new BigNumber(value)
    });
  }

  public handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/,/g, '');
    this.props.change({
      kind: FormChangeKind.amountFieldChange,
      value: value === '' ? undefined : new BigNumber(value)
    });
  }

  public handleSlippageLimitChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = new BigNumber(e.target.value.replace(/,/g, ''));
    if (!value.isNaN()) {
      this.props.change({
        kind: FormChangeKind.slippageLimitChange,
        value: value.div(100),
      });
    }
  }

  public handleSetMaxTotal = () =>
    this.handleSetMax(this.props.maxTotal, FormChangeKind.totalFieldChange)

  public handleSetMaxAmount = () =>
    this.handleSetMax(this.props.maxAmount, FormChangeKind.amountFieldChange)

  public handleProceed = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (
      !this.props.mta ||
      this.props.mta.state === MTAccountState.notSetup ||
      !this.props.readyToProceed ||
      !this.props.amount ||
      !this.props.price ||
      !this.props.total
    ) {
      return;
    }
    const submitCall$ = this.props.submit(this.props);
    if (this.props.close) {
      submitCall$.subscribe((next: any) => {
        if (next.progress === ProgressStage.waitingForConfirmation) {
          if (this.props.close) {
            this.props.close();
          }

        }
      });
    }
  }

  public handleAmountFocus = () => {
    if (this.amountInput) {
      this.amountInput.focus();
    }
  }

  public handlePriceFocus = () => {
    if (this.priceInput) {
      this.priceInput.focus();
    }
  }

  public handleSlippageLimitFocus = () => {
    if (this.slippageLimitInput) {
      this.slippageLimitInput.focus();
    }
  }

  public render() {
    return (<div>
      {
        this.props.view === ViewKind.instantTradeForm
          ? this.instantOrderForm()
          : this.advancedSettings()
      }
    </div>);
  }

  private handleSetMax = (
    value: BigNumber,
    kind: FormChangeKind.amountFieldChange | FormChangeKind.totalFieldChange
  ) => {
    this.props.change({ kind, value });
  }

  private switchToInstantOrderForm = () => {
    this.props.change({ kind: FormChangeKind.viewChange, value: ViewKind.instantTradeForm });
  }

  private switchToSettings = () => {
    this.props.change({ kind: FormChangeKind.viewChange, value: ViewKind.settings });
  }

  private renderAccountInfo = () => {
    const accountNotConnected = !this.props.account;
    const accountNotSetup = this.props.mta && this.props.mta.state === MTAccountState.notSetup;

    if (accountNotConnected) {
      return <div className={styles.notSetupBorder}><LoggedOut view="Balances"/></div>;
    }

    if (accountNotSetup) {
      return <div className={styles.notSetupBorder}>
        <Muted>
          Deploy your Proxy and enable {this.props.baseToken}
        </Muted>
      </div>;
    }

    return (<div className={styles.summaryBox}>
      {this.purchasingPower2()}
      {this.slippageLimit()}
      {this.stabilityFee()}
      {this.accountBalance()}
      {this.leverage()}
      {this.price()}
      {this.liquidationPrice()}
    </div>);
  }

  private instantOrderForm = () => {
    return (
      <>
        <form
          onSubmit={this.handleProceed}
        >
          {this.renderAccountInfo()}
          <Hr color="dark" className={styles.hrMargin}/>
          {this.amount()}
          {this.total()}
          {this.proceedButton()}
        </form>
      </>
    );
  }

  private advancedSettings = () => (
    <>
      <div className={formStyles.pickerOrderType}>
        <Radio
          dataTestId="fillOrKill"
          name="orderType"
          value="direct"
          defaultChecked={true}
        >
          Average price fill or kill order type
        </Radio>
        <Muted className={formStyles.pickerDescription}>
          The order is executed in its entirety such that the average fill price is
          the limit price or better, otherwise it is canceled
        </Muted>
        { this.slippageLimitForm() }
      </div>
      <Button
        className={formStyles.confirmButton}
        type="submit"
        onClick={this.switchToInstantOrderForm}
      >
        Done
      </Button>
    </>
  )

  private liquidationPrice() {
    const liquidationPrice = this.props.liquidationPrice ?
      this.props.liquidationPrice : zero;
    const liquidationPricePost = this.props.liquidationPricePost ?
      this.props.liquidationPricePost : zero;

    const baseTokenAsset = findMarginableAsset(this.props.baseToken, this.props.mta);
    return (
      <div className={classnames(
        styles.orderSummaryRow,
        styles.orderSummaryRowDark,
        this.props.liquidationPricePost ? styles.visible : styles.hidden
      )}>
        <div className={styles.orderSummaryLabel}>
          Liquidation price
        </div>
        <div className={classnames(styles.orderSummaryValue, styles.orderSummaryValuePositive)}>
          {
            liquidationPrice.gt(zero) ?
              <Money
                value={liquidationPrice}
                token="USD"
                fallback="-"
                className={
                  classnames({
                    [styles.orderSummaryValuePositive]: baseTokenAsset && baseTokenAsset.safe,
                    [styles.orderSummaryValueNegative]: baseTokenAsset && !baseTokenAsset.safe,
                  })
                }
              /> : <span>-</span>
          }
          {
            this.props.liquidationPricePost &&
            !liquidationPrice.isEqualTo(liquidationPricePost) &&
            <>
              <span className={styles.transitionArrow} />
              {
                liquidationPricePost.gt(zero) ?
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
                  /> : <span>-</span>
              }
            </>
          }
        </div>
      </div>
    );
  }

  private price() {
    const { price, priceImpact, quoteToken, messages } = this.props;
    return (
      <div className={classnames(
        styles.orderSummaryRow,
        styles.orderSummaryRowDark,
        price && priceImpact && messages.length === 0 ? styles.visible : styles.hidden
      )}>
        <div className={styles.orderSummaryLabel}>
          Price (and Impact)
        </div>
        <div className={styles.orderSummaryValue}>
          <Money
            value={price || zero}
            token={quoteToken}
          />
          {' '}
          {
            priceImpact && <>
              (<FormatPercent
                value={priceImpact}
                fallback="-"
                multiply={true}
              /> Impact)
            </>
          }
        </div>
      </div>
    );
  }

  private slippageLimit() {
    const { slippageLimit } = this.props;
    return (
      <div className={classnames(styles.orderSummaryRow, styles.orderSummaryRowDark)}>
        <div className={styles.orderSummaryLabel}>
          <span>Slippage limit</span>
          <SettingsIcon className={styles.settingsIcon}
                        onClick={this.switchToSettings}
          />
        </div>
        <div className={styles.orderSummaryValue}>
          {
            slippageLimit &&
            <FormatPercent
              value={
                slippageLimit
              }
              fallback="-"
              precision={2}
              multiply={true}
            />
          }
        </div>
      </div>
    );
  }

  private slippageLimitForm() {
    const slippageLimit = this.props.slippageLimit
      ? this.props.slippageLimit.times(100).valueOf()
      : '';
    return (
      <InputGroup
        sizer="lg"
        style={ { marginTop: '24px' } }
      >
        <InputGroupAddon className={formStyles.inputHeader}>
          Slippage limit
        </InputGroupAddon>
        <div className={formStyles.inputTail}>
          <BigNumberInput
            ref={ (el: any) =>
              this.slippageLimitInput = (el && ReactDOM.findDOMNode(el) as HTMLElement) || undefined
            }
            data-test-id="slippage-limit"
            type="text"
            mask={createNumberMask({
              allowDecimal: true,
              precision: 2,
              prefix: ''
            })}
            pipe={
              lessThanOrEqual(new BigNumber(100))
            }
            onChange={this.handleSlippageLimitChange}
            value={ slippageLimit }
            guide={true}
            placeholder={ slippageLimit }
            className={styles.input}
          />
          <InputGroupAddon className={formStyles.inputPercentAddon}
                           onClick={this.handleSlippageLimitFocus}
          >
            %
          </InputGroupAddon>
        </div>
      </InputGroup>
    );
  }

  private stabilityFee() {
    const {  baseToken, mta } = this.props;
    const baseTokenAsset = findMarginableAsset(baseToken, mta);

    return (
      <div className={classnames(styles.orderSummaryRow, styles.orderSummaryRowDark)}>
        <div className={styles.orderSummaryLabel}>
          Stability Fee (Variable)
        </div>
        <div className={styles.orderSummaryValue}>
          {
            baseTokenAsset?.fee ? <FormatPercent
              value={baseTokenAsset?.fee}
              fallback="-"
              multiply={false}
              precision={2}
            /> : <span>-</span>
          }
        </div>
      </div>
    );
  }

  private leverage() {
    const { leverage, leveragePost } = this.props;

    const leverageDisplay = leverage
      ? leverage
      : leveragePost
        ? zero : minusOne;
    return (
      <div className={classnames(
        styles.orderSummaryRow,
        styles.orderSummaryRowDark,
        leveragePost ? styles.visible : styles.hidden
      )}>
        <div className={styles.orderSummaryLabel}>
          Leverage
        </div>
        <div className={styles.orderSummaryValue}>
          {
            leverageDisplay.gte(zero) ?
              <>{ formatPrecision(leverageDisplay, 1) }x</>
              : <span>-</span>
          }
          { this.props.leveragePost &&
          <>
            <span className={styles.transitionArrow}/>
            { this.props.leveragePost ?
              <>
                {formatPrecision(this.props.leveragePost, 1)}x
              </> : <span>-</span>
            }
          </>
          }
        </div>
      </div>
    );
  }

  private purchasingPower2() {
    return (
      this.props.kind === OfferType.buy ?
        <div className={classnames(styles.orderSummaryRow, styles.orderSummaryRowDark)}>
          <div className={styles.orderSummaryLabel}>
            Purch. power
          </div>
          <div className={styles.orderSummaryValue}>
            {
              this.props.realPurchasingPower &&
              <>
                {this.props.dustWarning && <span title="Zero due to dust limit">! </span>}
                {formatPrecision(this.props.realPurchasingPower, 2)}
              </>
            }
            { this.props.realPurchasingPowerPost &&
            <>
              <span className={styles.transitionArrow} />
              { this.props.realPurchasingPowerPost ?
                <>
                  {formatPrecision(this.props.realPurchasingPowerPost, 2)}
                </>
                : <span>-</span>
              }
            </>
            }
            <>
              {
                (this.props.realPurchasingPower || this.props.realPurchasingPowerPost) &&
                <> { this.props.quoteToken } </>
              }</>
          </div>
        </div>
        : null
    );
  }

  private accountBalance() {
    const baseTokenAsset = findMarginableAsset(this.props.baseToken, this.props.mta);
    const { balancePost, daiBalancePost, baseToken, quoteToken } = this.props;

    return (
      <>
        <div className={classnames(
          styles.orderSummaryRow,
          styles.orderSummaryRowDark,
          balancePost ? styles.visible : styles.hidden)}>
          <div className={styles.orderSummaryLabel}>
            Balance
          </div>
          <div className={styles.orderSummaryValue}>
            { baseTokenAsset && baseTokenAsset.balance ?
              <Money
                value={baseTokenAsset.balance}
                token={baseToken}
                fallback="-"
              /> : <span>-</span>
            }
            {
              balancePost &&
              <>
                <span className={styles.transitionArrow} />
                { balancePost ?
                  <Money
                    value={balancePost}
                    token={baseToken}
                    fallback="-"
                  /> : <span>-</span>
                }
              </>
            }
          </div>
        </div>
        <div className={classnames(
          styles.orderSummaryRow,
          styles.orderSummaryRowDark,
          daiBalancePost ? styles.visible : styles.hidden
        )}>
          <div className={styles.orderSummaryLabel}>
            DAI Balance
          </div>
          <div className={styles.orderSummaryValue}>
            { baseTokenAsset && baseTokenAsset.debt.gt(zero) ?
              <Money
                value={baseTokenAsset.debt.times(minusOne)}
                token={quoteToken}
                fallback="-"
              /> : baseTokenAsset && baseTokenAsset.dai ?
                <Money
                  value={baseTokenAsset.dai}
                  token={quoteToken}
                  fallback="-"
                /> : <span>-</span>
            }
            {
              daiBalancePost &&
              <>
                <span className={styles.transitionArrow} />
                { daiBalancePost ?
                  <Money
                    value={daiBalancePost}
                    token={quoteToken}
                    fallback="-"
                  /> : <span>-</span>
                }
              </>
            }
          </div>
        </div>
      </>
    );
  }

  private amount() {
    return (
      <div>
        { this.amountGroup() }
        <Error field="amount" messages={this.props.messages} />
      </div>
    );
  }

  private total() {
    const { total, quoteToken, maxTotal } = this.props;

    return (
      <div>
        <InputGroup>
          <InputGroupAddon border="right" className={styles.inputHeader}>Total</InputGroupAddon>
          <ApproximateInputValue shouldApproximate={
            !!total
            && !total.eq(new BigNumber(formatPrice(total, quoteToken)))
          }>
            <BigNumberInput
              ref={ (el: any) =>
                this.priceInput = (el && ReactDOM.findDOMNode(el) as HTMLElement) || undefined
              }
              type="text"
              mask={createNumberMask({
                allowDecimal: true,
                decimalLimit: 5,
                prefix: ''
              })}
              onChange={this.handleTotalChange}
              value={
                (total || null) &&
                formatPrice(total as BigNumber, quoteToken)
              }
              guide={true}
              placeholder={
                `Max. ${formatAmount(maxTotal, quoteToken)}`
              }
              className={styles.input}
              // disabled={this.props.stage === FormStage.waitingForAllocation}
              // disabled={ true }
            />
          </ApproximateInputValue>
          <InputGroupAddon  className={styles.setMaxBtnAddon}
                            onClick={
                              this.handleSetMaxTotal
                            }>
            <Button size="sm" type="button" className={styles.setMaxBtn}>
              Set Max
            </Button>
          </InputGroupAddon>
          <InputGroupAddon className={styles.inputCurrencyAddon} onClick={ this.handlePriceFocus }>
            {quoteToken}
          </InputGroupAddon>
        </InputGroup>
        <Error field="total" messages={this.props.messages} />
      </div>
    );
  }

  private proceedButton() {
    const label = this.props.kind === 'buy' ? 'Place Buy Order' : 'Place Sell Order';
    return (
      <Button
        className={styles.confirmButton}
        type="submit"
        value="submit"
        color={ this.props.kind === OfferType.buy ? 'primary' : 'danger' }
        disabled={ !this.props.readyToProceed || !!this.props.progress }
      >
        {label}
      </Button>
    );
  }

  private amountGroup() {
    const { amount, baseToken, maxAmount } = this.props;

    return (
      <InputGroup>
        <InputGroupAddon border="right" className={styles.inputHeader}>Amount</InputGroupAddon>
        <ApproximateInputValue shouldApproximate={
          !!amount
          && !amount.eq(new BigNumber(formatAmount(amount, baseToken)))
        }>
          <BigNumberInput
            ref={(el: any) =>
              this.amountInput = (el && ReactDOM.findDOMNode(el) as HTMLElement) || undefined
            }
            type="text"
            mask={createNumberMask({
              allowDecimal: true,
              decimalLimit: 5,
              prefix: ''
            })}
            onChange={this.handleAmountChange}
            value={
              (amount || null) &&
              formatAmount(amount as BigNumber, baseToken)
            }
            guide={true}
            placeholder={
              `Max. ${formatAmount(maxAmount, baseToken)}`
            }
            className={styles.input}
            // disabled={this.props.progress === FormStage.waitingForAllocation}
          />
        </ApproximateInputValue>
        <InputGroupAddon  className={styles.setMaxBtnAddon}
                          onClick={this.handleSetMaxAmount}>
          <Button size="sm" type="button" className={styles.setMaxBtn}>
            Set Max
          </Button>
        </InputGroupAddon>
        <InputGroupAddon className={styles.inputCurrencyAddon} onClick={ this.handleAmountFocus }>
          {baseToken}
        </InputGroupAddon>

      </InputGroup>
    );
  }
}

export class MtSimpleOrderFormView extends React.Component<
  MTSimpleFormState & MTSimpleOrderPanelProps & ModalOpenerProps> {

  private slippageLimitInput?: HTMLElement;

  public handleKindChange(kind: OfferType) {
    this.props.change({
      kind: FormChangeKind.kindChange,
      newKind: kind,
    });
  }

  public handleSlippageLimitChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = new BigNumber(e.target.value.replace(/,/g, ''));
    if (!value.isNaN()) {
      this.props.change({
        kind: FormChangeKind.slippageLimitChange,
        value: value.div(100),
      });
    }
  }

  public handleSlippageLimitFocus = () => {
    if (this.slippageLimitInput) {
      this.slippageLimitInput.focus();
    }
  }

  public CallForDeposit(messageType: depositMessageType, ma?: MarginableAsset) {
    const { baseToken } = this.props;
    const transferWithOnboarding = messageType === depositMessageType.onboarding;
    return (
      <div className={styles.onboardingPanel}>
        {
          messageType === depositMessageType.onboarding &&
          <>
            <h3>Deposit into Leverage Account</h3>
            <div className={styles.onboardingParagraph}>
              Before opening a new position, deposit WETH<br/>
              or DAI into your Leverage Trading Account
            </div>
          </>
        }
        {
          messageType === depositMessageType.collRatioUnsafe &&
          <>
            <div className={styles.onboardingParagraph}>
              <div className={styles.warningMessage}>
                Warning - Your Position is currently too close to the Liquidation Price to sell
              </div>
              <br/>
              <br/>

              In order to save your Position, you are required to<br/>
              pay off some debt by depositing more DAI or {baseToken}<br/><br/>
              Once you have deposited more DAI or {baseToken}, you <br/>
              will be able to sell the rest of your Position.
            </div>
          </>
        }
        <Button
          size="md"
          color="primary"
          disabled={!ma}
          onClick={
            () => this.transfer(UserActionKind.fund, 'DAI', transferWithOnboarding, ma!.name)
          }
        >Deposit DAI</Button>
        <br/>
        <Button
          size="md"
          color="primary"
          disabled={!ma}
          onClick={
            () => this.transfer(UserActionKind.fund, ma!.name, transferWithOnboarding, ma!.name)
          }
        >Deposit {ma && ma.name}</Button>
      </div>
    );
  }

  public transfer(
    actionKind: UserActionKind, token: string, withOnboarding: boolean, ilk?: string
  ) {
    const fundForm$ = this.props.createMTFundForm$({
      actionKind, token, ilk, withOnboarding
    });
    const MTFundFormViewRxTx =
      connect<MTTransferFormState, ModalProps>(
        MtTransferFormView,
        fundForm$
      );
    this.props.open(MTFundFormViewRxTx);
  }

  public MainContent() {
    const { mta, baseToken, isSafeCollRatio } = this.props;
    const ma = findMarginableAsset(baseToken, mta);

    if (!isSafeCollRatio) {
      return this.CallForDeposit(depositMessageType.collRatioUnsafe, ma);
    }

    const hasHistoryEvents = ma && ma.rawHistory.length > 0;

    if (hasHistoryEvents) {
      return <MtSimpleOrderFormBody {...this.props} />;
    }

    return this.CallForDeposit(depositMessageType.onboarding, ma);
  }

  public render() {
    return (
      <>
        <PanelHeader>
          {
            this.props.view === ViewKind.instantTradeForm ?
              <>
                Manage your Leverage
                {this.headerButtons()}
              </>
              : 'Advanced Settings'
          }
        </PanelHeader>
        <PanelBody style={{ minWidth: '455px' }}>
          {
            this.props.view === ViewKind.instantTradeForm
              ? this.MainContent()
              : this.advancedSettings()
          }
        </PanelBody>
        {
          this.props.view === ViewKind.settings &&
          <PanelFooter className={styles.settingsFooter}>
            <Button
              className={formStyles.confirmButton}
              type="submit"
              onClick={this.switchToInstantOrderForm}
            >
              Done
            </Button>
          </PanelFooter>
        }
      </>);
  }

  private switchToInstantOrderForm = () => {
    this.props.change({ kind: FormChangeKind.viewChange, value: ViewKind.instantTradeForm });
  }

  private advancedSettings = () => (
    <>
      <div className={formStyles.pickerOrderType}>
        <Radio
          dataTestId="fillOrKill"
          name="orderType"
          value="direct"
          defaultChecked={true}
        >
          Average price fill or kill order type
        </Radio>
        <Muted className={formStyles.pickerDescription}>
          The order is executed in its entirety such that the average fill price is
          the limit price or better, otherwise it is canceled
        </Muted>
        { this.slippageLimitForm() }
      </div>
    </>
  )

  private headerButtons()   {
    return (
      <>
        <ButtonGroup style={{ marginLeft: 'auto' }}>
          <Button
            data-test-id="new-buy-order"
            className={styles.btn}
            onClick={() => this.handleKindChange(OfferType.buy)}
            color={this.props.kind === OfferType.buy ? 'primary' : 'greyOutlined'}
            size="sm"
          >Buy</Button>
          <Button
            data-test-id="new-sell-order"
            className={styles.btn}
            onClick={() => this.handleKindChange(OfferType.sell)}
            color={this.props.kind === OfferType.sell ? 'danger' : 'greyOutlined'}
            size="sm"
          >Sell</Button>
        </ButtonGroup>
      </>
    );
  }

  private slippageLimitForm() {
    const slippageLimit = this.props.slippageLimit
      ? this.props.slippageLimit.times(100).valueOf()
      : '';
    return (
      <InputGroup
        sizer="lg"
        style={ { marginTop: '24px' } }
      >
        <InputGroupAddon className={formStyles.inputHeader}>
          Slippage limit
        </InputGroupAddon>
        <div className={formStyles.inputTail}>
          <BigNumberInput
            ref={ (el: any) =>
              this.slippageLimitInput = (el && ReactDOM.findDOMNode(el) as HTMLElement) || undefined
            }
            data-test-id="slippage-limit"
            type="text"
            mask={createNumberMask({
              allowDecimal: true,
              precision: 2,
              prefix: ''
            })}
            pipe={
              lessThanOrEqual(new BigNumber(100))
            }
            onChange={this.handleSlippageLimitChange}
            value={ slippageLimit }
            guide={true}
            placeholder={ slippageLimit }
            className={styles.input}
          />
          <InputGroupAddon className={formStyles.inputPercentAddon}
                           onClick={this.handleSlippageLimitFocus}
          >
            %
          </InputGroupAddon>
        </div>
      </InputGroup>
    );
  }
}

const Error = ({ field, messages } : { field: string, messages?: Message[] }) => {
  const myMsg = (messages || [])
    .filter((message: Message) => message.field === field)
    .sort((m1, m2) => m2.priority - m1.priority)
    .map(msg => messageContent(msg));
  return (
    <ErrorMessage messages={myMsg} style={{ height: '28px' }}/>
  );
};

function messageContent(msg: Message) {
  switch (msg.kind) {
    case MessageKind.insufficientAmount:
      return  `Your ${msg.token} balance is too low to fund this order`;
    case MessageKind.dustAmount:
      return `Order below ${msg.amount} ${msg.token} limit`;
    case MessageKind.incredibleAmount:
      return `Your order exceeds max amount for ${msg.token} token`;
    case MessageKind.dustTotal:
      return `Your order must be greater than 0`;
    case MessageKind.impossibleToPlan:
      return `Can't plan operation: ${msg.message}`;
    case MessageKind.impossibleCalculateTotal:
      return `Can't calculate: ${msg.message}. Type smaller amount`;
    case MessageKind.minDebt:
      return `Dai debt below ${msg.message} limit`;
    case MessageKind.unsellable:
      return `Your position is unsellable. ${msg.message}`;
  }
}
