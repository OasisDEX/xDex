import * as React from 'react';
import { LoadableWithTradingPair } from '../../utils/loadable';
import { LoadingIndicator } from '../../utils/loadingIndicator/LoadingIndicator';
import { ModalOpenerProps } from '../../utils/modal';
import { PanelBody, PanelHeader } from '../../utils/panel/Panel';
import { CreateMTFundForm$ } from '../transfer/mtTransferForm';
import { MTSimpleFormState } from './mtOrderForm';
import { MtSimpleOrderFormView } from './mtOrderFormView';
import * as styles from './mtOrderFormView.scss';
import { LoggedOut } from 'src/utils/loadingIndicator/LoggedOut';

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

    if (
      this.props.status === 'loaded'
      && this.props.value
      && this.props.value.mta
      && this.props.value.account
    ) {
      const formState = this.props.value;
      return (<MtSimpleOrderFormView {...{ ...this.props, ...formState }} />);
    }

    return <div className={styles.orderPanel}>
      <PanelHeader style={{ width: '100%'}}>Manage Your Leverage</PanelHeader>
      {
        this.props.status === 'loaded' && !this.props.value?.account
        ? <LoggedOut view="Leverage Trading form"/>
        : <LoadingIndicator size="lg"/>
      }
    </div>;
  }
}
