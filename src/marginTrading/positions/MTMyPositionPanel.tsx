import * as React from 'react';
import * as styles from '../../balances/mtBalancesView.scss';

import { SvgImage } from '../../utils/icons/utils';
import { Loadable } from '../../utils/loadable';
import { LoadingIndicator } from '../../utils/loadingIndicator/LoadingIndicator';
import { ModalOpenerProps, ModalProps } from '../../utils/modal';
import { PanelBody, PanelHeader } from '../../utils/panel/Panel';
import {
  MarginableAsset, MTAccount,
  MTAccountState, UserActionKind
} from '../state/mtAccount';
import { CreateMTFundForm$, MTTransferFormState } from '../transfer/mtTransferForm';
import { MTMyPositionView } from './MTMyPositionView';

import { default as BigNumber } from 'bignumber.js';
import { Observable } from 'rxjs';
import { AssetDropdownMenu } from '../../balances/AssetDropdownMenu';
import { TxState } from '../../blockchain/transactions';
import { connect } from '../../utils/connect';
import { Button } from '../../utils/forms/Buttons';
import { LoggedOut } from '../../utils/loadingIndicator/LoggedOut';
import { zero } from '../../utils/zero';
import { MtTransferFormView } from '../transfer/mtTransferFormView';
import backArrowSvg from './back-arrow.svg';

interface MTMyPositionPanelInternalProps {
  account: string | undefined;
  mta: MTAccount;
  ma: MarginableAsset;
  createMTFundForm$: CreateMTFundForm$;
  approveMTProxy: (args: { token: string; proxyAddress: string }) => Observable<TxState>;
  redeem: (args: {token: string; proxy: any, amount: BigNumber}) => void;
  transactions: TxState[];
  close?: () => void;
}

export class MTMyPositionPanel
  extends React.Component<Loadable<MTMyPositionPanelInternalProps> & ModalOpenerProps> {
  public render() {

    if (this.props.value) {
      const panelTitle = this.props.value.ma && this.props.value.ma.name ?
        `${this.props.value.ma.name} Position` : 'My Position';
      if (this.props.value && !this.props.value.account) {
        return (
          <div>
            <PanelHeader>{panelTitle}</PanelHeader>
            {
              this.props.value.ma && this.props.value.ma.name &&
              <div style={{ padding: '150px 30px' }}>
                <LoggedOut view={`${this.props.value.ma.name} Position`}/>
              </div>
            }
          </div>
        );
      }

      if (this.props.status === 'loaded' && this.props.value.mta) {
        const { ma, mta } = this.props.value;

        if (mta && mta.proxy && ma && (ma.balance.gt(zero) || ma.dai.gt(zero))) {
          return (
            <MTMyPositionPanelInternal {...this.props.value} {...{ open: this.props.open }} />
          );
        }

        return this.CallForDeposit(ma);
      }
    }

    return <div>
      <PanelHeader>My Position</PanelHeader>
      <LoadingIndicator/>
    </div>;
  }

  // todo: refactor to separate component
  public CallForDeposit(ma?: MarginableAsset) {
    return (
      <div className={styles.onboardingPanel}>
        <div className={styles.onboardingParagraph}>
          Before opening a new position, deposit WETH
          or DAI into your Leverage Trading Account
        </div>
        <div className={styles.buttonsGroup}>
          <Button
            size="md"
            color="primary"
            disabled={!ma}
            className={styles.groupInlineButton}
            onClick={() => this.transfer(UserActionKind.fund, 'DAI', ma!.name)}
          >Deposit DAI</Button>
          <br/>
          <Button
            size="md"
            color="primary"
            disabled={!ma}
            className={styles.groupInlineButton}
            onClick={() => this.transfer(UserActionKind.fund, ma!.name, ma!.name)}
          >Deposit {ma && ma.name}</Button>
        </div>
      </div>
    );
  }

  public transfer (actionKind: UserActionKind, token: string, ilk?: string) {
    const fundForm$ = this.props.value!.createMTFundForm$(actionKind, token, ilk);
    const MTFundFormViewRxTx =
      connect<MTTransferFormState, ModalProps>(
        MtTransferFormView,
        fundForm$
      );
    this.props.open(MTFundFormViewRxTx);
  }
}

export class MTMyPositionPanelInternal
  extends React.Component<MTMyPositionPanelInternalProps & ModalOpenerProps> {
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
            redeem: this.props.redeem
          }} />}
        </PanelBody>
      </div>
    );
  }

  private createAssetActions(mta: MTAccount, ma: MarginableAsset, type: string): React.ReactNode[] {
    const actions: React.ReactNode[] = [];

    if (type === 'deposit') {
      actions.push(<Button
        data-test-id="deposit-collateral"
        size="md"
        key={ma.name}
        className={styles.actionButton}
        disabled={!ma.availableActions.includes(UserActionKind.fund)}
        onClick={() => this.transfer(UserActionKind.fund, ma.name, undefined)}
      >
        Deposit {ma.name}
      </Button>);

      if (mta.daiAllowance) {
        actions.push(<Button
          data-test-id="deposit-dai"
          size="md"
          className={styles.actionButton}
          disabled={!ma.availableActions.includes(UserActionKind.fund)}
          onClick={() => this.transfer(UserActionKind.fund, 'DAI', ma.name)}
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
        data-test-id="withdraw-collateral"
        size="md"
        key={ma.name}
        className={styles.actionButton}
        onClick={() => this.transfer(UserActionKind.draw, ma.name, undefined)}
      >
        Withdraw {ma.name}
      </Button>);

      if (mta.daiAllowance) {

        actions.push(<Button
          data-test-id="withdraw-dai"
          size="md"
          className={styles.actionButton}
          onClick={() => this.transfer(UserActionKind.draw, 'DAI', ma.name)}
        >
          Withdraw DAI
        </Button>);
      } else {
        actions.push(<Button
          data-test-id="set-allowance"
          size="md"
          className={styles.actionButton}
          onClick={ this.approveMTProxy('DAI')}
        >
          Enable DAI
        </Button>);
      }
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
    const fundForm$ = this.props.createMTFundForm$(actionKind, token, ilk);
    const MTFundFormViewRxTx =
      connect<MTTransferFormState, ModalProps>(
        MtTransferFormView,
        fundForm$
      );
    this.props.open(MTFundFormViewRxTx);
  }
}
