import * as React from 'react';
import * as styles from '../../balances/mtBalancesView.scss';

import { SvgImage } from '../../utils/icons/utils';
import { Loadable } from '../../utils/loadable';
import { ModalOpenerProps, ModalProps } from '../../utils/modal';
import { Panel, PanelBody, PanelHeader } from '../../utils/panel/Panel';
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
import { MtTransferFormView } from '../transfer/mtTransferFormView';
import backArrowSvg from './back-arrow.svg';
import * as myPositionStyles from './MTMyPositionView.scss';
import warningIconSvg from './warning-icon.svg';

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

export class MTLiquidationNotification
  extends React.Component<Loadable<MTMyPositionPanelInternalProps>> {
  public render() {

    if (this.props.value && this.props.status === 'loaded' && this.props.value.mta) {
      const { ma } = this.props.value;

      return <>
        {
          ma.bitable === 'imminent' &&
          // tslint:disable
          <div className={myPositionStyles.warningMessage}>
            <SvgImage image={warningIconSvg}/>
            <span>
              The {ma.name} price&nbsp;
              ({ma.osmPriceNext && ma.osmPriceNext.toString()} USD)
              is approaching your Liquidation Price and your position will soon be liquidated.
              You&nbsp;may rescue your Position by depositing either DAI or {ma.name} in the next {ma.nextPriceUpdateDelta} minutes.
              </span>
          </div>
          // tslint:enable
        }
      </>;
    }
    return null;
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

        if (hasHistoryEvents) {
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
            />
            <AssetDropdownMenu
              actions={this.createAssetActions(mta, ma, 'withdraw')}
              asset={ma.name}
              withIcon={false}
              label="Withdraw"
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
          size="md"
          className={styles.actionButton}
          disabled={!ma.availableActions.includes(UserActionKind.fund)}
          onClick={() => this.transfer(UserActionKind.fund, 'DAI', ma.name)}
        >
          Deposit DAI
        </Button>);
      } else {
        actions.push(<Button
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
        size="md"
        key={ma.name}
        className={styles.actionButton}
        onClick={() => this.transfer(UserActionKind.draw, ma.name, undefined)}
      >
        Withdraw {ma.name}
      </Button>);

      if (mta.daiAllowance) {

        actions.push(<Button
          size="md"
          className={styles.actionButton}
          onClick={() => this.transfer(UserActionKind.draw, 'DAI', ma.name)}
        >
          Withdraw DAI
        </Button>);
      } else {
        actions.push(<Button
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
