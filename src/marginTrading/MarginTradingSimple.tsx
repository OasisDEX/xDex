import * as React from 'react';
import { Redirect, Route, RouteComponentProps, Switch } from 'react-router';
import { map } from 'rxjs/operators';

import { theAppContext } from '../AppContext';
// import { MyTradesTxRx } from '../exchange/myTrades/MyTradesView';
// import { OrderbookPanelTxRx } from '../exchange/OrderbookPanel';
// import { PriceChartWithLoadingTxRx } from '../exchange/priceChart/PriceChartWithLoading';
import { currentTradingPair$, TradingPair } from '../exchange/tradingPair/tradingPair';
import { connect } from '../utils/connect';
import { FlexLayoutRow } from '../utils/layout/FlexLayoutRow';
import { Panel } from '../utils/panel/Panel';
import * as styles from './MarginTrading.scss';

export interface MarginTradingOwnProps {
  setTradingPair: (tp: TradingPair) => void;
  tp: TradingPair;
}

export type MarginTradingProps = RouteComponentProps<any> & MarginTradingOwnProps;

const Content = (props: any | { parentMatch: string }) => {
  const {
    match: { params },
    parentMatch,
  } = props;
  if (props.tp.base !== params.base || props.tp.quote !== params.quote) {
    props.setTradingPair(params);
  }

  return (
    <div>
      <FlexLayoutRow>
        <Panel style={{ flexGrow: 1 }} className={styles.panelOther}>
          <theAppContext.Consumer>
            { ({ TradingPairsTxRx }) =>
              // @ts-ignore
              <TradingPairsTxRx parentMatch={parentMatch} />
            }
          </theAppContext.Consumer>
        </Panel>
      </FlexLayoutRow>
      <FlexLayoutRow>
        <Panel style={{ height: '470px', marginRight: '24px', flexGrow: 1 }}
               className={styles.panelOther}>
          <theAppContext.Consumer>
            { ({ MTSimpleOrderPanelRxTx }) => <MTSimpleOrderPanelRxTx /> }
          </theAppContext.Consumer>
        </Panel>
        <Panel className={styles.panelOther}>
          <theAppContext.Consumer>
            { ({ MTSimpleOrderbookPanelTxRx }) => <MTSimpleOrderbookPanelTxRx /> }
          </theAppContext.Consumer>
        </Panel>
      </FlexLayoutRow>
      <FlexLayoutRow>
        <Panel style={{ flexGrow: 1 }} className={styles.panelOther}>
          <theAppContext.Consumer>
            { ({ MTMyPositionPanelRxTx }) =>
              // @ts-ignore
              <MTMyPositionPanelRxTx/>
            }
          </theAppContext.Consumer>
        </Panel>
      </FlexLayoutRow>
    </div>
  );
};

export class MarginTradingSimple extends React.Component<MarginTradingProps> {
  public render() {
    const {
      match: { url: matchUrl },
      tp,
    } = this.props;

    return (
      <div>
        <Switch>
          <Route
            path={`${matchUrl}/:base/:quote`}
            render={props => (
              <Content
                {...props}
                tp={tp}
                parentMatch={matchUrl}
                setTradingPair={this.props.setTradingPair}
              />
            )}
          />
          <Redirect push={true}
                    from={'/margin-trading-simple'}
                    to={`/margin-trading-simple/${tp.base}/${tp.quote}`} />
        </Switch>
      </div>
    );
  }
}

export const MarginTradingSimpleTxRx = connect<MarginTradingOwnProps, RouteComponentProps<any>>(
  MarginTradingSimple,
  currentTradingPair$.pipe(map((tp: TradingPair) => ({
    tp,
    setTradingPair: currentTradingPair$.next.bind(currentTradingPair$),
  })))
);
