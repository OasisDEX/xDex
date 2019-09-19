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
    if (this.props.value && !this.props.value.account) {
      return (<div>Account not connected</div>);
    }

    if (this.props.status === 'loaded' && this.props.value && this.props.value.mta) {

      const mtaState = this.props.value.mta.state;
      if (mtaState !== MTAccountState.setup) {
        return <div>
          <theAppContext.Consumer>
            { ({ MTSetupButtonRxTx,
               }) =>
              <div>
                <MTSetupButtonRxTx/>
              </div>
            }
          </theAppContext.Consumer>
        </div>;
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
          <span>My Position</span>

          { this.props.close && <div onClick={this.props.close}>Close</div> }
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
          {<MTMyPositionView {...ma } {...{ pnl: ma.pnl }} />}
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
