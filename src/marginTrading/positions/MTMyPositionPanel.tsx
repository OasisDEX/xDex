import * as React from 'react';
import * as styles from '../../balances/mtBalancesView.scss';
import tickSvg from '../../icons/tick.svg';
import { CallForAction } from '../../migration/CallForAction';

import { SvgImage } from '../../utils/icons/utils';
import { Loadable } from '../../utils/loadable';
import { LoadingIndicator } from '../../utils/loadingIndicator/LoadingIndicator';
import { ModalOpenerProps, ModalProps } from '../../utils/modal';
import { PanelBody, PanelHeader } from '../../utils/panel/Panel';
import {
  findAsset,
  MarginableAsset, MTAccount,
  MTAccountState, UserActionKind
} from '../state/mtAccount';
import { CreateMTFundForm$, MTTransferFormState } from '../transfer/mtTransferForm';
import { MTMyPositionView } from './MTMyPositionView';

import { default as BigNumber } from 'bignumber.js';
import { Observable } from 'rxjs';
import { theAppContext } from '../../AppContext';
import { TxState } from '../../blockchain/transactions';
import { connect } from '../../utils/connect';
import { Button } from '../../utils/forms/Buttons';
import { inject } from '../../utils/inject';
import { LoggedOut } from '../../utils/loadingIndicator/LoggedOut';
import { CreateMTAllocateForm$Props } from '../allocate/mtOrderAllocateDebtFormView';
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
        const mtaState = mta.state;
        const name = ma.name;
        if (mtaState !== MTAccountState.setup || !this.props.value.ma.allowance) {
          return (
            <div>
              <PanelHeader bordered={true}>Deploy Proxy and Enable {name}</PanelHeader>
              <div className={styles.setupSection}>
                <CallForAction title="Deploy Proxy"
                               description={
                                 // tslint:disable
                                 ` Proxies are used in Oasis to bundle multiple transactions into one,
                                 saving transaction time and gas costs. This only has to be done once.`
                                 // tslint:enable
                               }
                               btn={
                                 mtaState !== MTAccountState.setup &&
                                 <theAppContext.Consumer>
                                   {({
                                       MTSetupButtonRxTx,
                                     }) =>
                                     <div>
                                       <MTSetupButtonRxTx/>
                                     </div>
                                   }
                                 </theAppContext.Consumer>
                               }
                               btnDisabled={mtaState === MTAccountState.setup}
                               btnLabel={<SvgImage image={tickSvg} data-test-id="step-completed"/>}
                               className={styles.setupBox}
                />
                <CallForAction title={`Enable ${name}`}
                               description={
                                 // tslint:disable
                                 `This permission allows Oasis smart contracts to interact with your {name}.
                                  This has to be done for each asset type.`
                                 // tslint:enable
                               }
                               btnLabel={
                                 this.props.value.ma.allowance
                                   ? <SvgImage image={tickSvg} data-test-id="step-completed"/>
                                   : `Enable ${name}`
                               }
                               btnAction={
                                 () =>
                                   this.props.value!.approveMTProxy(
                                     {
                                       token: ma.name,
                                       proxyAddress: mta.proxy.address
                                     }
                                   )
                               }
                               btnDisabled={this.props.value.ma.allowance}
                               className={styles.setupBox}
                />
              </div>
            </div>
          );
        }

        if (!this.props.value.ma.allowance) {
          return <div>
            Allowance not set
          </div>;
        }

        return (
          <MTMyPositionPanelInternal {...this.props.value} {...{ open: this.props.open }} />
        );
      }
    }

    return <div>
      <PanelHeader>My Position</PanelHeader>
      <LoadingIndicator/>
    </div>;
  }
}

export class MTMyPositionPanelInternal
  extends React.Component<MTMyPositionPanelInternalProps & ModalOpenerProps> {
  public render() {

    const { ma, mta } = this.props;
    const dai = findAsset('DAI', this.props.mta);

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
            <div className={styles.dropdownMenu}>
              <Button
                className={styles.dropdownButton}
                data-test-id="myposition-actions-list"
                size="md"
              >
                Deposit
              </Button>
              <div className={styles.dropdownList}>
                <Button
                  size="md"
                  className={styles.actionButton}
                  disabled={!this.props.ma.availableActions.includes(UserActionKind.fund)}
                  onClick={() => this.transfer(UserActionKind.fund, this.props.ma.name, undefined)}
                >
                  Deposit {ma.name}
                </Button>
                { dai && dai.allowance ? <>
                    <Button
                      size="md"
                      className={styles.actionButton}
                      disabled={!this.props.ma.availableActions.includes(UserActionKind.fund)}
                      onClick={() => this.transfer(UserActionKind.fund, 'DAI', this.props.ma.name)}
                    >
                      Deposit DAI
                    </Button>
                  </>
                  : <>
                    <Button
                      size="md"
                      className={styles.actionButton}
                      onClick={ this.approveMTProxy('DAI')}
                    >
                      Enable DAI
                    </Button>
                  </>
                }
              </div>
            </div>
            <div className={styles.dropdownMenu}>
              <Button
                className={styles.dropdownButton}
                data-test-id="myposition-actions-list"
                size="md"
              >
                Withdraw
              </Button>
              <div className={styles.dropdownList}>
                <Button
                  size="md"
                  className={styles.actionButton}
                  onClick={() => this.transfer(UserActionKind.draw, this.props.ma.name, undefined)}
                >
                  Withdraw {ma.name}
                </Button>
                { dai && dai.allowance ? <>
                    <Button
                      size="md"
                      className={styles.actionButton}
                      onClick={() => this.transfer(UserActionKind.draw, 'DAI', this.props.ma.name)}
                    >
                      Withdraw DAI
                    </Button>
                  </>
                  : <>
                    <Button
                      size="md"
                      className={styles.actionButton}
                      onClick={ this.approveMTProxy('DAI')}
                    >
                      Enable DAI
                    </Button>
                  </>
                }
              </div>
            </div>

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

  private approveMTProxy(token: string) {
    return () => {
      if (this.props.mta.state === MTAccountState.notSetup) {
        return;
      }
      this.props.approveMTProxy({
        token,
        proxyAddress: this.props.mta.proxy.address as string
      });
    };
  }

  private transfer (actionKind: UserActionKind, token: string, ilk: string | undefined) {
    const fundForm$ = this.props.createMTFundForm$(actionKind, token, ilk);
    const MTFundFormViewRxTx =
      connect<MTTransferFormState, ModalProps>(
        inject(
          MtTransferFormView,
          // cast is safe as CreateMTAllocateForm$Props
          // is not used inside MtTransferFormView!
          (this.props as any) as (CreateMTAllocateForm$Props & ModalOpenerProps)
        ),
        fundForm$
      );
    this.props.open(MTFundFormViewRxTx);
  }
}
