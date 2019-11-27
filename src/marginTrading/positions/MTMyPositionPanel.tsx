import * as React from 'react';
import * as styles from '../../balances/mtBalancesView.scss';
import tickSvg from '../../icons/tick.svg';
import { CallForAction } from '../../migration/CallForAction';

import { SvgImage } from '../../utils/icons/utils';
import { Loadable } from '../../utils/loadable';
import { LoadingIndicator } from '../../utils/loadingIndicator/LoadingIndicator';
import { ModalOpenerProps } from '../../utils/modal';
import { PanelBody, PanelHeader } from '../../utils/panel/Panel';
import {
  MarginableAsset, MTAccount,
  MTAccountState
} from '../state/mtAccount';
import { CreateMTFundForm$ } from '../transfer/mtTransferForm';
import { MTMyPositionView } from './MTMyPositionView';

import { Observable } from 'rxjs';
import { theAppContext } from '../../AppContext';
import { TxState } from '../../blockchain/transactions';
import { Money } from '../../utils/formatters/Formatters';
import { LoggedOut } from '../../utils/loadingIndicator/LoggedOut';
import backArrowSvg from './back-arrow.svg';

interface MTMyPositionPanelInternalProps {
  account: string | undefined;
  mta: MTAccount;
  ma: MarginableAsset;
  createMTFundForm$: CreateMTFundForm$;
  approveMTProxy: (args: { token: string; proxyAddress: string }) => Observable<TxState>;
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
          <div className={styles.referencePriceField}>
            {this.props.ma.referencePrice &&
            <Money value={this.props.ma.referencePrice} token="USD"/>
            }
          </div>
          {/*<div className={styles.dropdownMenu}>*/}
            {/*<Button*/}
              {/*className={styles.dropdownButton}*/}
              {/*data-test-id="myposition-actions-list"*/}
            {/*>*/}
              {/*<SvgImage image={dottedMenuSvg}/>*/}
            {/*</Button>*/}
            {/*/!*<div className={styles.dropdownList}>*!/*/}
            {/*/!*<div>*!/*/}
            {/*/!*<Button*!/*/}
            {/*/!*size="md"*!/*/}
            {/*/!*block={true}*!/*/}
            {/*/!*disabled={!ma.availableActions.includes(UserActionKind.draw)}*!/*/}
            {/*/!*onClick={() => this.transfer(UserActionKind.draw, 'DAI', ma.name)}*!/*/}
            {/*/!*>WITHDRAW DAI</Button>*!/*/}
            {/*/!*<br/>*!/*/}
            {/*/!*<Button*!/*/}
            {/*/!*size="md"*!/*/}
            {/*/!*block={true}*!/*/}
            {/*/!*disabled={!ma.availableActions.includes(UserActionKind.fund)}*!/*/}
            {/*/!*onClick={() => this.transfer(UserActionKind.fund, 'DAI', ma.name)}*!/*/}
            {/*/!*>DEPOSIT DAI</Button>*!/*/}
            {/*/!*<br/>*!/*/}
            {/*/!*<Button*!/*/}
            {/*/!*size="md"*!/*/}
            {/*/!*block={true}*!/*/}
            {/*/!*disabled={ma.allowance}*!/*/}
            {/*/!*onClick={() =>*!/*/}
            {/*/!*this.props.approveMTProxy(*!/*/}
            {/*/!*{ token: ma.name, proxyAddress: mta.proxy.address }*!/*/}
            {/*/!*)*!/*/}
            {/*/!*}*!/*/}
            {/*/!*>Allowance</Button>*!/*/}
            {/*/!*<br/>*!/*/}
            {/*/!*</div>*!/*/}
            {/*/!*</div>*!/*/}
          {/*</div>*/}
        </PanelHeader>
        <PanelBody>
          {<MTMyPositionView {...{
            mta,
            ma,
            open: this.props.open,
            createMTFundForm$: this.props.createMTFundForm$,
            approveMTProxy: this.props.approveMTProxy,
          }} />}
        </PanelBody>
      </div>
    );
  }

  // private transfer (actionKind: UserActionKind, token: string, ilk: string) {
  //   const fundForm$ = this.props.createMTFundForm$(actionKind, token, ilk);
  //   const MTFundFormViewRxTx =
  //     connect<MTTransferFormState, ModalProps>(
  //       inject(
  //         MtTransferFormView,
  //         // cast is safe as CreateMTAllocateForm$Props
  //         // is not used inside MtTransferFormView!
  //         (this.props as any) as (CreateMTAllocateForm$Props & ModalOpenerProps)
  //       ),
  //       fundForm$
  //     );
  //   this.props.open(MTFundFormViewRxTx);
  // }
}
