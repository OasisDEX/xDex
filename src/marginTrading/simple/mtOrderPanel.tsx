import * as React from 'react';
import { LoadableWithTradingPair } from '../../utils/loadable';
import { LoadingIndicator } from '../../utils/loadingIndicator/LoadingIndicator';
import { ModalOpenerProps } from '../../utils/modal';
import { PanelHeader, PanelBody, Panel } from '../../utils/panel/Panel';
import { CreateMTFundForm$ } from '../transfer/mtTransferForm';
import { MTSimpleFormState } from './mtOrderForm';
import { MtSimpleOrderFormView } from './mtOrderFormView';
import * as styles from './mtOrderFormView.scss';

export interface MTSimpleOrderPanelProps {
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
        <>
          <PanelHeader>Manage Your Leverage</PanelHeader>
          <PanelBody  className={styles.orderPanel}>
             Choose a DAI Market to create a position
          </PanelBody>
        </>
      );
    }

    if (this.props.status === 'loaded' && this.props.value && this.props.value.mta) {
      const formState = this.props.value;
      return (<MtSimpleOrderFormView {...{ ...this.props, ...formState }} />);
    }

    return <div className={styles.orderPanel}>
      <PanelHeader>Manage Your Leverage</PanelHeader>
      <LoadingIndicator size="lg"/>
    </div>;
  }
}
