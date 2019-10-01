import * as React from 'react';
import * as styles from '../../balances-mt/mtBalancesView.scss';
import { connect } from '../../utils/connect';
import { inject } from '../../utils/inject';

import { Button } from '../../utils/forms/Buttons';
import { SvgImage } from '../../utils/icons/utils';
import { Loadable, LoadableWithTradingPair } from '../../utils/loadable';
import { LoadingIndicator } from '../../utils/loadingIndicator/LoadingIndicator';
import { ModalOpenerProps, ModalProps } from '../../utils/modal';
import { PanelBody, PanelHeader } from '../../utils/panel/Panel';
import { CreateMTAllocateForm$Props } from '../allocate/mtOrderAllocateDebtFormView';
import { MTSimpleFormState } from '../simple/mtOrderForm';
import {
  findMarginableAsset,
  MarginableAsset, MTAccount,
  MTAccountState,
  UserActionKind
} from '../state/mtAccount';
import { CreateMTFundForm$, MTTransferFormState } from '../transfer/mtTransferForm';
import { MtTransferFormView } from '../transfer/mtTransferFormView';
import { MTMyPositionView } from './MTMyPositionView';

import { Observable } from 'rxjs/index';
import { theAppContext } from '../../AppContext';
import { TxState } from '../../blockchain/transactions';
import { LoggedOut } from '../../utils/loadingIndicator/LoggedOut';
import backArrowSvg from './back-arrow.svg';
import checkSvg from './check.svg';
import dottedMenuSvg from './dotted-menu.svg';

interface MTMyPositionPanelInternalProps {
  account: string | undefined;
  mta: MTAccount;
  ma: MarginableAsset;
  createMTFundForm$: CreateMTFundForm$;
  approveMTProxy: (args: { token: string; proxyAddress: string }) => Observable<TxState>;
  close?: () => void;
}

export class MTMyPositionPanel
  extends React.Component<Loadable<MTMyPositionPanelInternalProps> & ModalOpenerProps>
{
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
                <div className={styles.setupBox}>
                  <div className={styles.setupTitle}>Deploy Proxy</div>
                  <div className={styles.setupDescription}>
                    Proxies are used in Oasis to bundle multiple transactions into one,
                    saving transaction time and gas costs. This only has to be done once.
                  </div>
                  { mtaState !== MTAccountState.setup ?
                    <theAppContext.Consumer>
                     { ({ MTSetupButtonRxTx,
                     }) =>
                       <div>
                           <MTSetupButtonRxTx/>
                       </div>
                     }
                    </theAppContext.Consumer>
                    // <Button size="lg">Deploy Proxy</Button>
                    :
                    <Button
                      size="lg"
                      disabled={true}
                      className={styles.buttonCheck}
                    >
                      <SvgImage image={checkSvg}/>
                    </Button>
                  }
                </div>
                <div className={styles.setupBox}>
                  <div className={styles.setupTitle}>Enable {name}</div>
                  <div className={styles.setupDescription}>
                    This permission allows Oasis smart contracts to interact with your {name}.
                    This has to be done for each asset type.
                  </div>
                  <Button
                    size="lg"
                    onClick={() =>
                      this.props.value!.approveMTProxy(
                        {
                          token: ma.name,
                          proxyAddress: mta.proxy.address
                        }
                      )}
                  >Enable {name}</Button>
                </div>
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
      <LoadingIndicator />
    </div>;
  }
}

export class MTMyPositionPanelInternal
  extends React.Component<MTMyPositionPanelInternalProps & ModalOpenerProps>
{
  public render() {

    const { ma, mta } = this.props;
    return (
      <div>
        <PanelHeader bordered={true}>
          { this.props.close &&
            <div
              className={styles.backButton}
              onClick={this.props.close}
            ><SvgImage image={backArrowSvg}/></div>
          }
          <span>My Position</span>
          <div className={styles.dropdownMenu} style={{ marginLeft: 'auto', display: 'flex' }}>
            <Button
              className={styles.dropdownButton}
              data-test-id="myposition-actions-list"
            >
              <SvgImage image={dottedMenuSvg}/>
            </Button>
            <div className={styles.dropdownList}>
              <div>
                <Button
                  size="md"
                  block={true}
                  disabled={!ma.availableActions.includes(UserActionKind.draw)}
                  onClick={() => this.transfer(UserActionKind.draw, ma.name)}
                >Draw</Button>
                <br/>
                <Button
                  size="md"
                  block={true}
                  disabled={ma.allowance}
                  onClick={() =>
                    this.props.approveMTProxy(
                      { token: ma.name, proxyAddress: mta.proxy.address }
                    )
                  }
                >Allowance</Button>
                <br/>
                <Button
                  size="md"
                  block={true}
                  disabled={!ma.availableActions.includes(UserActionKind.fund)}
                  onClick={() => this.transfer(UserActionKind.fund, ma.name)}
                >Fund</Button>
                <br/>
                <Button
                  size="md"
                  block={true}
                  disabled={!ma.availableActions.includes(UserActionKind.fund)}
                  onClick={() => this.transfer(UserActionKind.fund, mta.cash.name)}
                >Payback</Button>
              </div>
            </div>
          </div>
        </PanelHeader>
        <PanelBody>
          {<MTMyPositionView {...{
            ma,
            open: this.props.open,
            createMTFundForm$: this.props.createMTFundForm$,
            approveMTProxy: this.props.approveMTProxy,
          }} />}
        </PanelBody>
      </div>
    );
  }
  private transfer (actionKind: UserActionKind, token: string) {
    const fundForm$ = this.props.createMTFundForm$(actionKind, token);
    const MTFundFormViewRxTx =
      connect<MTTransferFormState, ModalProps>(
        inject(
          MtTransferFormView,
          // cast is safe as CreateMTAllocateForm$Props
          // is not used inside MtTransferFormView!
          (this.props as any) as (CreateMTAllocateForm$Props & ModalOpenerProps),
        ),
        fundForm$
      );
    this.props.open(MTFundFormViewRxTx);
  }
}
