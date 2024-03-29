/*
 * Copyright (C) 2020 Maker Ecosystem Growth Holdings, INC.
 */

import * as classnames from 'classnames';
import React, { useContext, useState } from 'react';
import * as ReactModal from 'react-modal';
import { Observable } from 'rxjs';
import { theAppContext } from '../AppContext';
import { Button, CloseButton } from '../utils/forms/Buttons';
import { Loadable } from '../utils/loadable';
import { LoadingIndicator, WithLoadingIndicator } from '../utils/loadingIndicator/LoadingIndicator';
import { ModalProps } from '../utils/modal';
import { useModal } from '../utils/modalHook';
import { useObservable } from '../utils/observableHook';
import { Omit } from '../utils/omit';
import { Panel, PanelBody, PanelFooter, PanelHeader } from '../utils/panel/Panel';
import { TopRightCorner } from '../utils/panel/TopRightCorner';

import { ExchangeMigrationStatus, ExchangeMigrationTxKind } from './migration';

import { BigNumber } from 'bignumber.js';
import { curry } from 'ramda';
import { default as MediaQuery } from 'react-responsive';
import { createNumberMask } from 'text-mask-addons/dist/textMaskAddons';
import { getToken, isDAIEnabled } from '../blockchain/config';
import { TradeStatus, TradeWithStatus } from '../exchange/myTrades/openTrades';
import accountSvg from '../icons/account.svg';
import doneSvg from '../icons/done.svg';
import tickSvg from '../icons/tick.svg';
import { TradeData } from '../instant/details/TradeData';
import { TxStatusRow } from '../instant/details/TxStatusRow';
import { ProgressReport, Report } from '../instant/progress/ProgressReport';
import { BigNumberInput } from '../utils/bigNumberInput/BigNumberInput';
import { AmountFieldChange, FormChangeKind } from '../utils/form';
import { formatAmount } from '../utils/formatters/format';
import { Money } from '../utils/formatters/Formatters';
import { ErrorMessage } from '../utils/forms/ErrorMessage';
import { InputGroup, InputGroupAddon } from '../utils/forms/InputGroup';
import { SvgImage } from '../utils/icons/utils';
import { Scrollbar } from '../utils/Scrollbar/Scrollbar';
import { RowClickable, Table } from '../utils/table/Table';
import { SellBuySpan } from '../utils/text/Text';
import { WarningTooltipType } from '../utils/tooltip/Tooltip';
import { zero } from '../utils/zero';
import { CallForAction } from './CallForAction';
import * as styles from './Migration.scss';
import { Message, MessageKind, MigrationFormKind, MigrationFormState } from './migrationForm';

export interface MigrationButtonProps {
  label: string;
  migration$: Observable<Loadable<MigrationFormState>>;
  className?: string;
  tid?: string;
}

// TODO: Probably extract all Tooltip Definitions in a separate file.

// tslint:disable
const proxyTooltip = {
  id: 'proxy-tooltip',
  text: 'Proxy is a supporting contract owned by you that groups different actions as one Ethereum transaction.',
  iconColor: 'grey',
} as WarningTooltipType;

const allowanceTooltip = {
  id: 'allowance-tooltip',
  text: 'Enabling token trading allows your Proxy to take tokens from you and trade them on the exchange.',
  iconColor: 'grey',
} as WarningTooltipType;

const messageContent = (msg: Message) => {
  switch (msg.kind) {
    case MessageKind.amount2Big:
      return <span> You don't have enough funds</span>;
    default:
      return <></>;
  }
};

// tslint:enable

export function MigrationButton(props: MigrationButtonProps) {
  const openModal = useModal();

  const state = useObservable(props.migration$);

  if (!state) {
    return <></>;
  }

  function setup() {
    openModal(curry(MigrationModal)(props.migration$));
  }

  return (
    <WithLoadingIndicator loadable={state} className={styles.loadingIndicator}>
      {(migrationState) => {
        const visible =
          (isDAIEnabled() &&
            migrationState.kind === MigrationFormKind.sai2dai &&
            (migrationState.balance.gt(zero) || migrationState.orders.length > 0)) ||
          (migrationState.kind === MigrationFormKind.dai2sai && migrationState.balance.gt(zero));

        const { tid, className, label } = props;

        return visible ? (
          <Button
            size="sm"
            className={classnames(styles.redeemBtn, className)}
            data-test-id={tid}
            onClick={() => {
              setup();
            }}
          >
            {label}
          </Button>
        ) : (
          <></>
        );
      }}
    </WithLoadingIndicator>
  );
}

export function SAI2DAIMigrationHooked(props: Omit<MigrationButtonProps, 'migration$'>) {
  const { sai2DAIMigrationForm$ } = useContext(theAppContext);

  return MigrationButton({ ...props, migration$: sai2DAIMigrationForm$ });
}

enum MigrationViews {
  initial = 'initial',
  cancelOrders = 'cancelOrders',
  migration = 'migration',
}

export function MigrationModal(migration$: Observable<Loadable<MigrationFormState>>, { close }: ModalProps) {
  const migration = useObservable(migration$);

  if (migration && migration.status === 'loaded' && migration.value) {
    return (
      <>
        <MigrationModalInternal {...{ ...migration.value, close }} />
      </>
    );
  }

  return <>...</>;
}

function MigrationModalInternal(props: MigrationFormState & ModalProps) {
  const [view, setView] = useState(MigrationViews.initial);

  const initialView = () => {
    const { fromToken } = props;
    return (
      <Panel footerBordered={true} className={styles.panel}>
        <PanelHeader bordered={true} className={styles.panelHeader}>
          <span data-test-id="panel-header">
            {fromToken === 'SAI' ? 'Multi-Collateral Dai Upgrade' : 'Single-Collateral Sai Swap'}
          </span>
          <TopRightCorner className={styles.closeBtn}>
            <CloseButton data-test-id="close-button" theme="danger" onClick={props.close} />
          </TopRightCorner>
        </PanelHeader>
        <PanelBody paddingVertical={true} className={styles.panelBody}>
          {fromToken === 'SAI' && callToCancelOrders()}
          {callToRedeem()}
        </PanelBody>
      </Panel>
    );
  };

  const cancelOrders = () => {
    const { orders } = props;
    return (
      <Panel className={styles.panel}>
        <PanelHeader bordered={true} className={styles.panelHeader}>
          Cancel Pending Orders
          <TopRightCorner className={styles.closeBtn}>
            <CloseButton data-test-id="close-button" theme="danger" onClick={props.close} />
          </TopRightCorner>
        </PanelHeader>
        <PanelBody paddingVertical={true} className={classnames(styles.panelBody, styles.process)}>
          <div className={styles.description}>
            {
              // tslint:disable-next-line:max-line-length
              `Cancel your ${orders.length} Open ${
                orders.length === 1 ? 'Order' : 'Orders'
              } before upgrading your Single-Collateral Sai`
            }
          </div>
          <div className={styles.ordersPlaceholder}>
            <Table align="left" className={styles.orders}>
              <thead>
                <tr>
                  <th className={classnames('hide-md', styles.market)}>Market</th>
                  <th className={styles.type}>Type</th>
                  <th className={styles.price}>Price</th>
                  <th className={styles.amount}>Amount</th>
                  <th className={styles.total}>Total</th>
                  <th className={styles.action}>Action</th>
                </tr>
              </thead>
            </Table>
          </div>
          <Scrollbar>
            <Table align="left" className={styles.orders}>
              <tbody>
                {orders.map((order: TradeWithStatus, index: number) => {
                  return (
                    <RowClickable data-test-id="my-trades" key={index} clickable={false}>
                      <td className={classnames('hide-md', styles.market)}>
                        {order.baseToken}/{order.quoteToken}
                      </td>
                      <td className={styles.type}>
                        <SellBuySpan type={order.act}>{order.act}</SellBuySpan>
                      </td>
                      <td className={styles.price}>{formatAmount(order.price, order.quoteToken)} SAI</td>
                      <td className={styles.amount}>
                        {formatAmount(order.baseAmount, order.baseToken)} {order.baseToken}
                      </td>
                      <td className={styles.total}>{formatAmount(order.quoteAmount, order.quoteToken)} SAI</td>
                      <td className={styles.action}>
                        {order.status === TradeStatus.beingCancelled ? (
                          <LoadingIndicator className={styles.orderCancellationIndicator} inline={true} />
                        ) : (
                          <MediaQuery maxWidth={480}>
                            {(matches) => {
                              if (matches) {
                                return (
                                  <CloseButton theme="danger" data-test-id="cancel" onClick={() => cancel(order)} />
                                );
                              }

                              return (
                                <Button
                                  size="sm"
                                  data-test-id="cancel"
                                  color="secondaryOutlined"
                                  onClick={() => cancel(order)}
                                >
                                  Cancel
                                </Button>
                              );
                            }}
                          </MediaQuery>
                        )}
                      </td>
                    </RowClickable>
                  );
                })}
              </tbody>
            </Table>
          </Scrollbar>
        </PanelBody>
        <PanelFooter bordered={true} className={styles.panelFooter}>
          <Button
            size="sm"
            color="secondaryOutlined"
            data-test-id="back"
            className={styles.backBtn}
            onClick={() => setView(MigrationViews.initial)}
          >
            Back
          </Button>
        </PanelFooter>
      </Panel>
    );
  };

  const migration = () => {
    const { fromToken, amount, progress, change } = props;
    const formattedAmount = formatAmount(amount || new BigNumber(0), fromToken);

    if (!progress) {
      throw new Error('Should not get here!');
    }

    // TODO: Extract duplicated parts ( the panel + close button )
    return (
      <Panel className={styles.panel} data-test-id="migration">
        <PanelHeader bordered={true} className={styles.panelHeader}>
          {fromToken === 'SAI' ? 'Multi-Collateral Dai Upgrade' : 'Single-Collateral Sai Swap'}
          <TopRightCorner className={styles.closeBtn}>
            <CloseButton data-test-id="close-button" theme="danger" onClick={props.close} />
          </TopRightCorner>
        </PanelHeader>
        <PanelBody paddingVertical={true} className={classnames(styles.panelBody, styles.process)}>
          <div className={styles.description}>
            {fromToken === 'SAI'
              ? // tslint:disable-next-line:max-line-length
                `Upgrade ${formattedAmount} SAI (Single-Collateral Dai) to ${formattedAmount} DAI (Multi-Collateral Dai)`
              : // tslint:disable-next-line:max-line-length
                `Swap ${formattedAmount} DAI (Multi-Collateral Dai) for ${formattedAmount} SAI (Single-Collateral Dai)`}
          </div>

          {progress.status === ExchangeMigrationStatus.initializing && (
            <LoadingIndicator className={styles.processLoadingIndicator} inline={true} />
          )}
          {progress.status === ExchangeMigrationStatus.ready &&
            progress.pending.map((operation) => {
              return txRow(operation);
            })}
          {(progress.status === ExchangeMigrationStatus.inProgress ||
            progress.status === ExchangeMigrationStatus.fiasco) &&
            progress.done.map((operation) => {
              return txRow(operation);
            })}

          {(progress.status === ExchangeMigrationStatus.inProgress ||
            progress.status === ExchangeMigrationStatus.fiasco) &&
            txRow(progress.current)}

          {(progress.status === ExchangeMigrationStatus.inProgress ||
            progress.status === ExchangeMigrationStatus.fiasco) &&
            progress.pending.map((operation) => {
              return txRow(operation);
            })}

          {progress.status === ExchangeMigrationStatus.done &&
            amount &&
            amount.eq(new BigNumber(0)) &&
            setView(MigrationViews.initial)}
        </PanelBody>
        <PanelFooter bordered={true} className={styles.panelFooter}>
          <Button
            size="sm"
            color="secondaryOutlined"
            data-test-id="back"
            className={styles.backBtn}
            disabled={
              progress &&
              progress.status !== ExchangeMigrationStatus.done &&
              progress.status !== ExchangeMigrationStatus.fiasco
            }
            onClick={() => change({ kind: FormChangeKind.progress })}
          >
            Back
          </Button>
        </PanelFooter>
      </Panel>
    );
  };

  const callToCancelOrders = () => {
    const ordersCount = props.orders.length;
    return (
      <CallForAction
        title="Cancel Open Orders"
        description={`Cancel all your Open Orders before
                              upgrading your Single-Collateral Sai to Dai`}
        data={`${ordersCount} Open ${ordersCount === 1 ? 'Order' : 'Orders'}`}
        btnLabel={ordersCount ? 'Cancel Orders' : <SvgImage data-test-id="step-completed" image={tickSvg} />}
        btnDisabled={!ordersCount}
        btnAction={() => {
          setView(MigrationViews.cancelOrders);
        }}
        tid="cfa-cancel-orders"
        className={styles.callForAction}
      />
    );
  };

  const callToRedeem = () => {
    const { fromToken, amount, balance, readyToProceed, proceed, messages } = props;
    return (
      <CallForAction
        title={fromToken === 'SAI' ? 'Upgrade your Single-Collateral Sai' : 'Swap your Multi-Collateral Dai'}
        description={
          fromToken === 'SAI'
            ? `Upgrade your Single-Collateral Sai to Multi-Collateral Dai`
            : `Swap your Multi-Collateral Dai for Single-Collateral Sai`
        }
        data={
          <>
            <Money value={balance} token={fromToken} />
            {` to ${fromToken === 'SAI' ? 'upgrade' : 'swap'}`}
          </>
        }
        btnLabel={
          (balance.eq(zero) && <SvgImage image={tickSvg} data-test-id="step-completed" />) ||
          `${fromToken === 'SAI' ? 'Upgrade' : 'Swap'} ${fromToken}`
        }
        btnDisabled={!readyToProceed}
        btnAction={() => {
          setView(MigrationViews.initial);
          proceed(props);
        }}
        tid="cfa-upgrade-balance"
        className={styles.callForAction}
      >
        <div className={styles.amountInputGroup}>
          <InputGroup hasError={(messages || []).length > 0}>
            <InputGroupAddon className={styles.amountInputAddon}>Amount</InputGroupAddon>
            <div className={styles.amountInputTail}>
              <BigNumberInput
                data-test-id="type-amount"
                // ref={(el: any) =>
                //   amountInput = (el && ReactDOM.findDOMNode(el) as HTMLElement) || undefined
                // }
                type="text"
                className={styles.amountInput}
                mask={createNumberMask({
                  allowDecimal: true,
                  decimalLimit: getToken(fromToken).digits,
                  prefix: '',
                })}
                onChange={handleAmountChange}
                value={(amount || null) && formatAmount(amount as BigNumber, fromToken)}
                guide={true}
                placeholder={'0'}
              />
              <InputGroupAddon
                // onClick={handleAmountFocus}
                className={styles.amountInputAddon}
              >
                {fromToken}
              </InputGroupAddon>
            </div>
          </InputGroup>
          <ErrorMessage messages={messages.map(messageContent)} data-test-id="error-message" />
        </div>
      </CallForAction>
    );
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/,/g, '');
    props.change({
      kind: FormChangeKind.amountFieldChange,
      value: value === '' ? null : new BigNumber(value),
    } as AmountFieldChange);
  };

  const txRow = (operation: any) => {
    const status = {
      ...operation,
      etherscanURI: props.etherscan && props.etherscan.url,
    } as Report;

    switch (operation.kind) {
      case ExchangeMigrationTxKind.createProxy:
        return (
          <div key={operation.kind} className={styles.txRow} data-test-id="tx-row">
            <TxStatusRow
              icon={<SvgImage image={accountSvg} />}
              label={
                <TradeData data-test-id="create-proxy" theme="reversed" label="Create Account" tooltip={proxyTooltip} />
              }
              status={<ProgressReport report={status} />}
            />
          </div>
        );
      case ExchangeMigrationTxKind.allowance4Proxy:
        return (
          <div key={operation.kind} className={styles.txRow} data-test-id="tx-row">
            <TxStatusRow
              icon={<SvgImage image={doneSvg} />}
              label={
                <TradeData
                  data-test-id="set-allowance"
                  theme="reversed"
                  label={props.kind === MigrationFormKind.sai2dai ? 'Unlock SAI' : 'Unlock DAI'}
                  tooltip={allowanceTooltip}
                />
              }
              status={<ProgressReport report={status} />}
            />
          </div>
        );
      case ExchangeMigrationTxKind.sai2dai:
        return (
          <div key={operation.kind} className={styles.txRow} data-test-id="tx-row">
            <TxStatusRow
              icon={getToken('SAI').iconColor}
              label={
                <TradeData
                  data-test-id="upgrade"
                  theme="reversed"
                  label="Upgrade"
                  value={`${operation.amount.toFormat(getToken('SAI').digits)} SAI`}
                />
              }
              status={<ProgressReport report={status} />}
            />
          </div>
        );
      case ExchangeMigrationTxKind.dai2sai:
        return (
          <div key={operation.kind} className={styles.txRow} data-test-id="tx-row">
            <TxStatusRow
              icon={getToken('DAI').iconColor}
              label={
                <TradeData
                  data-test-id="upgrade"
                  theme="reversed"
                  label="Swap"
                  value={`${operation.amount.toFormat(getToken('DAI').digits)} DAI`}
                />
              }
              status={<ProgressReport report={status} />}
            />
          </div>
        );
      default:
        return <></>;
    }
  };

  const cancel = (order: TradeWithStatus) => {
    props.cancelOffer({
      offerId: order.offerId,
      type: order.act,
      amount: order.baseAmount,
      token: order.baseToken,
    });
  };

  return (
    <ReactModal
      ariaHideApp={false}
      isOpen={true}
      className={styles.modal}
      overlayClassName={styles.modalOverlay}
      closeTimeoutMS={250}
    >
      <section data-test-id="migration-wizard" className={styles.modalChild}>
        {(() => {
          switch (view) {
            case MigrationViews.cancelOrders:
              return !props.orders.length ? initialView() : cancelOrders();
            default:
              if (props.progress && props.progress.status !== ExchangeMigrationStatus.done) {
                return migration();
              }
              return initialView();
          }
        })()}
      </section>
    </ReactModal>
  );
}
