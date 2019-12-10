import * as React from 'react';
import { Hr } from '../../utils/layout/LayoutHelpers';
import { LoadableWithTradingPair } from '../../utils/loadable';
import { LoadingIndicator } from '../../utils/loadingIndicator/LoadingIndicator';
import { PanelHeader } from '../../utils/panel/Panel';
import { zero } from '../../utils/zero';
import {findAsset, findMarginableAsset, MarginableAsset, UserActionKind} from '../state/mtAccount';
import {CreateMTFundForm$, MTTransferFormState} from '../transfer/mtTransferForm';
import { MTSimpleFormState } from './mtOrderForm';
import { MtSimpleOrderFormView } from './mtOrderFormView';
import * as styles from './mtOrderFormView.scss';
import {ModalOpenerProps, ModalProps} from "../../utils/modal";
import {MtTransferFormView} from "../transfer/mtTransferFormView";
import {connect} from "../../utils/connect";
import {CreateMTAllocateForm$Props} from "../allocate/mtOrderAllocateDebtFormView";
import {inject} from "../../utils/inject";

const dimensions = {
  height: '605px',
  minWidth: '454px',
  width: 'auto',
};

interface MTSimpleOrderPanelProps {
  createMTFundForm$: CreateMTFundForm$;
}

export class MTSimpleOrderPanel extends React.Component<
  LoadableWithTradingPair<MTSimpleFormState>
  & MTSimpleOrderPanelProps
  & ModalOpenerProps
> {
  public render() {
    if (this.props.tradingPair.quote !== 'DAI') {
      return (
        <div>
          <PanelHeader>Instant Order</PanelHeader>
          <div style={{
            ...dimensions,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center'
          }}>Choose DAI<br/> to create a position
          </div>
        </div>
      );
    }

    if (this.props.status === 'loaded') {
      const formState = this.props.value as MTSimpleFormState;

      // TODO add loader when no ma!

      const { mta } = formState;
      const ma = findMarginableAsset(formState.baseToken, mta);
      if (mta && mta.proxy && ma && (ma.balance.gt(zero) || ma.dai.gt(zero))) {
        return (<MtSimpleOrderFormView {...{ ...this.props, ...formState }} />);
      }

      return (this.CallForDeposit(ma));

    }

    return <div style={dimensions}>
      <PanelHeader>Instant Order</PanelHeader>
      <Hr color="dark" className={styles.hrSmallMargin}/>
      {/* TODO: Loading should be centered in the remaining space*/}
      <LoadingIndicator size="lg"/>
    </div>;
  }

  public CallForDeposit(ma?: MarginableAsset) {
    return (
        <>
          <button
            disabled={!ma}
            onClick={() => this.transfer(UserActionKind.fund, 'DAI', ma!.name)}
          >Deposit DAI</button>
          <button
            disabled={!ma}
            onClick={() => this.transfer(UserActionKind.fund, ma!.name, ma!.name)}
          >Deposit {ma && ma!.name}</button>
        </>
    );
  }

  public transfer (actionKind: UserActionKind, token: string, ilk?: string) {
    const fundForm$ = this.props.createMTFundForm$(actionKind, token, ilk);
    const MTFundFormViewRxTx =
      connect<MTTransferFormState, ModalProps>(
        MtTransferFormView,
        fundForm$
      );
    this.props.open(MTFundFormViewRxTx);
  }
}
