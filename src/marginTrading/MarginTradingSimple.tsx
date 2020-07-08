/*
 * Copyright (C) 2020 Maker Ecosystem Growth Holdings, INC.
 */

import * as React from 'react';
import { Redirect, Route, RouteComponentProps, Switch } from 'react-router';
import { map } from 'rxjs/operators';

import { theAppContext } from '../AppContext';
import { currentTradingPair$, TradingPair } from '../exchange/tradingPair/tradingPair';
import { connect } from '../utils/connect';
import { FlexLayoutRow } from '../utils/layout/FlexLayoutRow';
import { Panel } from '../utils/panel/Panel';

import { AllTradesHooked } from 'src/exchange/allTrades/AllTradesView';
import { PriceChartWithLoading } from 'src/exchange/priceChart/PriceChartWithLoading';
import { TradingPairViewHook } from 'src/exchange/tradingPair/TradingPairView';
import * as styles from './MarginTradingSimple.scss';
import { OrderbookHooked } from 'src/exchange/OrderbookPanel';
import { MTSimpleOrderPanel } from './simple/mtOrderPanel';
import { MTLiquidationNotification, MTMyPositionPanel } from './positions/MTMyPositionPanel';
import { useObservable } from 'src/utils/observableHook';

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
        <TradingPairViewHook parentMatch={parentMatch} />
      </FlexLayoutRow>
      <FlexLayoutRow>
        <MTLiquidationNotification />
      </FlexLayoutRow>
      <FlexLayoutRow>
        <Panel className={styles.priceChartPanel} footerBordered={true}>
          <PriceChartWithLoading />
        </Panel>
        <Panel className={styles.allTradesPanel} footerBordered={true}>
          <AllTradesHooked />
        </Panel>
      </FlexLayoutRow>
      <FlexLayoutRow>
        <Panel className={styles.orderFormPanel}>
          <MTSimpleOrderPanel />
        </Panel>
        <Panel className={styles.orderBookPanel}>
          <OrderbookHooked />
        </Panel>
      </FlexLayoutRow>
      <FlexLayoutRow>
        <MTMyPositionPanel />
      </FlexLayoutRow>
    </div>
  );
};

export function MarginTradingSimple(props: any) {
  const state = useObservable(
    currentTradingPair$.pipe(
      map((tp: TradingPair) => ({
        tp,
        setTradingPair: currentTradingPair$.next.bind(currentTradingPair$),
      })),
    ),
  );

  if (!state) return null;

  const { tp } = state as MarginTradingProps;

  const {
    match: { url: matchUrl },
  } = props;

  return (
    <div>
      <Switch>
        <Route
          path={`${matchUrl}/:base/:quote`}
          render={(props) => (
            <Content {...props} tp={tp} parentMatch={matchUrl} setTradingPair={state.setTradingPair} />
          )}
        />
        <Redirect push={true} from={'/multiply'} to={`/multiply/${tp.base}/${tp.quote}`} />
      </Switch>
    </div>
  );
}
