/*
 * Copyright (C) 2020 Maker Ecosystem Growth Holdings, INC.
 */

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

import { Banner } from '../landingPage/Banner';
import * as styles from './MarginTradingSimple.scss';

export interface MarginTradingOwnProps {
  setTradingPair: (tp: TradingPair) => void;
  tp: TradingPair;
}

export type MarginTradingProps = RouteComponentProps<any> & MarginTradingOwnProps;

const bannerStyle: React.CSSProperties = {
  width: '85%',
  textAlign: 'center',
  margin: 'auto',
};

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
      <div style={{ marginBottom: '1.75rem' }}>
        <Banner
          content={
            /* tslint:disable */
            <div style={bannerStyle}>
              You are currently accessing a <strong>beta version</strong> of Oasis Multiply Trading, which may contain
              bugs and usability issues. Please use this feature with caution.
              You can read more about this release <a href="https://blog.oasis.app/introducing-multiply-on-oasis-trade/" target="_blank">here</a>.
            </div>
            /* tslint:enable */
          }
          theme="warning"
        />
      </div>
      <FlexLayoutRow>
        <Panel className={styles.tradingPairPanel}>
          <theAppContext.Consumer>
            {({ TradingPairsTxRx }) => (
              // @ts-ignore
              <TradingPairsTxRx parentMatch={parentMatch} />
            )}
          </theAppContext.Consumer>
        </Panel>
      </FlexLayoutRow>
      <FlexLayoutRow>
        <theAppContext.Consumer>
          {({ MTLiquidationNotificationRxTx }) => (
            // @ts-ignore
            <MTLiquidationNotificationRxTx />
          )}
        </theAppContext.Consumer>
      </FlexLayoutRow>
      <FlexLayoutRow>
        <Panel className={styles.priceChartPanel} footerBordered={true}>
          <theAppContext.Consumer>
            {({ PriceChartWithLoadingTxRx }) => <PriceChartWithLoadingTxRx />}
          </theAppContext.Consumer>
        </Panel>
        <Panel className={styles.allTradesPanel} footerBordered={true}>
          <theAppContext.Consumer>{({ AllTradesTxRx }) => <AllTradesTxRx />}</theAppContext.Consumer>
        </Panel>
      </FlexLayoutRow>
      <FlexLayoutRow>
        <Panel className={styles.orderFormPanel}>
          <theAppContext.Consumer>{({ MTSimpleOrderPanelRxTx }) => <MTSimpleOrderPanelRxTx />}</theAppContext.Consumer>
        </Panel>
        <Panel className={styles.orderBookPanel}>
          <theAppContext.Consumer>
            {({ MTSimpleOrderbookPanelTxRx }) => <MTSimpleOrderbookPanelTxRx />}
          </theAppContext.Consumer>
        </Panel>
      </FlexLayoutRow>
      <FlexLayoutRow>
        <theAppContext.Consumer>
          {({ MTMyPositionPanelRxTx }) => (
            // @ts-ignore
            <MTMyPositionPanelRxTx />
          )}
        </theAppContext.Consumer>
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
            render={(props) => (
              <Content {...props} tp={tp} parentMatch={matchUrl} setTradingPair={this.props.setTradingPair} />
            )}
          />
          <Redirect push={true} from={'/multiply'} to={`/multiply/${tp.base}/${tp.quote}`} />
        </Switch>
      </div>
    );
  }
}

export const MarginTradingSimpleTxRx = connect<MarginTradingOwnProps, RouteComponentProps<any>>(
  MarginTradingSimple,
  currentTradingPair$.pipe(
    map((tp: TradingPair) => ({
      tp,
      setTradingPair: currentTradingPair$.next.bind(currentTradingPair$),
    })),
  ),
);
