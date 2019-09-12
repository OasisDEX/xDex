import { BigNumber } from 'bignumber.js';
import classnames from 'classnames';
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { createNumberMask } from 'text-mask-addons/dist/textMaskAddons';
import * as formStyles from '../../exchange/offerMake/OfferMakeForm.scss';
import { OfferType } from '../../exchange/orderbook/orderbook';
import { BigNumberInput } from '../../utils/bigNumberInput/BigNumberInput';
import { FormChangeKind } from '../../utils/form';
import { formatAmount, formatPrecision, formatPrice } from '../../utils/formatters/format';
import { FormatPercent, Money } from '../../utils/formatters/Formatters';
import { Button, ButtonGroup } from '../../utils/forms/Buttons';
import { ErrorMessage } from '../../utils/forms/ErrorMessage';
import { InputGroup, InputGroupAddon, lessThanOrEqual } from '../../utils/forms/InputGroup';
import { Radio } from '../../utils/forms/Radio';
import { SettingsIcon } from '../../utils/icons/Icons';
import { Hr } from '../../utils/layout/LayoutHelpers';
import { PanelBody, PanelFooter, PanelHeader } from '../../utils/panel/Panel';
import { Muted } from '../../utils/text/Text';
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

export class MtSimpleOrderFormView extends React.Component<MTSimpleFormState> {

  private amountInput?: HTMLElement;
  private priceInput?: HTMLElement;
  private slippageLimitInput?: HTMLElement;

  public handleKindChange(kind: OfferType) {
    this.props.change({
      kind: FormChangeKind.kindChange,
      newKind: kind,
    });
  }

  public handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/,/g, '');
    this.props.change({
      kind: FormChangeKind.priceFieldChange,
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
    return (
      <div className={styles.InstantOrderPanel}>
        {
          this.props.view === ViewKind.instantTradeForm
            ? this.instantOrderForm()
            : this.advancedSettings()
        }
      </div>
    );
  }

  private switchToSettings = () => {
    this.props.change({ kind: FormChangeKind.viewChange, value: ViewKind.settings });
  }

  private switchToInstantOrderForm = () => {
    this.props.change({ kind: FormChangeKind.viewChange, value: ViewKind.instantTradeForm });
  }

  private instantOrderForm = () => (
    <>
      <PanelHeader>
        Instant Order
        {this.headerButtons()}
      </PanelHeader>
      <Hr color="dark" className={styles.hrSmallMargin}/>
      <PanelBody>
        <form
          onSubmit={this.handleProceed}
        >
          {/*{ this.orderType() }*/}
          {/*{ this.balanceButtons() }*/}
          {/*{ this.purchasingPower() }*/}
          <div className={styles.summaryBox}>
            {this.purchasingPower2()}
            {this.accountBalance()}
            {/*{this.leverage()}*/}
            {/*{ this.collateralizationRatio() }*/}
            {this.liquidationPrice()}
            {this.price2()}
            {this.slippageLimit()}
            {/*{this.interestRate()}*/}
          </div>
          {this.feesBox()}
          <Hr color="dark" className={styles.hrMargin}/>
          {this.amount()}
          {/*{ this.price() }*/}
          {this.total()}
          {/*{ this.gasCost() }*/}
          {this.proceedButton()}
        </form>
      </PanelBody>
      {/*{this.props && <DevInfos value={this.props as MTSimpleFormState}/>}*/}
    </>
  )

  private advancedSettings = () => (
    <>
      <PanelHeader>
        Advanced Settings
      </PanelHeader>
      <Hr color="dark" className={styles.hrSmallMargin}/>
      <PanelBody>
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
      </PanelBody>
      <PanelFooter className={styles.settingsFooter}>
        <Button
          className={formStyles.confirmButton}
          type="submit"
          onClick={this.switchToInstantOrderForm}
        >
          Done
        </Button>
      </PanelFooter>
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
            className={styles.btn}
            onClick={() => this.handleKindChange(OfferType.buy)}
            color={this.props.kind === 'buy' ? 'green' : 'grey'}
          >Buy</Button>
          <Button
            className={styles.btn}
            onClick={() => this.handleKindChange(OfferType.sell)}
            color={this.props.kind === 'sell' ? 'red' : 'grey'}
          >Sell</Button>
        </ButtonGroup>
      </>
    );
  }

  // private balanceButtons() {
  //   const baseTokenAsset = findAsset(this.props.baseToken, this.props.mta);
  //   const quoteTokenAsset = findAsset(this.props.quoteToken, this.props.mta);
  //   return (
  //     <div className={classnames(styles.flexContainer, styles.marginBottom)}>
  //       <Button
  //         type="button"
  //         onClick={this.handleSetMax}
  //         size="lg"
  //         block={true}
  //         disabled={this.props.kind === 'buy'}
  //         className={styles.balanceBtn}
  //       >
  //         { this.props.baseToken && <BalanceIcon token={this.props.baseToken} />}
  //         <span style={{ lineHeight: 1 }}>
  //                   { baseTokenAsset &&
  //                   formatAmount(baseTokenAsset.balance, this.props.baseToken)
  //                   } <Currency value={this.props.baseToken} />
  //                 </span>
  //       </Button>
  //       <Button
  //         type="button"
  //         onClick={this.handleSetMax}
  //         size="lg"
  //         block={true}
  //         disabled={this.props.kind === 'sell'}
  //         className={styles.balanceBtn}
  //       >
  //         { this.props.quoteToken && <BalanceIcon token={this.props.quoteToken} />}
  //         <span style={{ lineHeight: 1 }}>
  //                   { quoteTokenAsset &&
  //                   formatAmount(quoteTokenAsset.balance, this.props.quoteToken)
  //                   } <Currency value={this.props.quoteToken} />
  //                 </span>
  //       </Button>
  //     </div>
  //   );
  // }

  // private orderType() {
  //   return (
  //     <BorderBox className={classnames(styles.lg,
  //                                      styles.orderType,
  //                                      styles.marginBottom)}
  //       padding="sm"
  //     >
  //       <span>Fill or kill</span>
  //     </BorderBox>
  //   );
  // }

  // private collateralizationRatio() {
  //   return (
  //     <div className={classnames(styles.orderSummaryRow, styles.orderSummaryRowDark)}>
  //       <div className={styles.orderSummaryLabel}>
  //         Collateralization ratio
  //       </div>
  //       <div className={styles.orderSummaryValue}>
  //         {
  //           this.props.collRatio &&
  //           <FormatPercent
  //             value={this.props.collRatio}
  //             fallback="-"
  //             multiply={true}
  //             className={styles.orderSummaryValuePositive}
  //           />
  //         }
  //         {
  //           this.props.collRatioPost &&
  //           <>
  //             <span className={styles.transitionArrow} />
  //             <FormatPercent
  //               value={this.props.collRatioPost}
  //               fallback="-"
  //               multiply={true}
  //               className={
  //                 classnames({
  //                   [styles.orderSummaryValuePositive]: this.props.isSafePost,
  //                   [styles.orderSummaryValueNegative]: !this.props.isSafePost,
  //                 })
  //               }
  //             />
  //           </>
  //         }
  //       </div>
  //     </div>
  //   );
  // }

  private liquidationPrice() {
    return (
      <div className={classnames(styles.orderSummaryRow, styles.orderSummaryRowDark)}>
        <div className={styles.orderSummaryLabel}>
          Liqu. price
        </div>
        <div className={classnames(styles.orderSummaryValue, styles.orderSummaryValuePositive)}>
          {
            this.props.liquidationPrice && !this.props.liquidationPrice.isNaN() ?
              <Money
                value={this.props.liquidationPrice}
                token="USD"
                fallback="-"
              /> : <span>-</span>
          }
          {
            this.props.liquidationPricePost &&
            <>
              <span className={styles.transitionArrow} />
              { !this.props.liquidationPricePost.isNaN() ?
                <Money
                  value={this.props.liquidationPricePost}
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

  private price2() {

    // console.log('price props', this.props);
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
    return (
      <div className={classnames(styles.orderSummaryRow, styles.orderSummaryRowDark)}>
        <div className={styles.orderSummaryLabel}>
          Slippage limit
        </div>
        <div className={styles.orderSummaryValue}>
          {
            this.props.slippageLimit &&
            <FormatPercent
              value={this.props.slippageLimit}
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
        hasError={ (this.props.messages || [])
          .filter((message: Message) => message.field === 'slippageLimit')
          .length > 0}
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
              lessThanOrEqual(100)
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

  // private interestRate() {
  //   return (
  //     <div className={classnames(styles.orderSummaryRow, styles.orderSummaryRowDark)}>
  //       <div className={styles.orderSummaryLabel}>
  //         Interest rate (APR)
  //       </div>
  //       <div className={styles.orderSummaryValue}>
  //         {
  //           this.props.apr && <FormatPercent
  //             value={this.props.apr}
  //             fallback="-"
  //             multiply={false}
  //           />
  //         }
  //       </div>
  //     </div>
  //   );
  // }

  private feesBox() {
    return (
      <div className={styles.InfoRow}>
        <div className={styles.InfoBox}>
          <div className={styles.InfoRowLabel}>Leverage</div>
          <div>
            {
              (this.props.leverage && !this.props.leverage.isNaN()) ?
                <>{ formatPrecision(this.props.leverage, 1) }x</>
                : <span>-</span>
            }
            { this.props.leveragePost &&
            <>
              <span className={styles.transitionArrow}/>
              { !this.props.leveragePost.isNaN() ?
                <>
                  {formatPrecision(this.props.leveragePost, 1)}x
                </> : <span>-</span>
              }
            </>
            }
          </div>
        </div>
        <div className={styles.InfoBox}>
          <div className={styles.InfoRowLabel}>Liqu. Fee</div>
          <div>15 %</div>
        </div>
        <div className={styles.InfoBox}>
          <div className={styles.InfoRowLabel}>Interest Rate</div>
          <div>
            {
              this.props.apr && <FormatPercent
                value={this.props.apr}
                fallback="-"
                multiply={false}
              />
            }
          </div>
        </div>
      </div>
    );
  }

  // private purchasingPower() {
  //   const baseTokenAsset = this.props.mta &&
  //     this.props.mta.state === MTAccountState.setup && (
  //       this.props.mta.marginableAssets.find(a => a.name === this.props.baseToken) ||
  //       this.props.mta.nonMarginableAssets.find(a => a.name === this.props.baseToken)
  //     );
  //   return <BorderBox className={classnames(styles.flexContainer,
  //                                           styles.lg,
  //                                           styles.marginBottom)}
  //     padding="sm"
  //   >
  //     <span className={styles.purchasingPowerTitle}>Purchasing power</span>
  //     <span className={styles.purchasingPowerAmount}>
  //       { baseTokenAsset &&
  //       formatAmount(baseTokenAsset.purchasingPower, this.props.quoteToken)
  //       }
  //       ({ this.props.realPurchasingPower &&
  //         formatAmount(this.props.realPurchasingPower, this.props.quoteToken)
  //       })
  //       <Currency value={this.props.quoteToken} />
  //     </span>
  //   </BorderBox>;
  // }

  private purchasingPower2() {
    return <div className={classnames(styles.orderSummaryRow, styles.orderSummaryRowDark)}>
      <div className={styles.orderSummaryLabel}>
        Purchasing power
      </div>
      <div className={styles.orderSummaryValue}>
        {
          this.props.realPurchasingPower &&
          <>
            {formatPrecision(this.props.realPurchasingPower, 2)} {this.props.quoteToken}
          </>
        }
      </div>
    </div>;
  }

  private accountBalance() {
    const baseTokenAsset = findMarginableAsset(this.props.baseToken, this.props.mta);
    return (
      <div className={classnames(styles.orderSummaryRow, styles.orderSummaryRowDark)}>
        <div className={styles.orderSummaryLabel}>
          Balance
        </div>
        <div className={styles.orderSummaryValue}>
          { baseTokenAsset && !baseTokenAsset.balance.isNaN() ?
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
              { !this.props.balancePost.isNaN() ?
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
    );
  }

  // private leverage() {
  //   return <div className={classnames(styles.orderSummaryRow, styles.orderSummaryRowDark)}>
  //     <div className={styles.orderSummaryLabel}>
  //       Current Leverage
  //     </div>
  //     <div className={styles.orderSummaryValue}>
  //       {
  //         (this.props.leverage && !this.props.leverage.isNaN()) ?
  //           <>{ formatPrecision(this.props.leverage, 1) }x</>
  //           : <span>-</span>
  //       }
  //       {this.props.leveragePost && <>
  //         <span className={styles.transitionArrow}/>
  //         {formatPrecision(this.props.leveragePost, 1)}x
  //       </>
  //       }
  //     </div>
  //   </div>;
  // }

  private amount() {
    return (
      <div>
        { this.amountGroup() }
        <Error field="amount" messages={this.props.messages} />
      </div>
    );
  }

  // private price() {
  //   return (
  //     <div>
  //       { this.priceGroup() }
  //       <Error field="price" messages={this.props.messages} />
  //     </div>
  //   );
  // }

  // private gasCost() {
  //   return (
  //     <div>
  //       <div className={styles.flexContainer}>
  //         <span><Muted>Gas cost</Muted></span>
  //         <span>
  //               <GasCost {...this.props}/>
  //             </span>
  //       </div>
  //       <Error field="gas" messages={this.props.messages} />
  //     </div>
  //   );
  // }

  private total() {
    return (
      <div>
        <InputGroup hasError={ (this.props.messages || [])
          .filter((message: Message) => message.field === 'total')
          .length > 0}>
          <InputGroupAddon border="right" className={styles.inputHeader}>Total</InputGroupAddon>
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
            onChange={this.handlePriceChange}
            value={
              (this.props.price || null) &&
              formatPrice(this.props.total as BigNumber, this.props.quoteToken)
            }
            guide={true}
            placeholderChar={' '}
            className={styles.input}
            // disabled={this.props.stage === FormStage.waitingForAllocation}
            disabled={ true }
          />
          <InputGroupAddon className={styles.inputCurrencyAddon} onClick={ this.handlePriceFocus }>
            {this.props.quoteToken}
          </InputGroupAddon>

        </InputGroup>
        <Error field="total" messages={this.props.messages} />
      </div>

      // {/*<div>*/}
      //   {/*<div className={styles.flexContainer}>*/}
      //     {/*<span><Muted>Total</Muted></span>*/}
      //     {/*<span>*/}
      //           {/*{this.props.total && <FormatAmount*/}
      //             {/*value={this.props.total} token={this.props.quoteToken}*/}
      //           {/*/>}*/}
      //       {/*&#x20;*/}
      //       {/*{this.props.quoteToken}*/}
      //     {/*</span>*/}
      //   {/*</div>*/}
      //   {/*<Error field="total" messages={this.props.messages} />*/}
      // {/*</div>*/}
    );
  }

  private proceedButton() {
    const label = this.props.kind === 'buy' ? 'Place Buy Order' : 'Place Sell Order';
    return (
      <Button
        className={styles.confirmButton}
        type="submit"
        value="submit"
        color={ this.props.kind === OfferType.buy ? 'green' : 'red' }
        disabled={ !this.props.readyToProceed || !!this.props.progress }
      >
        {label}
      </Button>
    );
  }

  private amountGroup() {
    return (
      <InputGroup hasError={ (this.props.messages || [])
        .filter((message: Message) => message.field === 'amount')
        .length > 0}>
        <InputGroupAddon border="right" className={styles.inputHeader}>Amount</InputGroupAddon>
        <BigNumberInput
          ref={ (el: any) =>
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
            (this.props.amount || null) &&
            formatAmount(this.props.amount as BigNumber, this.props.baseToken)
          }
          guide={true}
          placeholderChar={' '}
          className={styles.input}
          // disabled={this.props.progress === FormStage.waitingForAllocation}
        />
        <InputGroupAddon className={styles.inputCurrencyAddon} onClick={ this.handleAmountFocus }>
          {this.props.baseToken}
        </InputGroupAddon>

      </InputGroup>
    );
  }

  // private priceGroup() {
  //   return (
  //     <InputGroup hasError={ (this.props.messages || [])
  //       .filter((message: Message) => message.field === 'price')
  //       .length > 0}>
  //       <InputGroupAddon border="right" className={styles.inputHeader}>Price</InputGroupAddon>
  //       <BigNumberInput
  //         ref={ (el: any) =>
  //           this.priceInput = (el && ReactDOM.findDOMNode(el) as HTMLElement) || undefined
  //         }
  //         type="text"
  //         mask={createNumberMask({
  //           allowDecimal: true,
  //           decimalLimit: 5,
  //           prefix: ''
  //         })}
  //         onChange={this.handlePriceChange}
  //         value={
  //           (this.props.price || null) &&
  //           formatPrice(this.props.price as BigNumber, this.props.quoteToken)
  //         }
  //         guide={true}
  //         placeholderChar={' '}
  //         className={styles.input}
  //         // disabled={this.props.stage === FormStage.waitingForAllocation}
  //         disabled={ true }
  //       />
  //       <InputGroupAddon className={styles.inputCurrencyAddon} onClick={ this.handlePriceFocus }>
  //         {this.props.quoteToken}
  //       </InputGroupAddon>
  //
  //     </InputGroup>
  //   );
  // }

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
  }
}

// const BalanceIcon = ({ token }: { token: string }) => {
//   const Icon = tokens[token].icon;
//   return (<Icon />);
// };
