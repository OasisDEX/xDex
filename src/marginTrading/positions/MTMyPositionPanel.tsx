import * as React from 'react';

import { CDPHistoryView } from '../../balances-mt/CDPHistoryView';
import { LoadableWithTradingPair } from '../../utils/loadable';
import { LoadingIndicator } from '../../utils/loadingIndicator/LoadingIndicator';
import { PanelBody, PanelHeader } from '../../utils/panel/Panel';
import { MTSimpleFormState } from '../simple/mtOrderForm';
import { findMarginableAsset, MTAccountState } from '../state/mtAccount';
import { MTMyPositionView } from './MTMyPositionView';

export class MTMyPositionPanel
  extends React.Component<LoadableWithTradingPair<MTSimpleFormState>>
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
      const mta = this.props.value.mta;
      const ma = mta && mta.state === MTAccountState.setup &&
          findMarginableAsset(this.props.value.baseToken, mta)!;

      return (
        <div>
          <PanelHeader>
            My Position
          </PanelHeader>
          <PanelBody>
            {ma && <MTMyPositionView {...ma}/>}
            {ma && <CDPHistoryView {...ma}/>}
          </PanelBody>
        </div>
      );
    }

    return <div>
      <PanelHeader>My Position</PanelHeader>
      <LoadingIndicator />
    </div>;
  }
}
