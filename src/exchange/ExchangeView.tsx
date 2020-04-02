import classnames from 'classnames';
import * as React from 'react';
import { Redirect, Route, RouteComponentProps, Switch } from 'react-router';
import { map } from 'rxjs/operators';

import { theAppContext } from '../AppContext';
import { tradingPairs } from '../blockchain/config';
import { connect } from '../utils/connect';
import { FlexLayoutRow } from '../utils/layout/FlexLayoutRow';
import { Panel } from '../utils/panel/Panel';
import * as styles from './ExchangeView.scss';
import { OfferMakePanelHooked } from './offerMake/OfferMakePanelHooked';
import { currentTradingPair$, TradingPair } from './tradingPair/tradingPair';
import { TradingPairViewHook } from './tradingPair/TradingPairView';
import { PriceChartWithLoading } from './priceChart/PriceChartWithLoading';

export interface ExchangeViewOwnProps {
  setTradingPair: (tp: TradingPair) => void;
  tp: TradingPair;
}

type ExchangeViewProps = RouteComponentProps<any> & ExchangeViewOwnProps;

interface ContentProps extends RouteComponentProps<any> {
  tp: TradingPair;
  parentMatch: string;
  setTradingPair: (tp: TradingPair) => void;
}

export const Content  = (props: ContentProps) => { 
  const {
    match: { params },
    parentMatch,
    tp,
    setTradingPair,
  } = props;

  if (tp.base !== params.base || tp.quote !== params.quote) {
    setTradingPair(params);
  }

  return (
    <div>
      <FlexLayoutRow>
        <TradingPairViewHook parentMatch={parentMatch}/>
      </FlexLayoutRow>
      <FlexLayoutRow>
        <Panel className={styles.priceChartPanel} footerBordered={true}>
          <PriceChartWithLoading/>
        </Panel>
        <Panel className={styles.allTradesPanel} footerBordered={true}>
          <theAppContext.Consumer>
            { ({ AllTradesTxRx }) =>
              <AllTradesTxRx />
            }
          </theAppContext.Consumer>
        </Panel>
      </FlexLayoutRow>
      <FlexLayoutRow>
        <Panel className={styles.offerMakePanel}>
          <OfferMakePanelHooked/>
        </Panel>
        <Panel footerBordered={true} className={styles.orderbookPanel}>
          <theAppContext.Consumer>
            { ({ OrderbookPanelTxRx }) =>
              <OrderbookPanelTxRx />
            }
          </theAppContext.Consumer>
        </Panel>
      </FlexLayoutRow>
      <FlexLayoutRow>
        <Panel className={styles.myOrdersPanel} footerBordered={true}>
          <theAppContext.Consumer>
            { ({ MyTradesTxRx }) =>
              <MyTradesTxRx />
            }
          </theAppContext.Consumer>
        </Panel>
      </FlexLayoutRow>
    </div>
  );
}

export class ExchangeView extends React.Component<ExchangeViewProps> {
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
            render={props => {

              const valid = tradingPairs.find(t =>
                t.base === tp.base && t.quote === tp.quote);

              if (!valid) {
                // It should be a redirect, but I can't make it work!
                window.location.href =
                  `${matchUrl}/${tradingPairs[0].base}/${tradingPairs[0].quote}`;
                return;
              }

              return <Content
                {...props}
                tp={tp}
                parentMatch={matchUrl}
                setTradingPair={this.props.setTradingPair}
              />;
            }}
          />
          <Redirect push={false} from={'/market'} to={`/market/${tp.base}/${tp.quote}`} />
        </Switch>
      </div>
    );
  }
}

export const ExchangeViewTxRx = connect<ExchangeViewOwnProps, RouteComponentProps<any>>(
  ExchangeView,
  currentTradingPair$.pipe(map((tp: TradingPair) => ({
    tp,
    setTradingPair: currentTradingPair$.next.bind(currentTradingPair$),
  })))
);
