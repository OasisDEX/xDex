import { BigNumber } from 'bignumber.js';
import classnames from 'classnames';
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import * as ReactModal from 'react-modal';
import { Observable } from 'rxjs';

import { createNumberMask } from 'text-mask-addons/dist/textMaskAddons';
import { getToken } from '../../blockchain/config';
import { BigNumberInput } from '../../utils/bigNumberInput/BigNumberInput';
import { formatAmount } from '../../utils/formatters/format';
import { FormatAmount, FormatPercent, Money } from '../../utils/formatters/Formatters';
import { Button } from '../../utils/forms/Buttons';
import { InputGroup, InputGroupAddon } from '../../utils/forms/InputGroup';
import { GasCost } from '../../utils/gasCost/GasCost';
import { BorderBox, Hr } from '../../utils/layout/LayoutHelpers';
import { Loadable } from '../../utils/loadable';
import { LoadingIndicator } from '../../utils/loadingIndicator/LoadingIndicator';
import { ModalProps } from '../../utils/modal';
import { Panel, PanelBody, PanelFooter, PanelHeader } from '../../utils/panel/Panel';
import { Muted } from '../../utils/text/Text';
import { TransactionStateDescription } from '../../utils/text/TransactionStateDescription';
import { minusOne, zero } from '../../utils/zero';
import { AllocationRequestPilot } from './allocate';
import { DebtSlider } from './DebtSlider';
import {
  AllocateChangeKind,
  EditableDebt,
  Message,
  MessageKind,
  MTAllocateState
} from './mtOrderAllocateDebtForm';
import * as styles from './mtOrderAllocateDebtFormView.scss';

export type CreateMTAllocateForm$ =
  (proxy: any, request: AllocationRequestPilot) => Observable<MTAllocateState>;

export interface CreateMTAllocateForm$Props {
  createMTAllocateForm$: CreateMTAllocateForm$;
}

function createAllocateFormView<P>(
    AllocateHeader: React.ComponentType,
    AllocateForm: React.ComponentType<P & MTAllocateState>,
    AllocateExtraButtons: React.ComponentType<MTAllocateState>,
    ProgressHeader: React.ComponentType,
    ProgressForm: React.ComponentType<P & MTAllocateState>,
    ProgressExtraButtons: React.ComponentType<MTAllocateState>,
) : React.ComponentType<P & Loadable<MTAllocateState> & ModalProps> {
  return class extends React.Component<P & Loadable<MTAllocateState> & ModalProps> {
    public formProps(): P & MTAllocateState {
      return {  ...this.props as any, ...this.props.value as any };
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
        <Panel style={{ width: '454px' }} className={styles.modalChild}>
          <PanelHeader bordered={true}>
            {this.props.value && this.props.value.progress ? <ProgressHeader/> : <AllocateHeader/>}
          </PanelHeader>
          <PanelBody scrollable={true}
                     paddingVertical={true}
                     style={{ height: '460px' }}>
            { this.props.status === 'loaded' ?
              (this.props.value && this.props.value.progress ?
                <ProgressForm {...this.formProps()}/> : <AllocateForm {...this.formProps()}/>) :
              <LoadingIndicator />
            }

          </PanelBody>
          <PanelFooter className={styles.buttons}>
            <Button
                size="md"
                onClick={this.props.close}
                className={styles.button}
            >
              Close
            </Button>
            {this.props.status === 'loaded' &&
            (this.props.value && this.props.value.progress ?
                // @ts-ignore
                <ProgressExtraButtons {...this.props.value}/> :
                // @ts-ignore
                <AllocateExtraButtons {...this.props.value}/>)
            }
          </PanelFooter>
        </Panel>
        { this.props.value && <DevInfos value={this.props.value as MTAllocateState}/>}
      </ReactModal>);
    }
  };
}

const DevInfos = ({ value }: { value: MTAllocateState }) => (
  <div style={{ position: 'absolute', top: '1em', right: '1em' }}>
    <h3>Internals:</h3>
    daiBalance after the trade:
    { value.targetDaiBalance.toString() }
    <br />
    daiBalance before the trade:
    { value.initialDaiBalance.toString() }
    <br />
    current daiBalance:
    { value.daiBalance.toString() }
    <br/>
    daiBalance diff:
    { value.diffDaiBalance.toString()}
    <br />
    daiBalance delta:
    { value.daiBalance.minus(value.initialDaiBalance).toString()}
    <br />
    Plan:
    { value.plan &&
    <pre>{JSON.stringify(value.plan, null, 4)}</pre>}
  </div>
);

export interface OrderAllocateFormProps {
  amount: BigNumber;
  price: BigNumber;
  total: BigNumber;
  baseToken: string;
}

export interface TransferAllocateFormProps {
  amount: BigNumber;
  token: string;
}

class BuyAllocateForm extends React.Component<OrderAllocateFormProps & MTAllocateState> {

  public render() {
    return (
      <React.Fragment>
        <BuyOrderSummary {...this.props} />
        <Hr color="dark" className={styles.hrMargin} />
        <Cash {...this.props} reversed={true} maxCashBalance={this.props.cashBalance} />
        { this.props.debts.map((debt) => (
          <MarginableEditable
            key={debt.name}
            debt={debt}
            {...this.props }/>)) }
      </React.Fragment>
    );
  }
}

class SellAllocateForm extends React.Component<OrderAllocateFormProps & MTAllocateState> {

  public render() {
    return (
      <React.Fragment>
        <SellOrderSummary {...this.props} />
        <Hr color="dark" className={styles.hrMargin} />
        <Cash {...this.props} reversed={false}
              maxCashBalance={this.props.cashBalance.plus(this.props.total) }/>
        { this.props.debts.map((debt) => (
          <MarginableEditable
            key={debt.name}
            debt={debt}
            {...this.props }/>)) }
      </React.Fragment>
    );
  }
}

class FundAllocateForm extends React.Component<TransferAllocateFormProps & MTAllocateState> {

  public render() {
    const maxCashBalance = this.props.token === 'DAI' ?
      this.props.cashBalance.plus(this.props.amount) : this.props.cashBalance;
    return (
      <React.Fragment>
        <FundOrderSummary {...this.props} />
        <Hr color="dark" className={styles.hrMargin} />
        <Cash {...this.props} reversed={false}
              maxCashBalance={maxCashBalance}/>
        { this.props.debts.map((debt) => (
          <MarginableEditable
            key={debt.name}
            debt={debt}
            {...this.props }/>)) }
      </React.Fragment>
    );
  }
}

class DrawAllocateForm extends React.Component<TransferAllocateFormProps & MTAllocateState> {

  public render() {
    return (
      <React.Fragment>
        <DrawOrderSummary {...this.props} />
        <Hr color="dark" className={styles.hrMargin} />
        <Cash {...this.props} reversed={false}
              maxCashBalance={this.props.cashBalance}/>
        { this.props.debts.map((debt) => (
          <MarginableEditable
            key={debt.name}
            debt={debt}
            {...this.props }/>)) }
      </React.Fragment>
    );
  }
}

class ReallocateForm extends React.Component<MTAllocateState> {

  public render() {
    return (
      <React.Fragment>
        <ReallocateTopSummary {...this.props} />
        <Hr color="dark" className={styles.hrMargin} />
        <Cash {...this.props} reversed={false} maxCashBalance={this.props.cashBalance} />
        { this.props.debts.map((debt) => (
          <MarginableEditable
            key={debt.name}
            debt={debt}
            {...this.props }/>)) }
      </React.Fragment>
    );
  }
}

class BuyOrderSummary  extends React.Component<OrderAllocateFormProps & MTAllocateState> {
  public render() {
    return (
      <OrderSummary {...this.props}
                    deltaDaiBalanceToShow={this.props.deltaDaiBalance.multipliedBy(minusOne)}
      />
    );
  }
}

class SellOrderSummary  extends React.Component<OrderAllocateFormProps & MTAllocateState> {
  public render() {
    return (
      <OrderSummary {...this.props} deltaDaiBalanceToShow={this.props.deltaDaiBalance} />
    );
  }
}

class OrderSummary extends React.Component<
  { deltaDaiBalanceToShow: BigNumber } & OrderAllocateFormProps & MTAllocateState> {
  public render() {
    const daiAllocatedError = this.props.messages
        .find(msg => msg.kind === MessageKind.totalCashAllocatedToBig);
    // const remainingDaiBalance = loaded.diffDaiBalance.times(this.useReversed() ? minusOne : one);
    return (
        <div>
          <div className={styles.dict}>
            <Muted className={styles.dictName}>Price</Muted>
            <Money
                className={classnames(styles.dictDescription, styles.dictDescriptionMainFont)}
                value={this.props.price}
                token="DAI"/>
          </div>
          <div className={styles.dict}>
            <Muted className={styles.dictName}>Volume</Muted>
            <Money
                className={classnames(styles.dictDescription, styles.dictDescriptionMainFont)}
                value={this.props.amount}
                token={this.props.baseToken}/>
          </div>
          <div className={styles.dict}>
            <Muted className={styles.dictName}>Total</Muted>
            <Money
                className={classnames(styles.dictDescription, styles.dictDescriptionMainFont)}
                value={this.props.total}
                token="DAI"/>
          </div>

          <div className={styles.dict}>
            <Muted className={styles.dictName}>
              {this.props.targetDaiBalance.gt(this.props.initialDaiBalance) ? 'Allocated Dai' :
                  this.props.targetDaiBalance.lt(zero) ? 'Allocated Dai' :
                      'Dai balance'}
            </Muted>
            <Money
                className={classnames(styles.dictDescription, {
                  [styles.daiColor]: !daiAllocatedError,
                  [styles.errorColor]: !!daiAllocatedError
                })}
                title={messageContent(daiAllocatedError)}
                value={this.props.deltaDaiBalanceToShow}
                token="DAI"/>
          </div>
          <GasCostSummary {...this.props} />
        </div>
    );
  }
}

class FundOrderSummary extends React.Component<TransferAllocateFormProps & MTAllocateState> {
  public render() {
    return (
      <TransferOrderSummary label="Fund" {...this.props} />
    );
  }
}

class DrawOrderSummary extends React.Component<TransferAllocateFormProps & MTAllocateState> {
  public render() {
    return (
      <TransferOrderSummary label="Draw" {...this.props} />
    );
  }
}

class TransferOrderSummary extends React.Component<
  { label: string } & TransferAllocateFormProps & MTAllocateState> {
  public render() {
    const daiAllocatedError = this.props.messages
        .find(msg => msg.kind === MessageKind.totalCashAllocatedToBig);
    return (
        <div>
          <div className={styles.dict}>
            <Muted className={styles.dictName}>{this.props.label}</Muted>
            <Money
                className={classnames(styles.dictDescription, styles.dictDescriptionMainFont)}
                value={this.props.amount}
                token={this.props.token}/>
          </div>
          <div className={styles.dict}>
            <Muted className={styles.dictName}>
              {this.props.targetDaiBalance.gt(this.props.initialDaiBalance) ? 'Allocated Dai' :
                  this.props.targetDaiBalance.lt(zero) ? 'Allocated Dai' :
                      'Dai balance'}
            </Muted>
            <Money
                className={classnames(styles.dictDescription, {
                  [styles.daiColor]: !daiAllocatedError,
                  [styles.errorColor]: !!daiAllocatedError
                })}
                title={messageContent(daiAllocatedError)}
                value={this.props.deltaDaiBalance}
                token="DAI"/>
          </div>
          <GasCostSummary {...this.props} />
        </div>
    );
  }
}

class ReallocateTopSummary extends React.Component<MTAllocateState> {
  public render() {
    const daiAllocatedError = this.props.messages
        .find(msg => msg.kind === MessageKind.totalCashAllocatedToBig);
    // const remainingDaiBalance = loaded.diffDaiBalance.times(this.useReversed() ? minusOne : one);
    return (
        <div>
          <div className={styles.dict}>
            <Muted className={styles.dictName}>
              {this.props.targetDaiBalance.gt(this.props.initialDaiBalance) ? 'Allocated Dai' :
                  this.props.targetDaiBalance.lt(zero) ? 'Allocated Dai' :
                      'Dai balance'}
            </Muted>
            <Money
                className={classnames(styles.dictDescription, {
                  [styles.daiColor]: !daiAllocatedError,
                  [styles.errorColor]: !!daiAllocatedError
                })}
                title={messageContent(daiAllocatedError)}
                value={this.props.deltaDaiBalance}
                token="DAI"/>
          </div>
          <GasCostSummary {...this.props} />
        </div>
    );
  }
}

class MarginableEditable extends React.Component<{
  debt: EditableDebt,
} & MTAllocateState> {
  public render() {

    const debt = this.props.debt;
    const message = this.props.messages.find(msg =>
      (msg.kind === MessageKind.debtToBig || msg.kind === MessageKind.debtLowerThanZero)
      && msg.name === this.props.debt.name);

    const currentValue = this.props.debt.targetDebt ?
      this.props.debt.targetDebt.toNumber() : this.props.debt.debt.toNumber();
    const maxAvailable = Math.min(this.props.debt.maxDebt.toNumber(),
                                  currentValue - this.props.diffDaiBalance.toNumber());

    return (
      <div key={debt.name}>
        <Hr color="dark" className={styles.hrMargin} />
        <div className={styles.dict}>
          { getToken(debt.name).iconColor }
          { debt.name }
          <div className={styles.dictDescription}>
            { allocationInput(
              this.handleChange.bind(this),
              debt.delta,
              messageContent(message),
            ) }
          </div>
        </div>
        <DebtSlider
          min={0}
          max={debt.maxDebt.toNumber()}
          originalValue={debt.debt.toNumber()}
          maxAvailable={maxAvailable}
          currentValue={currentValue}
          change={(newValue: number) => this.props.change({
            kind: AllocateChangeKind.debtChange,
            name: debt.name,
            value: new BigNumber(newValue.toFixed(2)),
          })}
        />
        <div className={styles.dict}>
          <Muted className={styles.dictName}>
            Debt before
          </Muted>
          <Money
            className={classnames(styles.dictDescription, styles.dictDescriptionMainFont)}
            value={debt.debt}
            token="DAI" />
        </div>
        <div className={styles.dict}>
          <Muted className={styles.dictName}>
            Actual debt
          </Muted>
          <Money
            className={classnames(styles.dictDescription, styles.dictDescriptionMainFont)}
            value={debt.targetDebt}
            token="DAI" />
        </div>
        <div className={styles.dict}>
          <Muted className={styles.dictName}>
            Max debt
          </Muted>
          <Money
            className={classnames(styles.dictDescription, styles.dictDescriptionMainFont)}
            value={debt.maxDebt}
            token="DAI" />
        </div>
        <div className={styles.dict}>
          <Muted className={styles.dictName}>
            Liquidation price/ratio
          </Muted>
          <div className={styles.dictDescription}>
            <Muted>
              <Money value={debt.liquidationPrice} token="DAI"/>
            </Muted>
            <span className={classnames(styles.dictDescriptionMainFont, styles.spaceLeft)}>
              { debt.currentCollRatio &&
                <FormatPercent value={debt.currentCollRatio} multiply={true} />
              }
            </span>
          </div>
        </div>
      </div>
    );
  }

  private handleChange(e: React.ChangeEvent<HTMLInputElement>): void {
    const value = e.target.value.replace(/,/g, '');
    this.props.change({
      kind: AllocateChangeKind.debtDeltaChange,
      value: new BigNumber(value),
      name: this.props.debt.name
    });
  }
}

class Cash extends React.Component<{
  reversed: boolean,
  maxCashBalance: BigNumber,
} & MTAllocateState> {

  public render() {
    const message = this.props.messages.find(msg => msg.kind === MessageKind.notEnoughCash);
    const currentValue = this.props.targetCash ? this.props.targetCash.toNumber() : 0;
    const cashDelta = this.props.reversed ? this.props.reverseCashDelta : this.props.cashDelta;
    // tslint:disable
    const maxAvailable = this.props.reversed ?
        Math.max(0,
          Math.min(this.props.cashBalance.toNumber(), currentValue + this.props.diffDaiBalance.toNumber())) :
        currentValue + this.props.diffDaiBalance.toNumber();
    const max = this.props.maxCashBalance.toNumber();
    return (
        <div>
          <div className={styles.dict}>
            { getToken('DAI').iconColor }
            DAI
            <div className={styles.dictDescription}>
              {allocationInput(
                  this.handleCashChange.bind(this),
                  cashDelta,
                  messageContent(message),
              )}
            </div>
          </div>
          <DebtSlider
              min={0}
              max={max}
              originalValue={this.props.cashBalance.toNumber()}
              maxAvailable={maxAvailable}
              currentValue={currentValue}
              change={(newValue: number) => this.props.change({
                kind: AllocateChangeKind.targetCashChange,
                value: new BigNumber(newValue.toFixed(2)),
              })}
          />
          <div className={styles.dict}>
            <Muted className={styles.dictName}>Available balance</Muted>
            <Money
                className={classnames(styles.dictDescription, styles.dictDescriptionMainFont)}
                value={this.props.cashBalance}
                token="DAI"/>
          </div>
        </div>
    );
  }

  private handleCashChange(e: React.ChangeEvent<HTMLInputElement>): void {
    const value = e.target.value.replace(/,/g, '');
    const cashChange = this.props.reversed ?
      AllocateChangeKind.reverseCashDeltaChange :
      AllocateChangeKind.cashDeltaChange;
    this.props.change({
        kind: cashChange,
        value: new BigNumber(value)
      });
  }
}

function allocationInput(
    handleAllocationChange: (e: React.ChangeEvent<HTMLInputElement>) => void,
    value: BigNumber | undefined,
    errorMessage: string | undefined,
) {
  let inputField: HTMLElement;
  return (
    <InputGroup sizer="sm"
                className={styles.inputGroup}
                hasError={!!errorMessage}
                title={errorMessage}
    >
      <BigNumberInput
        ref={ (el: any) =>
            inputField = (el && ReactDOM.findDOMNode(el) as HTMLElement) || undefined
        }
        type="text"
        mask={createNumberMask({
          allowNegative: true,
          allowDecimal: true,
          decimalLimit: 5,
          prefix: ''
        })}
        onChange={handleAllocationChange}
        value={ value &&
        formatAmount(value, 'DAI')
        }
        guide={true}
        placeholderChar={' '}
        className={styles.input}
        // disabled={this.props.stage === FormStage.waitingForAllocation}
      />
      <InputGroupAddon
        onClick={() => {
          if (inputField) {
            inputField.focus();
          }
        }}
        className={styles.inputCurrencyAddon}
      >
        DAI
      </InputGroupAddon>
    </InputGroup>
  );
}


class BuyProgressForm extends React.Component<OrderAllocateFormProps & MTAllocateState> {

  public render() {
    return (
      <BorderBox>
        <TransactionStatus {...this.props} />
        <Hr className={styles.hrMargin} />
        <FinalizeCashAndMarginableOrdered {...this.props} />
        <Hr className={styles.hrMargin} />
        <FinalizeBuy {...this.props} />
        <Hr className={styles.hrMargin} />
        <GasCostSummary {...this.props} />
      </BorderBox>
    );
  }
}

class SellProgressForm extends React.Component<OrderAllocateFormProps & MTAllocateState> {

  public render() {
    return (
      <BorderBox>
        <TransactionStatus {...this.props} />
        <Hr className={styles.hrMargin} />
        <FinalizeCashAndMarginableOrdered {...this.props} />
        <Hr className={styles.hrMargin} />
        <FinalizeSell {...this.props} />
        <Hr className={styles.hrMargin} />
        <GasCostSummary {...this.props} />
      </BorderBox>
    );
  }
}

class ReallocateProgressForm extends React.Component<MTAllocateState> {

  public render() {
    return (
      <BorderBox>
        <TransactionStatus {...this.props} />
        <Hr className={styles.hrMargin} />
        <FinalizeCashAndMarginableOrdered {...this.props} />
        {/*<Hr className={styles.hrMargin} />*/}
        {/*<FinalizeSell {...this.props} />*/}
        <Hr className={styles.hrMargin} />
        <GasCostSummary {...this.props} />
      </BorderBox>
    );
  }
}

class FundAllocateProgressForm extends React.Component<TransferAllocateFormProps & MTAllocateState> {

  public render() {
    return (
      <BorderBox className={styles.hideDoubleHr}>
        <TransactionStatus {...this.props} />
        <Hr className={styles.hrMargin} />
        <FinalizeCash {...this.props} />
        <FinalizeCashAndMarginableOrdered {...this.props} />
        <Hr className={styles.hrMargin} />
        <FinalizeFund {...this.props} />
        <Hr className={styles.hrMargin} />
        <GasCostSummary {...this.props} />
      </BorderBox>
    );
  }
}

class DrawAllocateProgressForm extends React.Component<TransferAllocateFormProps & MTAllocateState> {

  public render() {
    return (
      <BorderBox className={styles.hideDoubleHr}>
        <TransactionStatus {...this.props} />
        <Hr className={styles.hrMargin} />
        <FinalizeCashAndMarginableOrdered {...this.props} />
        <Hr className={styles.hrMargin} />
        <FinalizeDraw {...this.props} />
        <Hr className={styles.hrMargin} />
        <GasCostSummary {...this.props} />
      </BorderBox>
    );
  }
}

class FinalizeCashAndMarginableOrdered extends React.Component<MTAllocateState> {
  public render() {
    const cashPositive = this.props.cashDelta && this.props.cashDelta.lt(zero);
    return (
      <React.Fragment>
        { cashPositive && <FinalizeCash {...this.props} /> }
        { this.props.debts
          .filter(debt => debt.delta && debt.delta.gt(zero))
          .map((debt) =>
            (<FinalizeMarginable debt={debt} key={debt.name} />)
          )
        }
        { !cashPositive && <FinalizeCash {...this.props} /> }
        { this.props.debts
          .filter(debt => debt.delta && debt.delta.lt(zero))
          .map((debt) =>
            (<FinalizeMarginable debt={debt} key={debt.name} />)
          )
        }
      </React.Fragment>
    );
  }
}
class FinalizeCash extends React.Component<MTAllocateState> {
  public render() {
    const cashDelta = this.props.cashDelta;
    if (cashDelta === undefined || cashDelta.eq(0)) {
      return null;
    }
    const verb = cashDelta.gt(0) ? 'Get' : 'Spend';
    return (
      <div className={styles.dict}>
        { getToken('DAI').iconColor }
        <span className={styles.dictName}>{verb}</span>
        <Money value={cashDelta.abs()} token="DAI" className={styles.spaceLeft}/>
      </div>
    );
  }
}

class FinalizeMarginable extends React.Component<{ debt: EditableDebt }>{
  public render() {
    const debt = this.props.debt;

    const effectiveDebt = debt.delta ? debt.delta : zero;
    if (effectiveDebt.isEqualTo('0')) {
      return null;
    }
    const verb = effectiveDebt.gt(0) ? 'Generate' : 'Pay off';
    const particle = effectiveDebt.gt(0) ? 'from' : 'to';
    return (
      <div key={debt.name} className={classnames(styles.dict, styles.finalizeMarginable)}>
        { getToken(debt.name).iconColor }
        <div>
          <div className={styles.tokenDescriptionLine}>
            <span className={styles.dictName}>
              {verb}
            </span>
            <Money value={effectiveDebt.abs()} token="DAI" className={styles.spaceLeft} />
            <span className={classnames(styles.dictName, styles.spaceLeft)}>
              {particle} { debt.name }
            </span>
          </div>
          <div className={styles.superSmallFont}>
            <Muted>Liquidation price/ratio</Muted>
            <Money value={debt.liquidationPrice} token="DAI"
                   className={classnames(styles.green, styles.spaceLeft)}
            />
            <span className={classnames(styles.green, styles.spaceLeft)}>
              { debt.currentCollRatio &&
                <FormatPercent value={debt.currentCollRatio} multiply={true} />
              }
            </span>
          </div>
        </div>
      </div>
    );
  }
}

class FinalizeBuy extends React.Component<OrderAllocateFormProps> {
  public render() {
    return (
      <div>
        <div className={styles.dict}>
          { getToken('DAI').iconColor }
          <span className={styles.dictName}>Sell</span>
          <Money value={this.props.total} token="DAI" className={styles.spaceLeft}/>
          <span className={classnames(styles.dictName, styles.spaceLeft)}>at</span>
          <FormatAmount value={this.props.price} token="DAI" className={styles.spaceLeft}/>
          <span className={classnames(styles.spaceLeft)}>
          DAI/{this.props.baseToken}
        </span>
        </div>
        <div className={styles.dict}>
          { getToken(this.props.baseToken).iconColor }
          <span className={styles.dictName}>Buy</span>
          <Money value={this.props.amount}
                 token={this.props.baseToken}
                 className={styles.spaceLeft}/>
        </div>
      </div>
    );
  }
}

class FinalizeSell extends React.Component<OrderAllocateFormProps> {
  public render() {
    return (
      <div>
        <div className={styles.dict}>
          { getToken(this.props.baseToken).iconColor }
          <span className={styles.dictName}>Sell</span>
          <Money value={this.props.amount}
                 token={this.props.baseToken}
                 className={styles.spaceLeft}/>
          <span className={classnames(styles.dictName, styles.spaceLeft)}>at</span>
          <FormatAmount value={this.props.price} token="DAI" className={styles.spaceLeft}/>
          <span className={classnames(styles.spaceLeft)}>
          DAI/{this.props.baseToken}
        </span>
        </div>
        <div className={styles.dict}>
          { getToken('DAI').iconColor }
          <span className={styles.dictName}>Buy</span>
          <Money value={this.props.total} token="DAI" className={styles.spaceLeft}/>
        </div>
      </div>
    );
  }
}

class FinalizeFund extends React.Component<TransferAllocateFormProps> {
  public render() {
    return (
      <div>
        <div className={styles.dict}>
          { getToken(this.props.token).iconColor }
          <span className={styles.dictName}>Fund</span>
          <Money value={this.props.amount} token={this.props.token} className={styles.spaceLeft}/>
        </div>
      </div>
    );
  }
}

class FinalizeDraw extends React.Component<TransferAllocateFormProps> {
  public render() {
    return (
      <div>
        <div className={styles.dict}>
          { getToken(this.props.token).iconColor }
          <span className={styles.dictName}>Draw</span>
          <Money value={this.props.amount} token={this.props.token} className={styles.spaceLeft}/>
        </div>
      </div>
    );
  }
}

class TransactionStatus extends React.Component<MTAllocateState> {
  public render() {
    return (
      <div className={styles.dict}>
        <span className={styles.dictName}>
          Create position
        </span>
        <span className={styles.dictDescription}>
        <TransactionStateDescription progress={this.props.progress} />
      </span>
      </div>
    );
  }
}

class GasCostSummary extends React.Component<MTAllocateState> {
  public render() {
    return (
      <div className={styles.dict} style={{ marginBottom: 0 }}>
        <Muted className={styles.dictName}>
          Gas cost
        </Muted>
        <span className={styles.dictDescription}>
          <GasCost gasEstimationStatus={this.props.gasEstimationStatus}
               gasEstimationEth={this.props.gasEstimationEth}
               gasEstimationUsd={this.props.gasEstimationUsd}
               gasPrice={this.props.gasPrice}
          />
        </span>
      </div>
    );
  }
}

class AllocateButtons extends React.Component<MTAllocateState> {
  public render() {
    const proceedEnabled = this.props.readyToProceed && !this.props.progress;
    return(
      <React.Fragment>
        <Button
          size="md"
          onClick={this.handleAutoAllocate}
          className={styles.button}
        >
          Auto allocate
        </Button>
        <Button
          size="md"
          disabled={!proceedEnabled}
          onClick={this.handleProceed}
          className={styles.button}
        >
          Proceed
        </Button>
      </React.Fragment>);
  }

  private handleProceed = () => {
    this.props.submit(this.props!);
  };

  private handleAutoAllocate = () => {
    this.props.autoAllocate(this.props!);
  }
}

class ProgressButtons extends React.Component<MTAllocateState> {
  public render() {
    return null;
  }
}

class BuyAllocateHeader extends React.Component {
  public render() {
    return <span>Allocate debt - buy</span>;
  }
}

class SellAllocateHeader extends React.Component {
  public render() {
    return <span>Allocate debt - sell</span>;
  }
}

class ReallocateHeader extends React.Component {
  public render() {
    return <span>Rellocate debt</span>;
  }
}

class FundAllocateHeader extends React.Component {
  public render() {
    return <span>Fund</span>;
  }
}

class DrawAllocateHeader extends React.Component {
  public render() {
    return <span>Draw</span>;
  }
}

class ProgressDefaultHeader extends React.Component {
  public render() {
    return <span>Finalize transaction</span>;
  }
}

function messageContent(msg?: Message): string | undefined {
  if (msg === undefined) {
    return undefined;
  }

  switch (msg.kind) {
    case MessageKind.notEnoughCash:
      return `You don't have enough cash`;
    case MessageKind.debtToBig:
      return `You don't have enough ${msg.name}`;
    case MessageKind.debtLowerThanZero:
      return `You wan't to reduce too much debt on ${msg.name}`;
    case MessageKind.totalCashAllocatedToBig:
      return `You allocated too much DAI`;
    case MessageKind.impossibleToPlan:
      return `Sorry, it's impossible to plan this operation`;
  }
}

export const BuyAllocateFormView = createAllocateFormView(
    BuyAllocateHeader, BuyAllocateForm, AllocateButtons,
    ProgressDefaultHeader, BuyProgressForm, ProgressButtons
);

export const SellAllocateFormView = createAllocateFormView(
    SellAllocateHeader, SellAllocateForm, AllocateButtons,
    ProgressDefaultHeader, SellProgressForm, ProgressButtons
);

export const ReallocateFormView = createAllocateFormView<{}>(
    ReallocateHeader, ReallocateForm, AllocateButtons,
    ProgressDefaultHeader, ReallocateProgressForm, ProgressButtons
);

export const FundAllocateFormView = createAllocateFormView(
    FundAllocateHeader, FundAllocateForm, AllocateButtons,
    ProgressDefaultHeader, FundAllocateProgressForm, ProgressButtons
);

export const DrawAllocateFormView = createAllocateFormView(
    DrawAllocateHeader, DrawAllocateForm, AllocateButtons,
    ProgressDefaultHeader, DrawAllocateProgressForm, ProgressButtons
);
