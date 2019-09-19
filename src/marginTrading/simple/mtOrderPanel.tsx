import * as React from 'react';
import { theAppContext } from '../../AppContext';
import { Hr } from '../../utils/layout/LayoutHelpers';
import { LoadableWithTradingPair } from '../../utils/loadable';
import { LoadingIndicator } from '../../utils/loadingIndicator/LoadingIndicator';
import { PanelHeader } from '../../utils/panel/Panel';
import { MTAccountState } from '../state/mtAccount';
import { MTSimpleFormState } from './mtOrderForm';
import { MtSimpleOrderFormView } from './mtOrderFormView';
import * as styles from './mtOrderFormView.scss';

const dimensions = {
  height: '605px',
  minWidth: '454px',
  width: 'auto',
};

export class MTSimpleOrderPanel
  extends React.Component<LoadableWithTradingPair<MTSimpleFormState>> {
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

      return (<MtSimpleOrderFormView {...{ ...this.props, ...formState }} />);
    }

    return <div style={dimensions}>
      <PanelHeader>Instant Order</PanelHeader>
      <Hr color="dark" className={styles.hrSmallMargin}/>
      {/* TODO: Loading should be centered in the remaining space*/}
      <LoadingIndicator size="lg"/>
    </div>;
  }
}
