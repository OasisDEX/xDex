import * as React from 'react';

import { theAppContext } from 'src/AppContext';
import { TradingPair } from '../../exchange/tradingPair/tradingPair';
import { LoadableWithTradingPair } from '../../utils/loadable';
import { LoadingIndicator } from '../../utils/loadingIndicator/LoadingIndicator';
import { ModalOpenerProps } from '../../utils/modal';
import { PanelHeader } from '../../utils/panel/Panel';
import { CreateMTAllocateForm$Props } from '../allocate/mtOrderAllocateDebtFormView';
import { MTFormState } from './mtOrderForm';
import { MtOrderFormView } from './mtOrderFormView';

export class MTOrderPanel extends React.Component<TradingPair>
{
  public render() {
    if (this.props.quote !== 'DAI') {
      return (
        <div>
          <PanelHeader>Create position</PanelHeader>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '357px',
            textAlign: 'center'
          }}>Choose DAI<br/> to create a position</div>
        </div>
      );
    }
    return (
      <theAppContext.Consumer>
        { ({ MTOrderPanelInnerRxTx }) => <MTOrderPanelInnerRxTx/> }
      </theAppContext.Consumer>
    );
  }
}

export class MTOrderPanelInner
  extends React.Component<
    LoadableWithTradingPair<MTFormState> &
    ModalOpenerProps &
    CreateMTAllocateForm$Props>
{
  public render() {
    if (this.props.status === 'loaded') {
      const formState = this.props.value as MTFormState;
      return (<MtOrderFormView {...{ ...this.props, ...formState }} />);
    }
    return <div>
      <PanelHeader>Create position</PanelHeader>
      <LoadingIndicator />
    </div>;
  }
}
