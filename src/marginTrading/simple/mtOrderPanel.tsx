import * as React from 'react';
import { Link } from 'react-router-dom';
import { AssetKind, getToken, tradingPairs } from '../../blockchain/config';
import { routerContext } from '../../Main';
import { LoadableWithTradingPair } from '../../utils/loadable';
import { LoadingIndicator } from '../../utils/loadingIndicator/LoadingIndicator';
import { ModalOpenerProps } from '../../utils/modal';
import { PanelBody, PanelHeader } from '../../utils/panel/Panel';
import { CreateMTFundForm$ } from '../transfer/mtTransferForm';
import { MTSimpleFormState } from './mtOrderForm';
import { MtSimpleOrderFormView } from './mtOrderFormView';
import * as styles from './mtOrderFormView.scss';

export interface MTSimpleOrderPanelProps {
  createMTFundForm$: CreateMTFundForm$;
}

export class MTSimpleOrderPanel extends React.Component<
  LoadableWithTradingPair<MTSimpleFormState> & MTSimpleOrderPanelProps & ModalOpenerProps
> {
  public render() {
    if (
      getToken(this.props.tradingPair.base).assetKind !== AssetKind.marginable ||
      this.props.tradingPair.quote !== 'DAI'
    ) {
      const marginablePairs = tradingPairs.filter(
        ({ base, quote }) => getToken(base).assetKind === AssetKind.marginable && quote === 'DAI',
      );

      return (
        <>
          <PanelHeader>Manage Your Leverage</PanelHeader>
          <PanelBody className={styles.orderPanel}>
            Leverage trading is enabled only on following markets:
            {marginablePairs.map(({ base, quote }) => (
              <routerContext.Consumer key={base}>
                {({ rootUrl }) => (
                  <>
                    {marginablePairs.length > 1 && <>, </>}
                    <Link to={`${rootUrl}leverage/${base}/${quote}`} style={{ whiteSpace: 'nowrap' }}>
                      {base}
                    </Link>
                  </>
                )}
              </routerContext.Consumer>
            ))}
          </PanelBody>
        </>
      );
    }

    if (this.props.status === 'loaded' && this.props.value && this.props.value.mta) {
      const formState = this.props.value;
      return <MtSimpleOrderFormView {...{ ...this.props, ...formState }} />;
    }

    return (
      <div className={styles.orderPanel}>
        <PanelHeader style={{ width: '100%' }}>Manage Your Leverage</PanelHeader>
        <LoadingIndicator size="lg" />
      </div>
    );
  }
}
