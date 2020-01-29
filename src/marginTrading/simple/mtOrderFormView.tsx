import { BigNumber } from 'bignumber.js';
import * as classnames from 'classnames';
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { createNumberMask } from 'text-mask-addons/dist/textMaskAddons';
import * as formStyles from '../../exchange/offerMake/OfferMakeForm.scss';
import { OfferType } from '../../exchange/orderbook/orderbook';
import { ApproximateInputValue } from '../../utils/Approximate';
import { BigNumberInput, lessThanOrEqual } from '../../utils/bigNumberInput/BigNumberInput';
import { FormChangeKind } from '../../utils/form';
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
import { PanelBody, PanelFooter, PanelHeader } from '../../utils/panel/Panel';
import { Muted } from '../../utils/text/Text';
import { minusOne, zero } from '../../utils/zero';
import { findMarginableAsset, MTAccountState } from '../state/mtAccount';
import { Message, MessageKind, MTSimpleFormState, ViewKind } from './mtOrderForm';
import * as styles from './mtOrderFormView.scss';

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

// const dimensions = {
//   height: '605px',
//   minWidth: '454px',
//   width: 'auto',
// };

export class MtSimpleOrderFormBody extends React.Component<MTSimpleFormState> {

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

  public handleSetMax = () => {
    this.props.change({
      kind: FormChangeKind.setMaxChange,
    });
  }

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
    this.props.submit(this.props);
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

  private switchToInstantOrderForm = () => {
    this.props.change({ kind: FormChangeKind.viewChange, value: ViewKind.instantTradeForm });
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
      {this.accountBalance()}
      {this.liquidationPrice()}
      {this.price()}
      {this.slippageLimit()}
    </div>);
  }

  private instantOrderForm = () => {
    return (
      <>
        <form
          onSubmit={this.handleProceed}
        >
          {this.renderAccountInfo()}
          {this.feesBox()}
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
      <div className={classnames(styles.orderSummaryRow, styles.orderSummaryRowDark)}>
        <div className={styles.orderSummaryLabel}>
          Liq. price
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
    const price = this.props.price || new BigNumber(0);
    return (
      <div className={classnames(styles.orderSummaryRow, styles.orderSummaryRowDark)}>
        <div className={styles.orderSummaryLabel}>
          Price
        </div>
        <div className={styles.orderSummaryValue}>
          {
            this.props.priceImpact && <>
              <FormatPercent
                value={this.props.priceImpact}
                fallback="-"
                multiply={true}
              /> Impact &nbsp;&nbsp;&nbsp;&nbsp;
            </>
          }
          <Money
            value={price}
            token={this.props.quoteToken}
          />
        </div>
      </div>
    );
  }

  private slippageLimit() {
    const { slippageLimit } = this.props;
    return (
      <div className={classnames(styles.orderSummaryRow, styles.orderSummaryRowDark)}>
        <div className={styles.orderSummaryLabel}>
          Slippage limit
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

  private feesBox() {
    const { leverage, leveragePost, baseToken, mta } = this.props;
    const baseTokenAsset = findMarginableAsset(baseToken, mta);

    if (!baseTokenAsset) {
      return;
    }

    const { liquidationPenalty } = baseTokenAsset;
    const leverageDisplay = leverage
                            ? leverage
                            : leveragePost
                              ? zero : minusOne;
    return (
      <div className={styles.InfoRow}>
        <div className={styles.InfoBox}>
          <div className={styles.InfoRowLabel}>Leverage</div>
          <div>
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
        <div className={styles.InfoBox}>
          <div className={styles.InfoRowLabel}>Liq. Penalty</div>
          <div>
            <FormatPercent
              value={liquidationPenalty}
              fallback="-"
              multiply={false}
            />
          </div>
        </div>
        <div className={styles.InfoBox}>
          <div className={styles.InfoRowLabel}>Interest Rate</div>
          <div>
            {
              this.props.fee ? <FormatPercent
                value={this.props.fee}
                fallback="-"
                multiply={false}
              /> : <span>-</span>
            }
          </div>
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

    return (
      <>
        <div className={classnames(styles.orderSummaryRow, styles.orderSummaryRowDark)}>
          <div className={styles.orderSummaryLabel}>
            Balance
          </div>
          <div className={styles.orderSummaryValue}>
            { baseTokenAsset && baseTokenAsset.balance ?
              <Money
                value={baseTokenAsset.balance}
                token={this.props.baseToken}
                fallback="-"
              /> : <span>-</span>
            }
            {
              this.props.balancePost &&
              <>
                <span className={styles.transitionArrow} />
                { this.props.balancePost ?
                  <Money
                    value={this.props.balancePost}
                    token={this.props.baseToken}
                    fallback="-"
                  /> : <span>-</span>
                }
              </>
            }
          </div>
        </div>
        <div className={classnames(styles.orderSummaryRow, styles.orderSummaryRowDark)}>
          <div className={styles.orderSummaryLabel}>
            DAI Balance
          </div>
          <div className={styles.orderSummaryValue}>
            { baseTokenAsset && baseTokenAsset.debt.gt(zero) ?
              <Money
                value={baseTokenAsset.debt.times(minusOne)}
                token={this.props.quoteToken}
                fallback="-"
              /> : baseTokenAsset && baseTokenAsset.dai ?
                <Money
                  value={baseTokenAsset.dai}
                  token={this.props.quoteToken}
                  fallback="-"
                /> : <span>-</span>
            }
            {
              this.props.daiBalancePost &&
              <>
                <span className={styles.transitionArrow} />
                { this.props.daiBalancePost ?
                  <Money
                    value={this.props.daiBalancePost}
                    token={this.props.quoteToken}
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
    const { total, quoteToken } = this.props;
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
              placeholderChar={' '}
              className={styles.input}
              // disabled={this.props.stage === FormStage.waitingForAllocation}
              // disabled={ true }
            />
          </ApproximateInputValue>
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
    const { amount, baseToken } = this.props;
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
            placeholderChar={' '}
            className={styles.input}
            // disabled={this.props.progress === FormStage.waitingForAllocation}
          />
        </ApproximateInputValue>
        <InputGroupAddon className={styles.inputCurrencyAddon} onClick={ this.handleAmountFocus }>
          {baseToken}
        </InputGroupAddon>

      </InputGroup>
    );
  }
}

export class MtSimpleOrderFormView extends React.Component<MTSimpleFormState> {

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
              ? <MtSimpleOrderFormBody {...this.props} />
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

  private switchToSettings = () => {
    this.props.change({ kind: FormChangeKind.viewChange, value: ViewKind.settings });
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
        <SettingsIcon className={styles.settingsIcon}
                      onClick={this.switchToSettings}
        />
        <ButtonGroup>
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
      return `Order below ${msg.message} limit.`;
    case MessageKind.unsellable:
      return `Your position is unsellable. ${msg.message}`;
  }
}
