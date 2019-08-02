import * as React from 'react';

// import { theAppContext } from 'src/AppContext';
// import { TradingPair } from '../../exchange/tradingPair/tradingPair';
import { LoadableWithTradingPair } from '../../utils/loadable';
import { LoadingIndicator } from '../../utils/loadingIndicator/LoadingIndicator';
import { PanelHeader } from '../../utils/panel/Panel';
import { MTSimpleFormState } from './mtOrderForm';
import { MtSimpleOrderFormView } from './mtOrderFormView';

export class MTSimpleOrderPanel
  extends React.Component<
    LoadableWithTradingPair<MTSimpleFormState>>
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
          }}>Choose DAI<br/> to create a position</div>
        </div>
      );
    }

    if (this.props.status === 'loaded') {
      const formState = this.props.value as MTSimpleFormState;
      return (<MtSimpleOrderFormView {...{ ...this.props, ...formState }} />);
    }

    return <div>
      <PanelHeader>Create position</PanelHeader>
      <LoadingIndicator />
    </div>;
  }
}
