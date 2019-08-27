import * as React from 'react';
import * as styles from '../../balances-mt/mtBalancesView.scss';
import { connect } from '../../utils/connect';
import { inject } from '../../utils/inject';

import { Button } from '../../utils/forms/Buttons';
import { SvgImage } from '../../utils/icons/utils';
import { LoadableWithTradingPair } from '../../utils/loadable';
import { LoadingIndicator } from '../../utils/loadingIndicator/LoadingIndicator';
import { ModalOpenerProps, ModalProps } from '../../utils/modal';
import { PanelBody, PanelHeader } from '../../utils/panel/Panel';
import { CreateMTAllocateForm$Props } from '../allocate/mtOrderAllocateDebtFormView';
import { MTSimpleFormState } from '../simple/mtOrderForm';
import {
  findMarginableAsset,
  MarginableAsset,
  MTAccountState,
  UserActionKind
} from '../state/mtAccount';
import { CreateMTFundForm$, MTTransferFormState } from '../transfer/mtTransferForm';
import { MtTransferFormView } from '../transfer/mtTransferFormView';
import { MTMyPositionView } from './MTMyPositionView';

import dottedMenuSvg from './dotted-menu.svg';

type MTMyPositionPanelProps = LoadableWithTradingPair<MTSimpleFormState> &
  ModalOpenerProps &
  { createMTFundForm$: CreateMTFundForm$ };

export class MTMyPositionPanel extends React.Component<MTMyPositionPanelProps>
{
  public render() {
    if (this.props.tradingPair.quote !== 'DAI') {
      return (
        <div>
          <PanelHeader>Create position</PanelHeader>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '357px',
            textAlign: 'center'
          }}>Choose DAI<br/> to see a position</div>
        </div>
      );
    }

    if (this.props.status === 'loaded' && this.props.value) {

      const baseToken = this.props.value.baseToken;

      const mta = this.props.value.mta;

      if (!mta || mta.state !== MTAccountState.setup) {
        return <div>Not ready!</div>;
      }

      const ma: MarginableAsset = findMarginableAsset(baseToken, mta)!;

      return (
        <div>
          <PanelHeader bordered={true}>
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
                  <button className={styles.transferBtn}
                          disabled={!ma.availableActions.includes(UserActionKind.draw)}
                          onClick={() => this.transfer(UserActionKind.draw, baseToken)}
                  >
                    Draw
                  </button>
                    <br/>
                  < button className={styles.transferBtn}
                           disabled={!ma.availableActions.includes(UserActionKind.fund)}
                           onClick={() => this.transfer(UserActionKind.fund, baseToken)}
                  >
                    Fund
                  </button>
                    <br/>
                  < button className={styles.transferBtn}
                           disabled={!ma.availableActions.includes(UserActionKind.fund)}
                           onClick={() => this.transfer(UserActionKind.fund, mta.cash.name)}
                  >
                    Payback
                  </button>
                </div>
              </div>
            </div>
          </PanelHeader>
          <PanelBody>
            {<MTMyPositionView {...ma}/>}
          </PanelBody>
        </div>
      );
    }

    return <div>
      <PanelHeader>My Position</PanelHeader>
      <LoadingIndicator />
    </div>;
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
