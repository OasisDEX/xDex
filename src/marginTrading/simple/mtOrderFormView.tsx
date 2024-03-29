/*
 * Copyright (C) 2020 Maker Ecosystem Growth Holdings, INC.
 */

import { BigNumber } from 'bignumber.js';
import * as classnames from 'classnames';
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { ModalOpener } from 'src/utils/modalHook';
import { useObservable } from 'src/utils/observableHook';
import { createNumberMask } from 'text-mask-addons/dist/textMaskAddons';
import { trackingEvents } from '../../analytics/analytics';
import { getToken } from '../../blockchain/config';
import * as formStyles from '../../exchange/offerMake/OfferMakeForm.scss';
import { OfferType } from '../../exchange/orderbook/orderbook';
import { ApproximateInputValue } from '../../utils/Approximate';
import { BigNumberInput, lessThanOrEqual } from '../../utils/bigNumberInput/BigNumberInput';
import { FormChangeKind, ProgressStage } from '../../utils/form';
import { formatAmount, formatPrecision, formatPrice } from '../../utils/formatters/format';
import { CryptoMoney, FormatPercent, Money } from '../../utils/formatters/Formatters';
import { Button, ButtonGroup } from '../../utils/forms/Buttons';
import { Checkbox } from '../../utils/forms/Checkbox';
import { ErrorMessage } from '../../utils/forms/ErrorMessage';
import { InputGroup, InputGroupAddon } from '../../utils/forms/InputGroup';
import { Radio } from '../../utils/forms/Radio';
import { SettingsIcon } from '../../utils/icons/Icons';
import { Hr } from '../../utils/layout/LayoutHelpers';
import { LoggedOut } from '../../utils/loadingIndicator/LoggedOut';
import { PanelBody, PanelFooter, PanelHeader } from '../../utils/panel/Panel';
import { Muted } from '../../utils/text/Text';
import { WarningTooltip } from '../../utils/tooltip/Tooltip';
import { minusOne, zero } from '../../utils/zero';
import { findMarginableAsset, MarginableAsset, MTAccountState, UserActionKind } from '../state/mtAccount';
import { MtTransferFormView } from '../transfer/mtTransferFormView';
import {
  Message,
  MessageKind,
  MTSimpleFormState,
  OrderFormMessage,
  OrderFormMessageKind,
  ViewKind,
} from './mtOrderForm';
import * as styles from './mtOrderFormView.scss';
import { MTSimpleOrderPanelProps } from './mtOrderPanel';

/* tslint:disable */
const collateralBalanceTooltip = (collateral: string) => `
  This is the amount of ${collateral} you currently have locked within your Multiply Account.
  This ${collateral} is used as collateral against any debt you have, and may be sold 
  if the Mark Price falls below your Liquidation Price.
`;

const daiBalanceTooltip = `
  This is the amount of Dai you have in your Multiply Account.
  When negative, this represents your debt, and how much you owe.
  When positive, this is how much Dai is available for you to withdraw.
`;
const slippageLimitTooltip = `
  This is the maximum amount that the final price you are buying or selling your collateral for
  can change between the point your order is placed and when it is settled.
  If the final price does exceed this value, your trade will be cancelled.
`;
/* tslint:enable*/

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
//   let multiple = null;
//   let urnBalance = null;
//
//   if (value.mta && value.mta.state === MTAccountState.setup) {
//     const ma = findMarginableAsset(value.baseToken, value.mta);
//     balance = ma!.balance;
//     debt = ma!.debt;
//     cash = ma!.dai;
//     urnBalance = ma!.urnBalance;
//     referencePrice = ma!.referencePrice;
//     multiple = balance.times(referencePrice).div(balance.times(referencePrice).minus(debt));
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
//         Multiply:
//         {multiple && multiple.toString()}
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

export class MtSimpleOrderFormBody extends React.Component<MTSimpleFormState & { close?: () => void }> {
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
      value: value === '' ? undefined : new BigNumber(value),
    });
  };

  public handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/,/g, '');
    this.props.change({
      kind: FormChangeKind.amountFieldChange,
      value: value === '' ? undefined : new BigNumber(value),
    });
  };

  public handleSlippageLimitChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = new BigNumber(e.target.value.replace(/,/g, ''));
    if (!value.isNaN()) {
      this.props.change({
        kind: FormChangeKind.slippageLimitChange,
        value: value.div(100),
      });
    }
  };

  public handleSetMaxTotal = () => this.handleSetMax(this.props.maxTotal, FormChangeKind.totalFieldChange);

  public handleSetMaxAmount = () => this.handleSetMax(this.props.maxAmount, FormChangeKind.amountFieldChange);

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
  };

  public handleAmountFocus = () => {
    if (this.amountInput) {
      this.amountInput.focus();
    }
  };

  public handlePriceFocus = () => {
    if (this.priceInput) {
      this.priceInput.focus();
    }
  };

  public handleSlippageLimitFocus = () => {
    if (this.slippageLimitInput) {
      this.slippageLimitInput.focus();
    }
  };

  public render() {
    return this.props.view === ViewKind.instantTradeForm ? this.instantOrderForm() : this.advancedSettings();
  }

  private handlecheckboxChange = () => {
    this.props.change({
      kind: FormChangeKind.checkboxChange,
      value: !this.props.riskComplianceCurrent,
    });
  };

  private handleSetMax = (
    value: BigNumber,
    kind: FormChangeKind.amountFieldChange | FormChangeKind.totalFieldChange,
  ) => {
    this.props.change({ kind, value });
  };

  private switchToInstantOrderForm = () => {
    this.props.change({ kind: FormChangeKind.viewChange, value: ViewKind.instantTradeForm });
  };

  private switchToSettings = () => {
    this.props.change({ kind: FormChangeKind.viewChange, value: ViewKind.settings });
  };

  private renderAccountInfo = () => {
    const accountNotConnected = !this.props.account;
    const accountNotSetup = this.props.mta && this.props.mta.state === MTAccountState.notSetup;

    if (accountNotConnected) {
      return (
        <div className={styles.notSetupBorder} data-test-id="locked-form">
          <LoggedOut view="Balances" />
        </div>
      );
    }

    if (accountNotSetup) {
      return (
        <div className={styles.notSetupBorder} data-test-id="locked-form">
          <Muted>Deploy your Proxy and enable {this.props.baseToken}</Muted>
        </div>
      );
    }

    return (
      <div className={styles.summaryBox}>
        {this.purchasingPower()}
        {this.slippageLimit()}
        {this.stabilityFee()}
        {this.accountBalance()}
        {this.multiple()}
        {this.price()}
        {this.liquidationPrice()}
      </div>
    );
  };

  private instantOrderForm = () => {
    return (
      <>
        <form onSubmit={this.handleProceed} data-test-id="order-form">
          {this.renderAccountInfo()}
          <Hr color="dark" className={styles.hrMargin} />
          {this.amount()}
          {this.total()}
          {this.riskCompliance()}
          {this.proceedButton()}
        </form>
      </>
    );
  };

  private advancedSettings = () => (
    <>
      <div className={formStyles.pickerOrderType}>
        <Radio dataTestId="fillOrKill" name="orderType" value="direct" defaultChecked={true}>
          Average price fill or kill order type
        </Radio>
        <Muted className={formStyles.pickerDescription}>
          The order is executed in its entirety such that the average fill price is the limit price or better, otherwise
          it is canceled
        </Muted>
        {this.slippageLimitForm()}
      </div>
      <Button
        style={{ marginTop: 'auto' }}
        className={formStyles.confirmButton}
        type="submit"
        onClick={this.switchToInstantOrderForm}
      >
        Done
      </Button>
    </>
  );

  private riskCompliance = () => {
    const { riskComplianceAccepted, riskComplianceCurrent, progress, kind } = this.props;
    return (
      !riskComplianceAccepted &&
      kind === OfferType.buy && (
        <div className={styles.checkbox}>
          <Checkbox
            name="risk-compliance"
            data-test-id="accept-rc"
            checked={riskComplianceCurrent || false}
            disabled={!!progress}
            onChange={this.handlecheckboxChange}
          >
            <span style={{ width: '100%' }}>
              I understand that this involves the usage of
              <a href="https://oasis.app/terms" target="_blank" rel="noopener noreferrer">
                <strong> Maker Vaults </strong>
              </a>
              and the associated risks involved in using the Maker Protocol
            </span>
          </Checkbox>
        </div>
      )
    );
  };
  private liquidationPrice() {
    const liquidationPrice = this.props.liquidationPrice ? this.props.liquidationPrice : zero;
    const liquidationPricePost = this.props.liquidationPricePost ? this.props.liquidationPricePost : zero;

    const baseTokenAsset = findMarginableAsset(this.props.baseToken, this.props.mta);
    return (
      <div
        className={classnames(
          styles.orderSummaryRow,
          styles.orderSummaryRowDark,
          this.props.liquidationPricePost ? styles.visible : styles.hidden,
        )}
      >
        <div className={styles.orderSummaryLabel}>Liquidation price</div>
        <div className={classnames(styles.orderSummaryValue, styles.orderSummaryValuePositive)}>
          {liquidationPrice.gt(zero) ? (
            <Money
              data-test-id="liquidation-price"
              value={liquidationPrice}
              token="USD"
              fallback="-"
              className={classnames({
                [styles.orderSummaryValuePositive]: baseTokenAsset && baseTokenAsset.safe,
                [styles.orderSummaryValueNegative]: baseTokenAsset && !baseTokenAsset.safe,
              })}
            />
          ) : (
            <span data-test-id="liquidation-price">-</span>
          )}
          {this.props.liquidationPricePost && !liquidationPrice.isEqualTo(liquidationPricePost) && (
            <>
              <span className={styles.transitionArrow} />
              {liquidationPricePost.gt(zero) ? (
                <Money
                  data-test-id="estimated-liquidation-price"
                  value={liquidationPricePost}
                  token="USD"
                  fallback="-"
                  className={classnames({
                    [styles.orderSummaryValuePositive]: this.props.isSafePost,
                    [styles.orderSummaryValueNegative]: !this.props.isSafePost,
                  })}
                />
              ) : (
                <span data-test-id="estimated-liquidation-price">-</span>
              )}
            </>
          )}
        </div>
      </div>
    );
  }

  private price() {
    const { price, priceImpact, quoteToken, messages } = this.props;
    return (
      <div
        className={classnames(
          styles.orderSummaryRow,
          styles.orderSummaryRowDark,
          price && priceImpact && messages.length === 0 ? styles.visible : styles.hidden,
        )}
      >
        <div className={styles.orderSummaryLabel}>Price (and Impact)</div>
        <div className={styles.orderSummaryValue} data-test-id="price">
          <Money value={price || zero} token={quoteToken} />{' '}
          {priceImpact && (
            <>
              (<FormatPercent value={priceImpact} fallback="-" multiply={true} /> Impact)
            </>
          )}
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
          <SettingsIcon className={styles.settingsIcon} onClick={this.switchToSettings} />
          <WarningTooltip id="slippage-limit" text={slippageLimitTooltip} />
        </div>
        <div className={styles.orderSummaryValue} data-test-id="slippage-limit">
          {slippageLimit && <FormatPercent value={slippageLimit} fallback="-" precision={2} multiply={true} />}
        </div>
      </div>
    );
  }

  private slippageLimitForm() {
    const slippageLimit = this.props.slippageLimit ? this.props.slippageLimit.times(100).valueOf() : '';
    return (
      <InputGroup sizer="lg" style={{ marginTop: '24px' }}>
        <InputGroupAddon className={formStyles.inputHeader}>Slippage limit</InputGroupAddon>
        <div className={formStyles.inputTail}>
          <BigNumberInput
            ref={(el: any) =>
              (this.slippageLimitInput = (el && (ReactDOM.findDOMNode(el) as HTMLElement)) || undefined)
            }
            data-test-id="slippage-limit-input"
            type="text"
            mask={createNumberMask({
              allowDecimal: true,
              precision: 2,
              prefix: '',
            })}
            pipe={lessThanOrEqual(new BigNumber(100))}
            onChange={this.handleSlippageLimitChange}
            value={slippageLimit}
            guide={true}
            placeholder={slippageLimit}
            className={styles.input}
          />
          <InputGroupAddon className={formStyles.inputPercentAddon} onClick={this.handleSlippageLimitFocus}>
            %
          </InputGroupAddon>
        </div>
      </InputGroup>
    );
  }

  private stabilityFee() {
    const { baseToken, mta } = this.props;
    const baseTokenAsset = findMarginableAsset(baseToken, mta);

    return (
      <div className={classnames(styles.orderSummaryRow, styles.orderSummaryRowDark)}>
        <div className={styles.orderSummaryLabel}>Stability Fee (Variable)</div>
        <div className={styles.orderSummaryValue}>
          {baseTokenAsset?.fee ? (
            <FormatPercent value={baseTokenAsset?.fee} fallback="-" multiply={false} precision={2} />
          ) : (
            <span>-</span>
          )}
        </div>
      </div>
    );
  }

  private multiple() {
    const { multiple, multiplePost } = this.props;
    const multipleDisplay = multiple && multiple.gt(zero) ? multiple : multiplePost ? zero : minusOne;

    const multiplePostDisplay = multiplePost && multiplePost.gt(zero) ? multiplePost : minusOne;
    return (
      <div
        className={classnames(
          styles.orderSummaryRow,
          styles.orderSummaryRowDark,
          multiplePost ? styles.visible : styles.hidden,
        )}
      >
        <div className={styles.orderSummaryLabel}>Multiple</div>
        <div className={styles.orderSummaryValue}>
          {multipleDisplay.gt(zero) ? <>{formatPrecision(multipleDisplay, 2)}x</> : <span>-</span>}
          {multiplePost && (
            <>
              <span className={styles.transitionArrow} />
              {multiplePostDisplay.gte(zero) ? <>{formatPrecision(multiplePostDisplay, 2)}x</> : <span>-</span>}
            </>
          )}
        </div>
      </div>
    );
  }

  private purchasingPower() {
    return this.props.kind === OfferType.buy ? (
      <div className={classnames(styles.orderSummaryRow, styles.orderSummaryRowDark)}>
        <div className={styles.orderSummaryLabel}>Purch. power</div>
        <div className={styles.orderSummaryValue} data-test-id="purchasing-power">
          {this.props.realPurchasingPower && (
            <>
              {this.props.dustWarning && (
                <div className={styles.purchasingPowerTooltip}>
                  <WarningTooltip
                    id="purchasing-power-dust"
                    text="You do not have enough purchasing power to complete this order."
                  />
                </div>
              )}
              {formatPrecision(this.props.realPurchasingPower, 2)}
            </>
          )}
          {this.props.realPurchasingPowerPost && (
            <>
              <span className={styles.transitionArrow} />
              {this.props.realPurchasingPowerPost ? (
                <span data-test-id="estimated-purchasing-power">
                  {formatPrecision(this.props.realPurchasingPowerPost, 2)}
                </span>
              ) : (
                <span>-</span>
              )}
            </>
          )}
          <>
            {(this.props.realPurchasingPower || this.props.realPurchasingPowerPost) && <> {this.props.quoteToken} </>}
          </>
        </div>
      </div>
    ) : null;
  }

  private accountBalance() {
    const baseTokenAsset = findMarginableAsset(this.props.baseToken, this.props.mta);
    const { balancePost, daiBalancePost, baseToken, quoteToken, kind } = this.props;

    return (
      <>
        <div
          className={classnames(
            styles.orderSummaryRow,
            styles.orderSummaryRowDark,
            balancePost || kind === OfferType.sell ? styles.visible : styles.hidden,
          )}
        >
          <div className={styles.orderSummaryLabel}>
            <span>Balance</span>
            <WarningTooltip id="col-balance" text={collateralBalanceTooltip(baseToken)} />
          </div>
          <div className={styles.orderSummaryValue} data-test-id="col-balance">
            {baseTokenAsset && baseTokenAsset.balance ? (
              <CryptoMoney value={baseTokenAsset.balance} token={baseToken} fallback="-" />
            ) : (
              <span>-</span>
            )}
            {balancePost && (
              <>
                <span className={styles.transitionArrow} />
                {balancePost ? (
                  <CryptoMoney
                    data-test-id="estimated-col-balance"
                    value={balancePost}
                    token={baseToken}
                    fallback="-"
                  />
                ) : (
                  <span>-</span>
                )}
              </>
            )}
          </div>
        </div>
        <div
          className={classnames(
            styles.orderSummaryRow,
            styles.orderSummaryRowDark,
            daiBalancePost || kind === OfferType.sell ? styles.visible : styles.hidden,
          )}
        >
          <div className={styles.orderSummaryLabel}>
            <span>DAI Balance</span>
            <WarningTooltip id="dai-balance" text={daiBalanceTooltip} />
          </div>
          <div className={styles.orderSummaryValue}>
            {baseTokenAsset && baseTokenAsset.debt.gt(zero) ? (
              <CryptoMoney
                data-test-id="dai-balance"
                value={baseTokenAsset.debt.times(minusOne)}
                token={quoteToken}
                fallback="-"
              />
            ) : baseTokenAsset && baseTokenAsset.dai ? (
              <CryptoMoney data-test-id="dai-balance" value={baseTokenAsset.dai} token={quoteToken} fallback="-" />
            ) : (
              <span>-</span>
            )}
            {daiBalancePost && (
              <>
                <span className={styles.transitionArrow} />
                {daiBalancePost ? (
                  <CryptoMoney
                    data-test-id="estimated-dai-balance"
                    value={daiBalancePost}
                    token={quoteToken}
                    fallback="-"
                  />
                ) : (
                  <span>-</span>
                )}
              </>
            )}
          </div>
        </div>
      </>
    );
  }

  private amount() {
    return (
      <div>
        {this.amountGroup()}
        <Error field="amount" messages={this.props.messages} tid="amount-error" />
      </div>
    );
  }

  private total() {
    const { total, quoteToken, maxTotal } = this.props;

    return (
      <div>
        <InputGroup>
          <InputGroupAddon border="right" className={styles.inputHeader}>
            Total
          </InputGroupAddon>
          <ApproximateInputValue
            shouldApproximate={!!total && !total.eq(new BigNumber(formatPrice(total, quoteToken)))}
          >
            <BigNumberInput
              ref={(el: any) => (this.priceInput = (el && (ReactDOM.findDOMNode(el) as HTMLElement)) || undefined)}
              type="text"
              mask={createNumberMask({
                allowDecimal: true,
                decimalLimit: getToken(quoteToken).digits,
                prefix: '',
              })}
              onChange={this.handleTotalChange}
              value={(total || null) && formatPrice(total as BigNumber, quoteToken)}
              guide={true}
              placeholder={`Max. ${formatAmount(maxTotal, quoteToken)}`}
              className={styles.input}
              data-test-id="total-input"
              // disabled={this.props.stage === FormStage.waitingForAllocation}
              // disabled={ true }
            />
          </ApproximateInputValue>
          <InputGroupAddon className={styles.setMaxBtnAddon} onClick={this.handleSetMaxTotal}>
            <Button size="sm" type="button" className={styles.setMaxBtn}>
              Set Max
            </Button>
          </InputGroupAddon>
          <InputGroupAddon className={styles.inputCurrencyAddon} onClick={this.handlePriceFocus}>
            {quoteToken}
          </InputGroupAddon>
        </InputGroup>
        <Error field="total" messages={this.props.messages} tid="total-error" />
      </div>
    );
  }

  private proceedButton() {
    const { kind, total, readyToProceed, progress } = this.props;
    const label = kind === 'buy' ? 'Place Buy Order' : 'Place Sell Order';
    return (
      <Button
        className={styles.confirmButton}
        data-test-id="place-order"
        type="submit"
        value="submit"
        color={kind === OfferType.buy ? 'primary' : 'danger'}
        disabled={!readyToProceed || !!progress}
        onClick={() => {
          if (total) {
            trackingEvents.initiateTradeMultiply(kind);
          }
        }}
      >
        {label}
      </Button>
    );
  }

  private amountGroup() {
    const { amount, baseToken, maxAmount } = this.props;

    return (
      <InputGroup>
        <InputGroupAddon border="right" className={styles.inputHeader}>
          Amount
        </InputGroupAddon>
        <ApproximateInputValue
          shouldApproximate={!!amount && !amount.eq(new BigNumber(formatAmount(amount, baseToken)))}
        >
          <BigNumberInput
            ref={(el: any) => (this.amountInput = (el && (ReactDOM.findDOMNode(el) as HTMLElement)) || undefined)}
            type="text"
            mask={createNumberMask({
              allowDecimal: true,
              decimalLimit: getToken(baseToken).digits,
              prefix: '',
            })}
            onChange={this.handleAmountChange}
            value={(amount || null) && formatAmount(amount as BigNumber, baseToken)}
            guide={true}
            placeholder={`Max. ${formatAmount(maxAmount, baseToken)}`}
            className={styles.input}
            data-test-id="amount-input"
            // disabled={this.props.progress === FormStage.waitingForAllocation}
          />
        </ApproximateInputValue>
        <InputGroupAddon className={styles.setMaxBtnAddon} onClick={this.handleSetMaxAmount}>
          <Button size="sm" type="button" className={styles.setMaxBtn}>
            Set Max
          </Button>
        </InputGroupAddon>
        <InputGroupAddon className={styles.inputCurrencyAddon} onClick={this.handleAmountFocus}>
          {baseToken}
        </InputGroupAddon>
      </InputGroup>
    );
  }
}

export function MtSimpleOrderFormView(props: MTSimpleFormState & MTSimpleOrderPanelProps & { open: ModalOpener }) {
  const { change, createMTFundForm$, open, view, kind, slippageLimit } = props;
  let slippageLimitInput: HTMLElement | undefined;

  function handleKindChange(newKind: OfferType) {
    change({
      newKind,
      kind: FormChangeKind.kindChange,
    });
  }

  function handleSlippageLimitChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = new BigNumber(e.target.value.replace(/,/g, ''));
    if (!value.isNaN()) {
      change({
        kind: FormChangeKind.slippageLimitChange,
        value: value.div(100),
      });
    }
  }

  function handleSlippageLimitFocus() {
    if (slippageLimitInput) {
      slippageLimitInput.focus();
    }
  }

  function transfer(actionKind: UserActionKind, token: string, withOnboarding: boolean, ilk?: string) {
    open(({ close }) => {
      const fundForm = useObservable(
        createMTFundForm$({
          actionKind,
          token,
          ilk,
          withOnboarding,
        }),
      );
      return fundForm ? <MtTransferFormView close={close} {...fundForm} /> : null;
    });
  }

  function switchToInstantOrderForm() {
    change({ kind: FormChangeKind.viewChange, value: ViewKind.instantTradeForm });
  }

  function advancedSettings() {
    return (
      <>
        <div className={formStyles.pickerOrderType}>
          <Radio dataTestId="fillOrKill" name="orderType" value="direct" defaultChecked={true}>
            Average price fill or kill order type
          </Radio>
          <Muted className={formStyles.pickerDescription}>
            The order is executed in its entirety such that the average fill price is the limit price or better,
            otherwise it is canceled
          </Muted>
          {slippageLimitForm()}
        </div>
      </>
    );
  }

  function headerButtons() {
    return (
      <>
        <ButtonGroup style={{ marginLeft: 'auto' }}>
          <Button
            data-test-id="new-buy-order"
            className={styles.btn}
            onClick={() => handleKindChange(OfferType.buy)}
            color={kind === OfferType.buy ? 'primary' : 'greyOutlined'}
            size="sm"
          >
            Buy
          </Button>
          <Button
            data-test-id="new-sell-order"
            className={styles.btn}
            onClick={() => handleKindChange(OfferType.sell)}
            color={kind === OfferType.sell ? 'danger' : 'greyOutlined'}
            size="sm"
          >
            Sell
          </Button>
        </ButtonGroup>
      </>
    );
  }

  function slippageLimitForm() {
    const slippageLimitValue = slippageLimit ? slippageLimit.times(100).valueOf() : '';
    return (
      <InputGroup sizer="lg" style={{ marginTop: '24px' }}>
        <InputGroupAddon className={formStyles.inputHeader}>Slippage limit</InputGroupAddon>
        <div className={formStyles.inputTail}>
          <BigNumberInput
            ref={(el: any) => (slippageLimitInput = (el && (ReactDOM.findDOMNode(el) as HTMLElement)) || undefined)}
            data-test-id="slippage-limit"
            type="text"
            mask={createNumberMask({
              allowDecimal: true,
              precision: 2,
              prefix: '',
            })}
            pipe={lessThanOrEqual(new BigNumber(100))}
            onChange={handleSlippageLimitChange}
            value={slippageLimitValue}
            guide={true}
            placeholder={slippageLimitValue}
            className={styles.input}
          />
          <InputGroupAddon className={formStyles.inputPercentAddon} onClick={handleSlippageLimitFocus}>
            %
          </InputGroupAddon>
        </div>
      </InputGroup>
    );
  }

  function CallForDeposit(message: OrderFormMessage, ma?: MarginableAsset) {
    const transferWithOnboarding = message ? message.kind === OrderFormMessageKind.onboarding : false;

    return (
      <div className={styles.onboardingPanel}>
        <div className={styles.onboardingParagraph}>{orderFormMessageContent(message)}</div>
        <Button
          size="md"
          color="primary"
          data-test-id="open-position-with-DAI"
          disabled={!ma}
          onClick={() => transfer(UserActionKind.fund, 'DAI', transferWithOnboarding, ma!.name)}
        >
          Deposit DAI
        </Button>
        <br />
        <Button
          size="md"
          color="primary"
          data-test-id={`open-position-with-${ma?.name}`}
          disabled={!ma}
          onClick={() => transfer(UserActionKind.fund, ma!.name, transferWithOnboarding, ma!.name)}
        >
          Deposit {ma && ma.name}
        </Button>
      </div>
    );
  }

  function MainContent() {
    const { mta, baseToken, orderFormMessage } = props;
    const ma = findMarginableAsset(baseToken, mta);

    if (orderFormMessage) {
      return CallForDeposit(orderFormMessage, ma);
    }

    return <MtSimpleOrderFormBody {...props} />;
  }

  return (
    <>
      <PanelHeader>
        {props.view === ViewKind.instantTradeForm ? (
          <>
            Manage your Position
            {headerButtons()}
          </>
        ) : (
          'Advanced Settings'
        )}
      </PanelHeader>
      <PanelBody style={{ paddingBottom: '16px' }}>
        {view === ViewKind.instantTradeForm ? MainContent() : advancedSettings()}
      </PanelBody>
      {view === ViewKind.settings && (
        <PanelFooter className={styles.settingsFooter}>
          <Button className={formStyles.confirmButton} type="submit" onClick={switchToInstantOrderForm}>
            Done
          </Button>
        </PanelFooter>
      )}
    </>
  );
}

const Error = ({ field, messages, tid }: { field: string; messages?: Message[]; tid?: string }) => {
  const myMsg = (messages || [])
    .filter((message: Message) => message.field === field)
    .sort((m1, m2) => m2.priority - m1.priority)
    .map((msg) => messageContent(msg));
  return <ErrorMessage messages={myMsg} style={{ height: '28px' }} data-test-id={tid} />;
};

function messageContent(msg: Message) {
  switch (msg.kind) {
    case MessageKind.insufficientAmount:
      return `Your ${msg.token} balance is too low to fund this order`;
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
      return `Dai debt below ${msg.message} DAI limit`;
    case MessageKind.unsellable:
      return `Your position is unsellable. ${msg.message}`;
  }
}

function orderFormMessageContent(msg: OrderFormMessage) {
  if (!msg) {
    return null;
  }

  switch (msg.kind) {
    // tslint:disable
    case OrderFormMessageKind.onboarding:
      return (
        <>
          <h3>Deposit into Multiply Account</h3>
          Before opening a new position, deposit {msg.baseToken}
          <br />
          or DAI into your Multiply Trading Account
        </>
      );

    case OrderFormMessageKind.collRatioUnsafe:
      return (
        <div className={styles.warningMessage}>
          Warning - Your position is currently too close to the liquidation price to sell.
          <br />
          To sell your position, you must first
          <br /> deposit DAI or {msg.baseToken}.
        </div>
      );

    case OrderFormMessageKind.liquidationImminent:
      return (
        <div className={styles.warningMessage}>
          {
            <>
              Warning - Your position will be liquidated in {msg.nextPriceUpdateDelta} minutes and cannot currently be
              sold.
              <br />
              To rescue your position, you must deposit additional {msg.baseToken} or DAI
            </>
          }
        </div>
      );

    case OrderFormMessageKind.bitable:
      return (
        <div className={styles.warningMessage}>
          Your {msg.baseToken} multiply position is now at risk of being liquidated. You can still avoid auction by{' '}
          <br /> depositing {msg.baseToken} or DAI.
        </div>
      );
    // tslint:enable
  }
}
