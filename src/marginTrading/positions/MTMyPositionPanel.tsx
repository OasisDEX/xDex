import * as mixpanel from 'mixpanel-browser';
import * as React from 'react';
import * as styles from '../../balances/mtBalancesView.scss';
import { SvgImage } from '../../utils/icons/utils';
import { Loadable } from '../../utils/loadable';
import { ModalOpenerProps, ModalProps } from '../../utils/modal';
import { Panel, PanelBody, PanelHeader } from '../../utils/panel/Panel';
import { zero } from '../../utils/zero';
import {
  MarginableAsset, MTAccount,
  MTAccountState, UserActionKind
} from '../state/mtAccount';
import { CreateMTFundForm$, MTTransferFormState } from '../transfer/mtTransferForm';
import { MTMyPositionView } from './MTMyPositionView';

import { default as BigNumber } from 'bignumber.js';
import { Observable } from 'rxjs';
import { AssetDropdownMenu } from '../../balances/AssetDropdownMenu';
import { TxMetaKind } from '../../blockchain/calls/txMeta';
import { isDone, TxState } from '../../blockchain/transactions';
import { connect } from '../../utils/connect';
import { Button } from '../../utils/forms/Buttons';
import { Switch } from '../../utils/forms/Slider';
import { LoadingIndicator } from '../../utils/loadingIndicator/LoadingIndicator';
import { LoggedOut } from '../../utils/loadingIndicator/LoggedOut';
import { LiquidationMessage, LiquidationMessageKind } from '../simple/mtOrderForm';
import { MtTransferFormView } from '../transfer/mtTransferFormView';
import backArrowSvg from './back-arrow.svg';
import * as myPositionStyles from './MTMyPositionView.scss';
import warningIconSvg from './warning-icon.svg';

interface RedeemButtonProps {
  disabled: boolean;
  redeem: () => void;
  token: string;
  transactions: TxState[];
}

class RedeemButton extends React.Component<RedeemButtonProps> {

  public render() {
    const txInProgress = Boolean(this.props.transactions.find((t: TxState) =>
      t.meta.kind === TxMetaKind.redeem &&
      !isDone(t) &&
      t.meta.args.token === this.props.token
    ));

    return (
      <Button
        size="md"
        disabled={this.props.disabled || txInProgress}
        className={myPositionStyles.redeemButton}
        onClick={this.props.redeem}
      >
        {txInProgress ? <LoadingIndicator className={myPositionStyles.buttonLoading} /> : 'Reclaim'}
      </Button>
    );
  }
}

interface MTMyPositionPanelInternalProps {
  account: string | undefined;
  mta: MTAccount;
  ma: MarginableAsset;
  createMTFundForm$: CreateMTFundForm$;
  approveMTProxy: (args: { token: string; proxyAddress: string }) => Observable<TxState>;
  redeem: (args: {token: string; proxy: any, amount: BigNumber}) => void;
  transactions: TxState[];
  close?: () => void;
  daiPrice: BigNumber;
  liquidationMessage?: LiquidationMessage;
}

export class MTLiquidationNotification
  extends React.Component<Loadable<MTMyPositionPanelInternalProps>> {
  public render() {

    if (this.props.value && this.props.status === 'loaded' && this.props.value.mta) {
      const { mta, ma, redeem, transactions, liquidationMessage } = this.props.value;

      if (liquidationMessage) {
        const warningClass = liquidationMessage.kind === LiquidationMessageKind.redeemable
          ? myPositionStyles.infoMessage
          : myPositionStyles.warningMessage;

        return <div className={warningClass}>
          <>{
            liquidationMessage.kind !== LiquidationMessageKind.redeemable &&
            <SvgImage image={warningIconSvg}/>
          }</>
          <span className={myPositionStyles.warningText}>
            {liquidationMessageContent(liquidationMessage)}
          </span>
          {
            liquidationMessage.kind === LiquidationMessageKind.redeemable
            && ma.redeemable.gt(zero) && <RedeemButton
              redeem={() => redeem({
                token: ma.name,
                proxy: mta.proxy,
                amount: ma.redeemable
              })}

              token={ma.name}
              disabled={false}
              transactions={transactions}
            />
          }
        </div>;
      }
    }
    return null;
  }
}

function liquidationMessageContent(msg: LiquidationMessage) {
  switch (msg.kind) {
    // tslint:disable
    case LiquidationMessageKind.bitable:
      return <>Your WETH leveraged position is now at risk of being liquidated.
        You can still avoid auction by depositing {msg.baseToken} or DAI.
      </>;

    case LiquidationMessageKind.imminent:
      return <>Your {msg.baseToken} leveraged position has entered the liquidation phase and your
        collateral will be auctioned in {msg.nextPriceUpdateDelta} minutes.<br />
        You can still avoid auction by {msg.isSafeCollRatio ? 'selling, or ' : ' '}
        depositing additional {msg.baseToken} or DAI.
      </>;

    case LiquidationMessageKind.inProgress:
      return <>Your {msg.baseToken} leveraged position has been liquidated and your assets are currently being sold at
        auction to cover your debt. Check back soon for further details for the auction result.
      </>;

    case LiquidationMessageKind.redeemable:
      return <>Your {msg.baseToken} leveraged position has been liquidated and sold to cover your debt.
        You have {msg.redeemable} {msg.baseToken} that was not sold and can now be reclaimed.
      </>;
    // tslint:enable
  }
}

export class MTMyPositionPanel
  extends React.Component<Loadable<MTMyPositionPanelInternalProps> & ModalOpenerProps> {
  public render() {

    if (this.props.value) {
      const panelTitle = this.props.value.ma && this.props.value.ma.name ?
        `${this.props.value.ma.name} Position` : 'My Position';
      if (this.props.value && !this.props.value.account) {
        return (
          <Panel style={{ flexGrow: 1 }}>
            <PanelHeader>{panelTitle}</PanelHeader>
            {
              this.props.value.ma && this.props.value.ma.name &&
              <div style={{ padding: '150px 30px' }}>
                <LoggedOut view={`${this.props.value.ma.name} Position`}/>
              </div>
            }
          </Panel>
        );
      }

      if (this.props.status === 'loaded' && this.props.value.mta) {
        const { ma } = this.props.value;

        const hasHistoryEvents = ma && ma.rawHistory.length > 0;

        if (hasHistoryEvents || ma.balance.gt(zero) || ma .dai.gt(zero)) {
          return (
            <Panel style={{ flexGrow: 1 }}>
              <MTMyPositionPanelInternal {...this.props.value} {...{ open: this.props.open }} />
            </Panel>
          );
        }
      }
    }

    return null;
  }

  public transfer (actionKind: UserActionKind, token: string, ilk?: string) {
    const fundForm$ = this.props.value!.createMTFundForm$({
      actionKind, token, ilk, withOnboarding:false
    });
    const MTFundFormViewRxTx =
      connect<MTTransferFormState, ModalProps>(
        MtTransferFormView,
        fundForm$
      );
    this.props.open(MTFundFormViewRxTx);
  }
}

export class MTMyPositionPanelInternal
  extends React.Component<MTMyPositionPanelInternalProps & ModalOpenerProps, {blocked: boolean}> {

  public constructor(props:any) {
    super(props);
    // TODO: this should come from the pipeline;
    this.state = {
      blocked: false
    };
  }

  public render() {

    const { ma, mta } = this.props;

    return (
      <div>
        <PanelHeader bordered={true}>
          {this.props.close &&
          <div
            className={styles.backButton}
            onClick={this.props.close}
          ><SvgImage image={backArrowSvg}/></div>
          }
          <span>My Position</span>
          <Switch blocked={this.state.blocked}
                  onClick={
                    () => {
                      this.setState(prevState =>
                        ({ blocked: !prevState.blocked })
                      );
                      mixpanel.track('btn-click', {
                        id: 'dai-usd-toggle',
                        product: 'oasis-trade',
                        page: 'Leverage',
                        section: 'my-position',
                        currency: this.state.blocked ? 'usd' : 'dai'
                      });
                    }
                  }
                  optionOne="DAI"
                  optionTwo="USD"
                  className={styles.toggle}
                  pointerStyle={
                    this.state.blocked
                      ? styles.togglePointerBlocked
                      : styles.togglePointerUnblocked
                  }/>
          <div className={styles.headerActions}>

            <AssetDropdownMenu
              actions={this.createAssetActions(mta, ma, 'deposit')}
              asset={ma.name}
              withIcon={false}
              label="Deposit"
              tid="deposit-actions-dropdown"
            />
            <AssetDropdownMenu
              actions={this.createAssetActions(mta, ma, 'withdraw')}
              asset={ma.name}
              withIcon={false}
              label="Withdraw"
              tid="withdraw-actions-dropdown"
            />
          </div>
        </PanelHeader>
        <PanelBody>
          {<MTMyPositionView {...{
            mta,
            ma,
            open: this.props.open,
            createMTFundForm$: this.props.createMTFundForm$,
            approveMTProxy: this.props.approveMTProxy,
            transactions: this.props.transactions,
            redeem: this.props.redeem,
            inDai: this.state.blocked,
            daiPrice: this.props.daiPrice,
          }} />}
        </PanelBody>
      </div>
    );
  }

  private createAssetActions(mta: MTAccount, ma: MarginableAsset, type: string): React.ReactNode[] {
    const actions: React.ReactNode[] = [];

    if (type === 'deposit') {
      if (ma.allowance) {
        actions.push(<Button
          size="md"
          key={ma.name}
          className={styles.actionButton}
          data-test-id="deposit-col"
          onClick={
            () => {
              this.transfer(UserActionKind.fund, ma.name, undefined);
              mixpanel.track('btn-click', {
                id: 'fund-collateral-open',
                product: 'oasis-trade',
                page: 'Leverage',
                section: 'my-position',
              });
            }
          }
        >
          Deposit {ma.name}
        </Button>);
      } else {
        actions.push(<Button
          size="md"
          data-test-id="set-allowance"
          className={styles.actionButton}
          onClick={this.approveMTProxy(ma.name)}
        >
          Enable {ma.name}
        </Button>);
      }

      if (mta.daiAllowance) {
        actions.push(<Button
          data-test-id="deposit-dai"
          size="md"
          className={styles.actionButton}
          onClick={
            () => {
              this.transfer(UserActionKind.fund, 'DAI', ma.name);
              mixpanel.track('btn-click', {
                id: 'fund-dai-open',
                product: 'oasis-trade',
                page: 'Leverage',
                section: 'my-position',
              });
            }
          }
        >
          Deposit DAI
        </Button>);
      } else {
        actions.push(<Button
          data-test-id="set-allowance"
          size="md"
          className={styles.actionButton}
          onClick={this.approveMTProxy('DAI')}
        >
          Enable DAI
        </Button>);
      }
    }

    if (type === 'withdraw') {
      actions.push(<Button
        data-test-id="withdraw-col"
        size="md"
        key={ma.name}
        className={styles.actionButton}
        onClick={
          () => {
            this.transfer(UserActionKind.draw, ma.name, undefined);
            mixpanel.track('btn-click', {
              id: 'draw-collateral-open',
              product: 'oasis-trade',
              page: 'Leverage',
              section: 'my-position',
            });
          }
        }
      >
        Withdraw {ma.name}
      </Button>);

      actions.push(<Button
        size="md"
        className={styles.actionButton}
        disabled={ma.dai.eq(zero)}
        data-test-id="withdraw-dai"
        title={ma.dai.eq(zero) ? `You don't have any DAI to withdraw` : ''}
        onClick={
          () => {
            this.transfer(UserActionKind.draw, 'DAI', ma.name);
            mixpanel.track('btn-click', {
              id: 'draw-dai-open',
              product: 'oasis-trade',
              page: 'Leverage',
              section: 'my-position',
            });
          }
        }
      >
        Withdraw DAI
      </Button>);
    }

    return actions;
  }

  private approveMTProxy(token: string) {
    return () => {
      if (this.props.mta.state !== MTAccountState.notSetup) {
        this.props.approveMTProxy({
          token,
          proxyAddress: this.props.mta.proxy.options.address as string
        });
      }
    };
  }

  private transfer (actionKind: UserActionKind, token: string, ilk?: string) {
    const fundForm$ = this.props.createMTFundForm$({
      actionKind, token, ilk, withOnboarding:false
    });
    const MTFundFormViewRxTx =
      connect<MTTransferFormState, ModalProps>(
        MtTransferFormView,
        fundForm$
      );
    this.props.open(MTFundFormViewRxTx);
  }
}
