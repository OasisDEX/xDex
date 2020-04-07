import { BigNumber } from 'bignumber.js';
import classnames from 'classnames';
import React, { useContext } from 'react';
import * as ReactDOM from 'react-dom';
import * as ReactModal from 'react-modal';

import { theAppContext } from 'src/AppContext';
import { useObservable } from 'src/utils/observableHook';
import { createNumberMask } from 'text-mask-addons/dist/textMaskAddons';
import { getToken } from '../blockchain/config';
import { BigNumberInput } from '../utils/bigNumberInput/BigNumberInput';
import { AmountFieldChange, FormChangeKind } from '../utils/form';
import { formatAmount } from '../utils/formatters/format';
import { Money } from '../utils/formatters/Formatters';
import { Button } from '../utils/forms/Buttons';
import { ErrorMessage } from '../utils/forms/ErrorMessage';
import { InputGroup, InputGroupAddon } from '../utils/forms/InputGroup';
import { GasCost } from '../utils/gasCost/GasCost';
import { InfoIcon } from '../utils/icons/Icons';
import { BorderBox, Hr } from '../utils/layout/LayoutHelpers';
import { loadablifyLight } from '../utils/loadable';
import { WithLoadingIndicator } from '../utils/loadingIndicator/LoadingIndicator';
import { ModalProps } from '../utils/modal';
import { Panel, PanelBody, PanelFooter, PanelHeader } from '../utils/panel/Panel';
import { Muted } from '../utils/text/Text';
import { TransactionStateDescription } from '../utils/text/TransactionStateDescription';
import { Message, MessageKind, WrapUnwrapFormKind, WrapUnwrapFormState } from './wrapUnwrapForm';
import * as styles from './WrapUnwrapFormView.scss';

type WrapUnwrapFormProps = { kind: WrapUnwrapFormKind } & ModalProps;

export const WrapUnwrapFormView = ({ kind, close }: WrapUnwrapFormProps) => {
  const { wrapUnwrapForm$ } = useContext(theAppContext);
  const loadableState = useObservable(loadablifyLight(wrapUnwrapForm$(kind)));

  let amountInput: HTMLElement | undefined;

  const handleAmountFocus = () => {
    if (amountInput) {
      amountInput.focus();
    }
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/,/g, '');
    loadableState?.value!.change({
      kind: FormChangeKind.amountFieldChange,
      value: value === '' ? null : new BigNumber(value)
    } as AmountFieldChange);
  };

  const summary = (state: WrapUnwrapFormState) => {
    return <> {
      (state.kind === WrapUnwrapFormKind.wrap || state.kind === WrapUnwrapFormKind.unwrap) &&
      (
        <div className={styles.summary}>
          <div className={classnames(styles.infoRow, styles.infoRowMargin)}>
            <Muted>Wallet</Muted>
            <Money token="ETH" value={state.ethBalance} fallback="-" />
          </div>
          <div className={classnames(styles.infoRow, styles.infoRowMargin)}>
            <Muted>Wrapped</Muted>
            <Money token="WETH" value={state.wethBalance} fallback="-" />
          </div>
        </div>
      )
    }
    </>;
  };

  const formOrTransactionState = (state: WrapUnwrapFormState) => {
    return state.progress ? transactionState(state) : form(state);
  };

  const transactionState = (state: WrapUnwrapFormState) => {
    const currentAmount = state.amount || new BigNumber(0);
    return (
      <BorderBox>
        <div className={styles.checklistLine} >
          <span className={styles.checklistTitle}>
            {state.kind === WrapUnwrapFormKind.wrap && 'Wrap Ether'}
            {state.kind === WrapUnwrapFormKind.unwrap && 'Unwrap Ether'}
          </span>
          <div className={styles.checklistSummary}>
            <TransactionStateDescription progress={state.progress}/>
          </div>
        </div>
        <Hr color="dark" className={styles.checklistHrMargin} />
        <div className={styles.checklistLine} >
          <span className={styles.checklistTitle}>Amount</span>
          <Muted className={styles.checklistSummary}>
            {
              [WrapUnwrapFormKind.unwrap, WrapUnwrapFormKind.wrap]
              .includes(state.kind)
              && <Money value={currentAmount} token="ETH" />
            }
          </Muted>
        </div>
        <Hr color="dark" className={styles.checklistHrMargin} />
        <div className={styles.checklistLine} >
          <span className={styles.checklistTitle}>Gas cost</span>
          <Muted className={styles.checklistSummary}>
            <GasCost gasEstimationStatus={state.gasEstimationStatus}
                     gasEstimationUsd={state.gasEstimationUsd}
                     gasEstimationEth={state.gasEstimationEth}
            />
          </Muted>
        </div>
      </BorderBox>
    );
  };

  const form = (state: WrapUnwrapFormState) => {
    return (
      <div>
        <div className={classnames(styles.warning, styles.infoRowMargin)}>
          <div className={styles.warningIcon}><InfoIcon /></div>
          <Muted className={styles.warningText}>{info(state.kind)}</Muted>
        </div>
        { amount(state) }
        <div className={classnames(styles.infoRow)}>
          <Muted>Gas cost</Muted>
          <GasCost {...state} />
        </div>
      </div>
    );
  };

  const info = (formKind: WrapUnwrapFormKind) => {
    switch (formKind) {
      case WrapUnwrapFormKind.wrap:
        return 'Wrapped Ether (WETH) is a tradeable version of regular Ether. ' +
          'Be sure to keep some Ether to pay for transactions';
      case WrapUnwrapFormKind.unwrap:
        return 'You can unwrap your Wrapped Ether (WETH) back to ETH anytime. ' +
          'Any WETH you convert back to ETH will no longer be usable on Oasis Trade';
      default: return '';
    }
  };

  const amount = (state: WrapUnwrapFormState) => {
    const errorMessages = (state.messages || []).map(messageContent);
    return (
      <div>
        <InputGroup hasError={ (state.messages || []).length > 0}>
          <InputGroupAddon className={styles.inputHeader}>
            Amount
          </InputGroupAddon>
          <div className={styles.inputTail}>
            <BigNumberInput
              data-test-id="type-amount"
              ref={(el: any) =>
                amountInput = (el && ReactDOM.findDOMNode(el) as HTMLElement) || undefined
              }
              type="text"
              mask={createNumberMask({
                allowDecimal: true,
                decimalLimit: getToken('ETH').digits,
                prefix: ''
              })}
              onChange={handleAmountChange}
              value={
                (state.amount || null) &&
                formatAmount(state.amount as BigNumber, 'ETH')
              }
              guide={true}
              placeholder={'0'}
              disabled={state.progress !== undefined}
            />
            <InputGroupAddon
              className={styles.inputCurrencyAddon}
              onClick={handleAmountFocus}
            >
              {(kind === WrapUnwrapFormKind.wrap && 'ETH')}
              {(kind === WrapUnwrapFormKind.unwrap && 'WETH')}
            </InputGroupAddon>
          </div>
        </InputGroup>

        <ErrorMessage data-test-id="error-msg" messages={errorMessages} />

      </div>
    );
  };

  const messageContent = (msg: Message) => {
    switch (msg.kind) {
      case MessageKind.insufficientAmount:
        return `Your ${msg.token} balance is too low`;
      case MessageKind.dustAmount:
        return `Amount is too low`;
      case MessageKind.cannotPayForGas:
        return `You will not be able to pay the gas cost`;
    }
  };

  const footerWithButtons = (state: WrapUnwrapFormState) => {
    return (
      <PanelFooter className={styles.buttons}>
        <Button
          onClick={close}
          size="md"
          color="dangerOutlined"
        >
          Close
        </Button>
        <Button
          data-test-id="proceed"
          disabled={!state.readyToProceed || state.progress !== undefined}
          onClick={() => state.proceed(state)}
          size="md"
          color="secondaryOutlined"
        >
          Proceed
        </Button>
      </PanelFooter>
    );
  };

  if (!loadableState) return null;

  return <ReactModal
      ariaHideApp={false}
      isOpen={true}
      className={styles.modal}
      overlayClassName={styles.modalOverlay}
      closeTimeoutMS={250}
    >
      <Panel className={classnames(styles.panel, styles.modalChild)}
             onClick={event => event.stopPropagation()}>
        <PanelHeader bordered={true}>
          <div>
            {kind === WrapUnwrapFormKind.wrap && 'Wrap Ether'}
            {kind === WrapUnwrapFormKind.unwrap && 'Unwrap Ether'}
          </div>
        </PanelHeader>
        <WithLoadingIndicator loadable={loadableState}>
        { state =>
          (<React.Fragment>
            <PanelBody className={styles.panelBody}>
              { summary(state) }
              <Hr color="light" className={styles.hrMargin}/>
              {formOrTransactionState(state)}
            </PanelBody>
            { footerWithButtons(state)}
          </React.Fragment>)
        }
        </WithLoadingIndicator>
      </Panel>
    </ReactModal>;
};
