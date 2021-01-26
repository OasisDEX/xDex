/*
 * Copyright (C) 2020 Maker Ecosystem Growth Holdings, INC.
 */

import createBrowserHistory from 'history/createBrowserHistory';
import * as React from 'react';
import { Redirect, Route, Router, Switch } from 'react-router';
import { RouteComponentProps, withRouter } from 'react-router-dom';
import { isMarketClosed } from './blockchain/config';

import { map } from 'rxjs/operators';
import { trackingEvents } from './analytics/analytics';
import { setupAppContext, theAppContext } from './AppContext';
import { BalancesView } from './balances/BalancesView';
import { WalletStatus, walletStatus$ } from './blockchain/wallet';
import { ExchangeViewHooked } from './exchange/ExchangeView';
import { TheFooterHooked } from './footer/Footer';
import { HeaderHooked } from './header/Header';
import * as styles from './index.scss';
import { InstantExchange } from './instant/InstantViewPanel';
import { Banner } from './landingPage/Banner';
import { MarginTradingSimple } from './marginTrading/MarginTradingSimple';
import { TransactionNotifierHooked } from './transactionNotifier/TransactionNotifierView';
import { SetupModal } from './utils/modalHook';
import { useObservable } from './utils/observableHook';

const { REACT_APP_INSTANT_ENABLED, REACT_APP_LT_ENABLED, REACT_APP_SUBDIR } = process.env;

const browserHistoryInstance = createBrowserHistory({
  basename: REACT_APP_SUBDIR ? REACT_APP_SUBDIR : '/',
});

browserHistoryInstance.listen((location) => {
  trackingEvents.pageView(location.pathname);
});

export const Main = () => {
  return (
    <theAppContext.Provider value={setupAppContext()}>
      <SetupModal>
        <Router history={browserHistoryInstance}>
          <MainContentWithRouter />
        </Router>
      </SetupModal>
    </theAppContext.Provider>
  );
};

export interface RouterProps extends RouteComponentProps<any> {}

export const MainContent = (props: RouterProps) => {
  const routesState = useObservable(
    walletStatus$.pipe(
      map((status) => ({
        status,
      })),
    ),
  );

  if (!routesState) return null;

  return (
    <routerContext.Provider value={{ rootUrl: props.match.url }}>
      <div className={styles.container}>
        <TransactionNotifierHooked />
        {
          isMarketClosed
          ? <Banner content={
              <span>
                {/*tslint:disable*/}
                This version of the UI uses an OasisDEX contract which expired on 04.02.2021.
                <br/>
                <strong> You should cancel any open orders you have and move your liquidity to the new contract.<br/>
                You can find the latest contract and markets at { ' ' }
                <a 
                  href="https://oasis.app/trade" 
                  target="_blank"
                  rel="noopener noreferrer"
                >Oasis.app/trade</a>.</strong>
              </span>
            }
            theme='warning'/>
          : <Banner content={
              <span>
                {/*tslint:disable*/}
                The current OasisDEX contract used by Oasis Trade will be closing on 04.02.2021 and replaced with a new contract. 
                <br/>
                <strong> Please see { ' ' }
                  <a href="https://oasisdex.com/docs/announcements/oasis1-1" 
                     target="_blank"
                     rel="noopener noreferrer"
                  >
                    this announcement
                  </a> 
                  { ' ' }
                  for more details
                </strong>
                </span>
              }
            theme='warning'/>
        }
        <HeaderHooked />
        <Routes {...routesState} />
        <TheFooterHooked />
      </div>
    </routerContext.Provider>
  );
};

const Routes = ({ status }: { status: WalletStatus }) => {
  return (
    <Switch>
      <Route exact={false} path={'/market'} component={ExchangeViewHooked} />
      {REACT_APP_INSTANT_ENABLED === '1' && <Route exact={false} path={'/instant'} component={InstantExchange} />}
      {status === 'connected' && <Route path={'/balances'} component={BalancesView} />}
      {REACT_APP_LT_ENABLED === '1' && status === 'connected' && (
        <Route path={'/multiply'} component={MarginTradingSimple} />
      )}
      <Redirect from={'/account'} to={'/balances'} />
      <Redirect from={'/'} to={'/market'} />
    </Switch>
  );
};

const MainContentWithRouter = withRouter(MainContent);

interface RouterContext {
  rootUrl: string;
}

export const routerContext = React.createContext<RouterContext>({ rootUrl: '/' });
