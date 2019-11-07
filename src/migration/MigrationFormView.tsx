import * as classnames from 'classnames';
import * as React from 'react';
import * as ReactModal from 'react-modal';
import { Observable } from 'rxjs';
import { Button, CloseButton } from '../utils/forms/Buttons';
import { Loadable } from '../utils/loadable';
import { LoadingIndicator, WithLoadingIndicator } from '../utils/loadingIndicator/LoadingIndicator';
import { ModalOpenerProps, ModalProps } from '../utils/modal';
import { Panel, PanelBody, PanelFooter, PanelHeader } from '../utils/panel/Panel';
import { TopRightCorner } from '../utils/panel/TopRightCorner';

import { ExchangeMigrationStatus, ExchangeMigrationTxKind } from './migration';

import { BigNumber } from 'bignumber.js';
import * as ReactDOM from 'react-dom';
import { default as MediaQuery } from 'react-responsive';
import { createNumberMask } from 'text-mask-addons/dist/textMaskAddons';
import { tokens } from '../blockchain/config';
import { TradeStatus, TradeWithStatus } from '../exchange/myTrades/openTrades';
import accountSvg from '../icons/account.svg';
import doneSvg from '../icons/done.svg';
import tickSvg from '../icons/tick.svg';
import { TradeData } from '../instant/details/TradeData';
import { TxStatusRow } from '../instant/details/TxStatusRow';
import { ProgressReport, Report } from '../instant/progress/ProgressReport';
import { BigNumberInput } from '../utils/bigNumberInput/BigNumberInput';
import { connect } from '../utils/connect';
import { AmountFieldChange, FormChangeKind } from '../utils/form';
import { formatAmount } from '../utils/formatters/format';
import { InputGroup, InputGroupAddon } from '../utils/forms/InputGroup';
import { SvgImage } from '../utils/icons/utils';
import { Scrollbar } from '../utils/Scrollbar/Scrollbar';
import { RowClickable, Table } from '../utils/table/Table';
import { SellBuySpan } from '../utils/text/Text';
import { WarningTooltipType } from '../utils/tooltip/Tooltip';
import { zero } from '../utils/zero';
import { WrapUnwrapFormKind } from '../wrapUnwrap/wrapUnwrapForm';
import { CallForAction } from './CallForAction';
import * as styles from './Migration.scss';
import { MigrationFormKind, MigrationFormState } from './migrationForm';

export type MigrationButtonProps = Loadable<MigrationFormState> & {
  label: string;
  migration$: Observable<MigrationFormState>;
  className?: string;
};

// TODO: Probably extract all Tooltip Definitions in a separate file.

// tslint:disable
const proxyTooltip = {
  id: 'proxy-tooltip',
  text: 'Proxy is a supporting contract owned by you that groups different actions as one Ethereum transaction.',
  iconColor: 'grey'
} as WarningTooltipType;


const allowanceTooltip = {
  id: 'allowance-tooltip',
  text: 'Enabling token trading allows your Proxy to take tokens from you and trade them on the exchange.',
  iconColor: 'grey'
} as WarningTooltipType;

// tslint:enable

export class MigrationButton extends React.Component<MigrationButtonProps & ModalOpenerProps> {
  public render() {
    return <WithLoadingIndicator loadable={this.props}
                                 className={styles.loadingIndicator}
    >
      {
        (migrationState) => {
          const visible =
            migrationState.kind === MigrationFormKind.sai2dai &&
            (migrationState.balance.gt(zero) || migrationState.orders.length > 0) ||
            migrationState.kind === MigrationFormKind.dai2sai &&
            migrationState.balance.gt(zero);

          return visible ? (
              <Button size="md"
                      className={classnames(styles.redeemBtn, this.props.className)}
                      onClick={() => this.setup()}
              >
                {this.props.label}
              </Button>
            )
            : <></>;
        }
      }
    </WithLoadingIndicator>;
  }

  private setup() {
    const migration$ = this.props.migration$;
    const MigrationModalRxTx =
      connect<MigrationFormState, ModalProps>(MigrationModal, migration$);
    this.props.open(MigrationModalRxTx);
  }
}

enum MigrationViews {
  initial = 'initial',
  cancelOrders = 'cancelOrders',
  migration = 'migration',
}

export class MigrationModal extends React.Component<MigrationFormState & ModalProps,
  { view: MigrationViews }> {

  public constructor(props: any) {
    super(props);
    this.state = {
      view: MigrationViews.initial
    };
  }

  public render() {
    // const orders: TradeWithStatus[] = (
    //   this.props.status === ExchangeMigrationStatus.ready
    //   || this.props.status === ExchangeMigrationStatus.inProgress
    //   || this.props.status === ExchangeMigrationStatus.fiasco
    //   || this.props.status === ExchangeMigrationStatus.done
    // )
    //   ? this.props.orders
    //   : [];
    //
    // let amount: BigNumber = new BigNumber(0);
    //
    // if (
    //   this.props.status === ExchangeMigrationStatus.ready) {
    //   const pendingMigration = this.props.pending
    //     .find((op) => op && op.kind === ExchangeMigrationTxKind.sai2dai) as SAI2DAIOperation;
    //
    //   if (pendingMigration) {
    //     amount = new BigNumber(pendingMigration.amount.toFormat(tokens.SAI.digits));
    //   }
    // }
    //
    // if (this.props.status === ExchangeMigrationStatus.inProgress
    //   || this.props.status === ExchangeMigrationStatus.fiasco
    // ) {
    //   const pendingMigration = this.props.pending
    //     .concat(this.props.current)
    //     .concat(this.props.done)
    //     .find((op) => op && op.kind === ExchangeMigrationTxKind.sai2dai) as SAI2DAIOperation;
    //   if (pendingMigration) {
    //     amount = new BigNumber(pendingMigration.amount.toFormat(tokens.SAI.digits));
    //   }
    // }

    const view = (() => {
      switch (this.state.view) {
        case MigrationViews.cancelOrders:
          return !this.props.orders.length
            ? this.initialView()
            : this.cancelOrders();
        default:
          if (this.props.progress) {
            return this.migration();
          }
          return this.initialView();
      }
    })();

    return <ReactModal
      ariaHideApp={false}
      isOpen={true}
      className={styles.modal}
      overlayClassName={styles.modalOverlay}
      closeTimeoutMS={250}
    >
      {view}
    </ReactModal>;
  }

  private initialView = () => {
    return (
      <Panel footerBordered={true} className={styles.modalChild}>
        <PanelHeader bordered={true} className={styles.panelHeader}>
          Multi-Collateral Dai Upgrade
          <TopRightCorner className={styles.closeBtn}>
            <CloseButton theme="danger" onClick={this.props.close}/>
          </TopRightCorner>
        </PanelHeader>
        <PanelBody paddingVertical={true} className={styles.panelBody}>
          {this.callToCancelOrders()}
          {this.callToRedeem()}
        </PanelBody>
      </Panel>
    );
  }

  private cancelOrders = () => {
    const orders = this.props.orders;
    return <Panel className={styles.modalChild}>
      <PanelHeader bordered={true} className={styles.panelHeader}>
        Cancel Pending Orders
        <TopRightCorner className={styles.closeBtn}>
          <CloseButton theme="danger" onClick={this.props.close}/>
        </TopRightCorner>
      </PanelHeader>
      <PanelBody paddingVertical={true}
                 className={
                   classnames(styles.panelBody, styles.process)
                 }
      >
        <div className={styles.description}>
          {
            // tslint:disable-next-line:max-line-length
            `Cancel your ${orders.length} Open ${orders.length === 1 ? 'Order' : 'Orders'} before upgrading your Single-Collateral Sai`
          }
        </div>
        <div className={styles.ordersPlaceholder}>
          <Table align="left" className={styles.orders}>
            <thead>
            <th className={classnames('hide-md', styles.market)}>Market</th>
            <th className={styles.type}>Type</th>
            <th className={styles.price}>Price</th>
            <th className={styles.amount}>Amount</th>
            <th className={styles.total}>Total</th>
            <th className={styles.action}>Action</th>
            </thead>
          </Table>
        </div>
        <Scrollbar>
          <Table align="left" className={styles.orders}>
            <tbody>
            {
              orders.map((order: TradeWithStatus, index: number) => {
                return (
                  <RowClickable
                    data-test-id="my-trades"
                    key={index}
                    clickable={false}
                  >
                    <td className={classnames('hide-md', styles.market)}>
                      {order.baseToken}/{order.quoteToken}
                    </td>
                    <td className={styles.type}>
                      <SellBuySpan type={order.act}>{order.act}</SellBuySpan>
                    </td>
                    <td className={styles.price}>
                      {formatAmount(order.price, order.quoteToken)} SAI
                    </td>
                    <td className={styles.amount}>
                      {formatAmount(order.baseAmount, order.baseToken)} {order.baseToken}
                    </td>
                    <td className={styles.total}>
                      {formatAmount(order.quoteAmount, order.quoteToken)} SAI
                    </td>
                    <td className={styles.action}>
                      {
                        order.status === TradeStatus.beingCancelled
                          ? <LoadingIndicator className={styles.orderCancellationIndicator}
                                              inline={true}
                          />
                          : <MediaQuery maxWidth={480}>
                            {
                              (matches) => {
                                if (matches) {
                                  return (
                                    <CloseButton theme="danger"
                                                 onClick={
                                                   () => this.cancel(order)
                                                 }
                                    />
                                  );
                                }

                                return (
                                  <Button size="sm"
                                          color="secondaryOutlined"
                                          onClick={
                                            () => this.cancel(order)
                                          }
                                  >
                                    Cancel
                                  </Button>
                                );
                              }
                            }
                          </MediaQuery>

                      }
                    </td>
                  </RowClickable>
                );
              })
            }
            </tbody>
          </Table>
        </Scrollbar>
      </PanelBody>
      <PanelFooter bordered={true}
                   className={styles.panelFooter}
      >
        <Button size="sm"
                color="secondaryOutlined"
                className={styles.backBtn}
                onClick={() => this.setState({ view: MigrationViews.initial })}
        >
          Back
        </Button>
      </PanelFooter>
    </Panel>;
  }

  private migration = () => {

    if (!this.props.progress) {
      throw new Error('Should not get here!');
    }

    const progress = this.props.progress;

    return <Panel className={styles.modalChild}>
      <PanelHeader bordered={true} className={styles.panelHeader}>
        Multi Collateral Dai Upgrade
        <TopRightCorner className={styles.closeBtn}>
          <CloseButton theme="danger" onClick={() => {
            this.props.close();
            // if (progress.status === ExchangeMigrationStatus.fiasco
            //   || progress.status === ExchangeMigrationStatus.done) {
            //   progress.restart();
            // }
          }}/>
        </TopRightCorner>
      </PanelHeader>
      <PanelBody paddingVertical={true}
                 className={
                   classnames(styles.panelBody, styles.process)
                 }
      >
        <div className={styles.description}>
          {
            // tslint:disable-next-line:max-line-length
            `Upgrade ${this.props.amount && this.props.amount.valueOf()}
            SAI (Single-Collateral Dai) to
            ${this.props.amount && this.props.amount.valueOf()}
            DAI (Multi-Collateral Dai)`
          }
        </div>

        {
          progress.status === ExchangeMigrationStatus.ready
          && progress.pending.map((operation, index) => {
            return this.txRow(operation, index);
          })
        }
        {
          (progress.status === ExchangeMigrationStatus.inProgress ||
            progress.status === ExchangeMigrationStatus.fiasco)
          && progress.done.map((operation) => {
            return this.txRow(operation);
          })
        }

        {
          (progress.status === ExchangeMigrationStatus.inProgress ||
            progress.status === ExchangeMigrationStatus.fiasco)
          && this.txRow(progress.current)
        }

        {
          (progress.status === ExchangeMigrationStatus.inProgress ||
            progress.status === ExchangeMigrationStatus.fiasco)
          && progress.pending.map((operation) => {
            return this.txRow(operation);
          })
        }

        {
          progress.status === ExchangeMigrationStatus.done
          && this.props.amount && this.props.amount.eq(new BigNumber(0))
          && this.setState({
            view: MigrationViews.initial
          })
        }

      </PanelBody>
      <PanelFooter bordered={true}
                   className={styles.panelFooter}
      >
        <Button size="sm"
                color="secondaryOutlined"
                className={styles.backBtn}
                onClick={() => this.props.change({ kind: FormChangeKind.progress })}
        >
          Back
        </Button>
      </PanelFooter>
    </Panel>;
  }

  private callToCancelOrders = () => {
    const ordersCount = this.props.orders.length;
    return (
      <CallForAction title="Cancel Open Orders"
                     description={
                       `Cancel all your Open Orders before
                              upgrading your Single-Collateral Sai to Dai`
                     }
                     btnLabel={
                       ordersCount
                         ? 'Cancel Orders'
                         : <SvgImage image={tickSvg}/>
                     }
                     btnDisabled={!ordersCount}
                     btnAction={() => this.setState({ view: MigrationViews.cancelOrders })}
      >
        {`${ordersCount} Open ${ordersCount === 1 ? 'Order' : 'Orders'}`}
      </CallForAction>
    );
  }

  private callToRedeem = () => (
    <CallForAction title="Upgrade your Single-Collateral Sai"
                   description={
                     `Upgrade your Single-Collateral Sai to
                              Multi-Collateral Dai`
                   }
                   btnLabel={
                     this.props.balance.eq(zero) &&
                     <SvgImage image={tickSvg}/> ||
                     `Upgrade ${this.props.fromToken}`
                   }
                   btnDisabled={!this.props.readyToProceed}
                   btnAction={() => this.props.proceed(this.props)}
    >
      {
        this.props.amount && `${formatAmount(this.props.amount, this.props.fromToken)}
                     ${this.props.fromToken} to upgrade`
      }
      <InputGroup hasError={ (this.props.messages || []).length > 0}>
        <InputGroupAddon>
          Amount
        </InputGroupAddon>
        <div>
          <BigNumberInput
            data-test-id="type-amount"
            // ref={(el: any) =>
            //   this.amountInput = (el && ReactDOM.findDOMNode(el) as HTMLElement) || undefined
            // }
            type="text"
            mask={createNumberMask({
              allowDecimal: true,
              decimalLimit: 5,
              prefix: ''
            })}
            onChange={this.handleAmountChange}
            value={
              (this.props.amount || null) &&
              formatAmount(this.props.amount as BigNumber, this.props.fromToken)
            }
            guide={true}
            placeholder={'0'}
            // disabled={state.progress !== undefined}
          />
          <InputGroupAddon
            // onClick={this.handleAmountFocus}
          >
            {this.props.fromToken}
          </InputGroupAddon>
          <pre>
            {JSON.stringify(this.props.messages)}
          </pre>
        </div>
      </InputGroup>
    </CallForAction>
  )

  private handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/,/g, '');
    this.props.change({
      kind: FormChangeKind.amountFieldChange,
      value: value === '' ? null : new BigNumber(value)
    } as AmountFieldChange);
  }

  private txRow = (operation: any, index?: number) => {
    const status = !operation.txStatus ? {
      txStatus: index === 0 ? 'Start Migration Process' : 'Waiting',
      txHash: '',
      etherscanURI: ''
    } : {
      ...operation
    } as Report;

    switch (operation.kind) {
      case ExchangeMigrationTxKind.createProxy:
        return (
          <div key={operation.kind} className={styles.txRow}>
            <TxStatusRow icon={<SvgImage image={accountSvg}/>}
                         label={
                           <TradeData
                             data-test-id="create-proxy"
                             theme="reversed"
                             label="Create Account"
                             tooltip={proxyTooltip}
                           />
                         }
                         status={<ProgressReport report={status}/>}
            />
          </div>
        );
      case ExchangeMigrationTxKind.allowance4Proxy:
        return (
          <div key={operation.kind} className={styles.txRow}>
            <TxStatusRow icon={<SvgImage image={doneSvg}/>}
                         label={
                           <TradeData
                             data-test-id="set-allowance"
                             theme="reversed"
                             label="Unlock SAI"
                             tooltip={allowanceTooltip}
                           />}
                         status={<ProgressReport report={status}/>}
            />
          </div>
        );
      case ExchangeMigrationTxKind.sai2dai:
        return (
          <div key={operation.kind} className={styles.txRow}>
            <TxStatusRow icon={tokens.SAI.iconColor}
                         label={
                           <TradeData
                             data-test-id="upgrade"
                             theme="reversed"
                             label="Upgrade"
                             value={`${operation.amount.toFormat(tokens.SAI.digits)} SAI`}
                           />}
                         status={<ProgressReport report={status}/>}
            />
          </div>
        );
      case ExchangeMigrationTxKind.dai2sai:
        return (
          <div key={operation.kind} className={styles.txRow}>
            <TxStatusRow icon={tokens.DAI.iconColor}
                         label={
                           <TradeData
                             data-test-id="upgrade"
                             theme="reversed"
                             label="Swap"
                             value={`${operation.amount.toFormat(tokens.DAI.digits)} DAI`}
                           />}
                         status={<ProgressReport report={status}/>}
            />
          </div>
        );
      default:
        return <></>;
    }
  }

  private cancel = (order: TradeWithStatus) => {
    this.props.cancelOffer({
      offerId: order.offerId,
      type: order.act,
      amount: order.baseAmount,
      token: order.baseToken
    });
  }
}
