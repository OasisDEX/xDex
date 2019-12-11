import * as React from 'react';
import { connect } from '../../utils/connect';
import { Button } from '../../utils/forms/Buttons';
import { LoadableWithTradingPair } from '../../utils/loadable';
import { LoadingIndicator } from '../../utils/loadingIndicator/LoadingIndicator';
import { ModalOpenerProps, ModalProps } from '../../utils/modal';
import { PanelHeader } from '../../utils/panel/Panel';
import { zero } from '../../utils/zero';
import { findMarginableAsset, MarginableAsset, UserActionKind } from '../state/mtAccount';
import { CreateMTFundForm$, MTTransferFormState } from '../transfer/mtTransferForm';
import { MtTransferFormView } from '../transfer/mtTransferFormView';
import { MTSimpleFormState } from './mtOrderForm';
import { MtSimpleOrderFormView } from './mtOrderFormView';
import * as styles from './mtOrderFormView.scss';

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
          <div className={styles.orderPanel}>Choose DAI<br/> to create a position
          </div>
        </div>
      );
    }

    if (this.props.status === 'loaded' && this.props.value && this.props.value.mta) {
      const formState = this.props.value;
      const { mta } = formState;
      const ma = findMarginableAsset(formState.baseToken, mta);

      if (mta && mta.proxy && ma && (ma.balance.gt(zero) || ma.dai.gt(zero))) {
        return (<MtSimpleOrderFormView {...{ ...this.props, ...formState }} />);
      }

      return (this.CallForDeposit(ma));
    }

    return <div className={styles.orderPanel}>
      <PanelHeader>Instant Order</PanelHeader>
      <LoadingIndicator size="lg"/>
    </div>;
  }

  public CallForDeposit(ma?: MarginableAsset) {
    return (
        <div className={styles.onboardingPanel} style={dimensions}>
          <h3>Deposit into Leverage Account</h3>
          <div className={styles.onboardingParagraph}>
            Before opening a new position, deposit WETH<br/>
            or DAI into your Leverage Trading Account
          </div>

          <Button
            size="md"
            color="primary"
            disabled={!ma}
            onClick={() => this.transfer(UserActionKind.fund, 'DAI', ma!.name)}
          >Deposit DAI</Button>
          <br/>
          <Button
            size="md"
            color="primary"
            disabled={!ma}
            onClick={() => this.transfer(UserActionKind.fund, ma!.name, ma!.name)}
          >Deposit {ma && ma.name}</Button>
        </div>
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
