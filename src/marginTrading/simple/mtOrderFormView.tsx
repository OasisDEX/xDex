import { BigNumber } from 'bignumber.js';
import classnames from 'classnames';
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { createNumberMask } from 'text-mask-addons/dist/textMaskAddons';
// import { Muted } from '../../utils/text/Text';
import { OfferType } from '../../exchange/orderbook/orderbook';
// import { tokens } from '../../blockchain/config';
import { BigNumberInput } from '../../utils/bigNumberInput/BigNumberInput';
import { FormChangeKind } from '../../utils/form';
import { formatAmount, formatPrecision, formatPrice } from '../../utils/formatters/format';
import { FormatPercent, Money } from '../../utils/formatters/Formatters';
import { Button, ButtonGroup } from '../../utils/forms/Buttons';
import { ErrorMessage } from '../../utils/forms/ErrorMessage';
import { InputGroup, InputGroupAddon } from '../../utils/forms/InputGroup';
import { Hr } from '../../utils/layout/LayoutHelpers';
import { PanelBody, PanelHeader } from '../../utils/panel/Panel';

// import { GasCost } from '../../utils/gasCost/GasCost';
import { findMarginableAsset, MTAccountState } from '../state/mtAccount';
import { Message, MessageKind, MTSimpleFormState } from './mtOrderForm';
import * as styles from './mtOrderFormView.scss';

const DevInfos = ({ value }: { value: MTSimpleFormState }) => {

  let balance = null;
  let debt = null;
  let referencePrice = null;
  let leverage = null;
  if (value.mta && value.mta.state === MTAccountState.setup) {
    const ma = findMarginableAsset(value.baseToken, value.mta);
    balance = ma!.balance;
    debt = ma!.debt;
    referencePrice = ma!.referencePrice;
    leverage = balance.times(referencePrice).div(balance.times(referencePrice).minus(debt));
  }
  return (<div style={{
    position: 'fixed',
    top: '1em',
    right: '1em',
    background: 'rgba(20,20,20, 0.6)',
    padding: '5px',
    zIndex: 1000
  }}>
    <h3>Internals:</h3>
    progress:
    {value.progress}
    <br/>
    total:
    {value.total && value.total.toString()}
    <br/>
    price:
    {value.price && value.price.toString()}
    <br/>
    realPurchasingPower:
    {value.realPurchasingPower && value.realPurchasingPower.toString()}
    <br/>
    collRatio:
    {value.collRatio && value.collRatio.toFormat(2)}
    <br/>
    collRatioPost:
    {value.collRatioPost && value.collRatioPost.toFormat(2)}
    <br/>
    liquidationPrice:
    {value.liquidationPrice && value.liquidationPrice.toFormat(2)}
    <br/>
    liquidationPricePost:
    {value.liquidationPricePost && value.liquidationPricePost.toFormat(2)}
    <br/>
    MA:
    <br/>
        <React.Fragment>
          Balance:
          {balance && balance.toString()}
          <br/>
          Debt:
          {debt && debt.toString()}
          <br/>
          referencePrice:
          {referencePrice && referencePrice.toString()}
          <br/>
          LEVERAGE:
          {leverage && leverage.toString()}
          <br/>
        </React.Fragment> : null

    <br/>
    Plan:
    {value.plan &&
    <pre>{JSON.stringify(value.plan, null, 4)}</pre>}
    <br/>
    Messages:
    {value.messages &&
    <pre>{JSON.stringify(value.messages, null, 4)}</pre>}
  </div>
  ); };

export class MtSimpleOrderFormView
  extends React.Component<MTSimpleFormState>
{

  private amountInput?: HTMLElement;
  private priceInput?: HTMLElement;

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

  public render() {
    return (
      <div className={styles.InstantOrderPanel}>
        <PanelHeader>
          Instant Order
          { this.headerButtons() }
        </PanelHeader>
        <Hr color="dark" className={styles.hrSmallMargin}/>
        <PanelBody>
          <form
            onSubmit={this.handleProceed}
          >
            {/*{ this.orderType() }*/}
            {/*{ this.balanceButtons() }*/}
            {/*{ this.purchasingPower() }*/}
            { this.purchasingPower2() }
            { this.accountBalance() }
            { this.leverage() }
            {/*{ this.collateralizationRatio() }*/}
            { this.liquidationPrice() }
            { this.price2() }
            { this.slippageLimit() }
            { this.interestRate() }
            <Hr color="dark" className={styles.hrMargin}/>
            { this.amount() }
            {/*{ this.price() }*/}
            { this.total() }
            {/*{ this.gasCost() }*/}
            { this.proceedButton() }
          </form>
        </PanelBody>
        { this.props && <DevInfos value={this.props as MTSimpleFormState}/>}
      </div>);
  }

  private headerButtons() {
    return (
      <ButtonGroup className={styles.btnGroup}>
        <Button
          className={styles.btn}
          onClick={() => this.handleKindChange(OfferType.buy)}
          color={ this.props.kind === 'buy' ? 'green' : 'grey' }
        >Buy</Button>
        <Button
          className={styles.btn}
          onClick={() => this.handleKindChange(OfferType.sell)}
          color={ this.props.kind === 'sell' ? 'red' : 'grey' }
        >Sell</Button>
      </ButtonGroup>
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
  //           <React.Fragment>
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
  //           </React.Fragment>
  //         }
  //       </div>
  //     </div>
  //   );
  // }

  private liquidationPrice() {
    return (
      <div className={classnames(styles.orderSummaryRow, styles.orderSummaryRowDark)}>
        <div className={styles.orderSummaryLabel}>
          Liquidation price
        </div>
        <div className={classnames(styles.orderSummaryValue, styles.orderSummaryValuePositive)}>
          {
            this.props.liquidationPrice &&
            <Money
              value={this.props.liquidationPrice}
              token={this.props.quoteToken}
              fallback="-"
            />
          }
          {
            this.props.liquidationPricePost &&
            <React.Fragment>
              <span className={styles.transitionArrow} />
              <Money
                value={this.props.liquidationPricePost}
                token={this.props.quoteToken}
                fallback="-"
                className={
                  classnames({
                    [styles.orderSummaryValuePositive]: this.props.isSafePost,
                    [styles.orderSummaryValueNegative]: !this.props.isSafePost,
                  })
                }
              />
            </React.Fragment>
          }
        </div>
      </div>
    );
  }

  private price2() {

    console.log('price props', this.props);
    const price = this.props.price || new BigNumber(0);
    return (
      <div className={classnames(styles.orderSummaryRow, styles.orderSummaryRowDark)}>
        <div className={styles.orderSummaryLabel}>
          Price
        </div>
        <div className={styles.orderSummaryValue}>
          {
            this.props.priceImpact && <React.Fragment>
              <FormatPercent
                value={this.props.priceImpact}
                fallback="-"
                multiply={true}
              /> Impact &nbsp;&nbsp;&nbsp;&nbsp;
            </React.Fragment>
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
              multiply={true}
            />
          }
        </div>
      </div>
    );
  }

  private interestRate() {
    return (
      <div className={classnames(styles.orderSummaryRow, styles.orderSummaryRowDark)}>
        <div className={styles.orderSummaryLabel}>
          Interest rate (APR)
        </div>
        <div className={styles.orderSummaryValue}>
          {
            this.props.apr && <FormatPercent
              value={this.props.apr}
              fallback="-"
              multiply={false}
            />
          }
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
    const baseTokenAsset = this.props.mta &&
      this.props.mta.state === MTAccountState.setup && (
        this.props.mta.marginableAssets.find(a => a.name === this.props.baseToken) ||
        this.props.mta.nonMarginableAssets.find(a => a.name === this.props.baseToken)
      );

    if (this.props.mta) {
      console.log('this.props.mta.state', this.props.mta);
      console.log('this.props.mta.state', this.props.mta.state);
    }
    return <div className={styles.orderSummaryRow}>
      <div className={styles.orderSummaryLabel}>
        Purchasing power
      </div>
      <div className={styles.orderSummaryValue}>
        {
          baseTokenAsset &&
          <Money
            value={this.props.realPurchasingPower}
            token={this.props.quoteToken}
            fallback="-"
          />
        }
      </div>
    </div>;
  }

  private accountBalance() {
    const baseTokenAsset = findMarginableAsset(this.props.baseToken, this.props.mta);
    return <div className={styles.orderSummaryRow}>
      <div className={styles.orderSummaryLabel}>
        Account Balance
      </div>
      <div className={styles.orderSummaryValue}>
        {
          baseTokenAsset &&
          <Money
            value={baseTokenAsset.balance}
            token={this.props.baseToken}
            fallback="-"
          />
        }
      </div>
    </div>;
  }

  private leverage() {
    return <div className={styles.orderSummaryRow}>
      <div className={styles.orderSummaryLabel}>
        Current Leverage
      </div>
      <div className={styles.orderSummaryValue}>
        {
          this.props.leverage &&
          <React.Fragment>{ formatPrecision(this.props.leverage, 1) }x</React.Fragment>
        }
        {this.props.leveragePost && <React.Fragment>
          <span className={styles.transitionArrow}/>
          {formatPrecision(this.props.leveragePost, 1)}x
        </React.Fragment>
        }
      </div>
    </div>;
  }

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
    <ErrorMessage messages={myMsg} />
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
