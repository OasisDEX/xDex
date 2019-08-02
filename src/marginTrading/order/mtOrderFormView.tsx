import { BigNumber } from 'bignumber.js';
import classnames from 'classnames';
import * as React from 'react';
import { createNumberMask } from 'text-mask-addons/dist/textMaskAddons';

import * as ReactDOM from 'react-dom';
import { tokens } from '../../blockchain/config';
import { BigNumberInput } from '../../utils/bigNumberInput/BigNumberInput';
import { formatAmount, formatPrice } from '../../utils/formatters/format';
import { FormatAmount } from '../../utils/formatters/Formatters';
import { Button, ButtonGroup } from '../../utils/forms/Buttons';
import { ErrorMessage } from '../../utils/forms/ErrorMessage';
import { InputGroup, InputGroupAddon } from '../../utils/forms/InputGroup';
import { Currency, Muted } from '../../utils/text/Text';

import { Observable } from 'rxjs';
import { OfferType } from '../../exchange/orderbook/orderbook';
import { connect } from '../../utils/connect';
import { FormChangeKind } from '../../utils/form';
import { isImpossible } from '../../utils/impossible';
import { inject } from '../../utils/inject';
import { BorderBox, Hr } from '../../utils/layout/LayoutHelpers';
import { Loadable, loadablifyLight } from '../../utils/loadable';
import { ModalOpenerProps, ModalProps } from '../../utils/modal';
import { PanelBody, PanelHeader } from '../../utils/panel/Panel';
import { AllocationRequestPilot } from '../allocate/allocate';
import { MTAllocateState } from '../allocate/mtOrderAllocateDebtForm';
import {
  BuyAllocateFormView, OrderAllocateFormProps,
  SellAllocateFormView
} from '../allocate/mtOrderAllocateDebtFormView';
import { findAsset, MTAccountState } from '../state/mtAccount';
import { FormStage, Message, MessageKind, MTFormState } from './mtOrderForm';
import * as styles from './mtOrderFormView.scss';

export type CreateMTAllocateForm$ =
  (proxy: any, request: AllocationRequestPilot) => Observable<MTAllocateState>;

export interface CreateMTAllocateForm$Props {
  createMTAllocateForm$: CreateMTAllocateForm$;
}

export class MtOrderFormView
  extends React.Component<MTFormState & ModalOpenerProps & CreateMTAllocateForm$Props>
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
      !this.props.allocationRequest ||
      isImpossible(this.props.allocationRequest) ||
      !this.props.mta ||
      this.props.mta.state === MTAccountState.notSetup ||
      !this.props.amount ||
      !this.props.price ||
      !this.props.total
    ) {
      return;
    }

    const allocate$ = this.props.createMTAllocateForm$(
      this.props.mta.proxy,
      this.props.allocationRequest);
    const orderFormProps: OrderAllocateFormProps = {
      amount: this.props.amount,
      price: this.props.price,
      total: this.props.total,
      baseToken: this.props.baseToken
    };

    const view = this.props.kind === OfferType.buy ? BuyAllocateFormView : SellAllocateFormView;
    const MTOrderAllocateDebtViewRxTx =
      connect<Loadable<MTAllocateState>, ModalProps>(
        inject(view, orderFormProps),
        loadablifyLight(allocate$)
      );

    this.props.open(MTOrderAllocateDebtViewRxTx);

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
      <div>
        <PanelHeader>
          Create position
          { this.headerButtons() }
        </PanelHeader>
        <PanelBody>
          <form onSubmit={this.handleProceed}>
            { this.orderType() }
            { this.balanceButtons() }
            { this.purchasingPower() }
            { this.amount() }
            { this.price() }

            <Hr className={styles.hrMargin}/>

            {/*{ this.gasCost() }*/}
            { this.total() }

            { this.proceedButton() }
          </form>
        </PanelBody>
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

  private balanceButtons() {
    const baseTokenAsset = findAsset(this.props.baseToken, this.props.mta);
    const quoteTokenAsset = findAsset(this.props.quoteToken, this.props.mta);
    return (
      <div className={classnames(styles.flexContainer, styles.marginBottom)}>
        <Button
          type="button"
          onClick={this.handleSetMax}
          size="lg"
          block={true}
          disabled={this.props.kind === 'buy'}
          className={styles.balanceBtn}
        >
          { this.props.baseToken && <BalanceIcon token={this.props.baseToken} />}
          <span style={{ lineHeight: 1 }}>
                    { baseTokenAsset &&
                    formatAmount(baseTokenAsset.balance, this.props.baseToken)
                    } <Currency value={this.props.baseToken} />
                  </span>
        </Button>
        <Button
          type="button"
          onClick={this.handleSetMax}
          size="lg"
          block={true}
          disabled={this.props.kind === 'sell'}
          className={styles.balanceBtn}
        >
          { this.props.quoteToken && <BalanceIcon token={this.props.quoteToken} />}
          <span style={{ lineHeight: 1 }}>
                    { quoteTokenAsset &&
                    formatAmount(quoteTokenAsset.balance, this.props.quoteToken)
                    } <Currency value={this.props.quoteToken} />
                  </span>
        </Button>
      </div>
    );
  }

  private orderType() {
    return (
      <BorderBox className={classnames(styles.lg,
                                       styles.orderType,
                                       styles.marginBottom)}
        padding="sm"
      >
        <span>Fill or kill</span>
      </BorderBox>
    );
  }

  private purchasingPower() {
    const baseTokenAsset = this.props.mta &&
      this.props.mta.state === MTAccountState.setup && (
        this.props.mta.marginableAssets.find(a => a.name === this.props.baseToken) ||
        this.props.mta.nonMarginableAssets.find(a => a.name === this.props.baseToken)
      );
    return <BorderBox className={classnames(styles.flexContainer,
                                            styles.lg,
                                            styles.marginBottom)}
      padding="sm"
    >
      <span className={styles.purchasingPowerTitle}>Purchasing power</span>
      <span className={styles.purchasingPowerAmount}>
        { baseTokenAsset &&
        formatAmount(baseTokenAsset.purchasingPower, this.props.quoteToken)
        }
        ({ this.props.realPurchasingPower &&
          formatAmount(this.props.realPurchasingPower, this.props.quoteToken)
        })
        <Currency value={this.props.quoteToken} />
      </span>
    </BorderBox>;
  }

  private amount() {
    return (
      <div>
        { this.amountGroup() }
        <Error field="amount" messages={this.props.messages} />
      </div>
    );
  }

  private price() {
    return (
      <div>
        { this.priceGroup() }
        <Error field="price" messages={this.props.messages} />
      </div>
    );
  }

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
        <div className={styles.flexContainer}>
          <span><Muted>Total</Muted></span>
          <span>
                {this.props.total && <FormatAmount
                  value={this.props.total} token={this.props.quoteToken}
                />}
            &#x20;
            {this.props.quoteToken}
          </span>
        </div>
        <Error field="total" messages={this.props.messages} />
      </div>
    );
  }

  private proceedButton() {
    return (
      <Button
      className={styles.confirmButton}
      type="submit"
      value="submit"
      color={this.props.kind === OfferType.buy ? 'green' : 'red' }
      disabled={this.props.stage !== FormStage.readyToAllocate}
      >
      {this.props.kind} {this.props.baseToken}
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
          disabled={this.props.stage === FormStage.waitingForAllocation}
        />
        <InputGroupAddon className={styles.inputCurrencyAddon} onClick={ this.handleAmountFocus }>
          {this.props.baseToken}
        </InputGroupAddon>

      </InputGroup>
    );
  }

  private priceGroup() {
    return (
      <InputGroup hasError={ (this.props.messages || [])
          .filter((message: Message) => message.field === 'price')
          .length > 0}>
        <InputGroupAddon border="right" className={styles.inputHeader}>Price</InputGroupAddon>
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
            formatPrice(this.props.price as BigNumber, this.props.quoteToken)
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
    );
  }

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

const BalanceIcon = ({ token }: { token: string }) => {
  return tokens[token].icon;
};
