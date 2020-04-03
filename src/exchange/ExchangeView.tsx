import * as React from 'react';
import { Redirect, Route, RouteComponentProps, Switch } from 'react-router';
import { map } from 'rxjs/operators';

import { tradingPairs } from '../blockchain/config';
import { connect } from '../utils/connect';
import { FlexLayoutRow } from '../utils/layout/FlexLayoutRow';
import { Panel } from '../utils/panel/Panel';
import { AllTradesHooked } from './allTrades/AllTradesView';
import * as styles from './ExchangeView.scss';
import { MyTradesHooked } from './myTrades/MyTradesView';
import { OfferMakePanelHooked } from './offerMake/OfferMakePanelHooked';
import { OrderbookHooked } from './OrderbookPanel';
import { PriceChartWithLoading } from './priceChart/PriceChartWithLoading';
import { currentTradingPair$, TradingPair } from './tradingPair/tradingPair';
import { TradingPairViewHook } from './tradingPair/TradingPairView';

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
          <AllTradesHooked/>
        </Panel>
      </FlexLayoutRow>
      <FlexLayoutRow>
        <Panel className={styles.offerMakePanel}>
          <OfferMakePanelHooked/>
        </Panel>
        <Panel footerBordered={true} className={styles.orderbookPanel}>
          <OrderbookHooked/>
        </Panel>
      </FlexLayoutRow>
      <FlexLayoutRow>
        <Panel className={styles.myOrdersPanel} footerBordered={true}>
          <MyTradesHooked/>
        </Panel>
      </FlexLayoutRow>
    </div>
  );
};

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
