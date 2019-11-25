import createBrowserHistory from 'history/createBrowserHistory';
import * as React from 'react';
import { Redirect, Route, Router, Switch } from 'react-router';
import { RouteComponentProps, withRouter } from 'react-router-dom';

import * as mixpanel from 'mixpanel-browser';
import { default as MediaQuery }from 'react-responsive';
import { map } from 'rxjs/operators';
import { setupAppContext, theAppContext } from './AppContext';
import { BalancesView } from './balances-mt/BalancesView';
import { WalletStatus, walletStatus$ } from './blockchain/wallet';
import { ExchangeViewTxRx } from './exchange/ExchangeView';
import { HeaderTxRx } from './header/Header';
import * as styles from './index.scss';
import { InstantExchange } from './instant/InstantViewPanel';
import { Banner } from './landingPage/Banner';
import { MarginTradingSimpleTxRx } from './marginTrading/MarginTradingSimple';
import { connect } from './utils/connect';

const browserHistoryInstance = createBrowserHistory({
  basename: process.env.REACT_APP_SUBDIR ? process.env.REACT_APP_SUBDIR : '/'
});

browserHistoryInstance.listen(location => {
  mixpanel.track('Pageview', {
    product: 'oasis-trade',
    id: location.pathname
  });
});

export class Main extends React.Component {
  public render() {
    return (
      <theAppContext.Provider value={setupAppContext()}>
        <Router history={browserHistoryInstance}>
          <MainContentWithRouter/>
        </Router>
      </theAppContext.Provider>
    );
  }
}

interface RouterProps extends RouteComponentProps<any> {
}

export class MainContent extends React.Component<RouterProps> {
  public render() {
    return (
      <routerContext.Provider value={{ rootUrl: this.props.match.url }}>
        <Banner buttonLabel={
          //tslint:disable
          <a href="https://blog.makerdao.com/what-to-expect-with-the-launch-of-multi-collateral-dai/"
             target="_blank"
             rel="noreferrer noopener">
            <MediaQuery maxWidth={824}>
              {
                (match: boolean) => match
                  ? 'Blog'
                  : 'Blog Post'
              }
            </MediaQuery></a>}
                content={
                  <span>
                    {/*tslint:disable*/}
                    With the launch of Multi-Collateral Dai, we have renamed Single-Collateral DAI
                    to SAI. Your balances haven't changed.
                    <br/>
                    <strong>Check the blog post for more information.</strong>
                  </span>
                }
                continue={
                  () => false
                }/>
        <Banner
          content={
            <span>
              If you want to trade Sai, please check one of the sites below:
              <br/>
              <strong>
                <a target="_blank"
                   href={'https://uniswap.exchange/swap'}
                >uniswap.exchange</a>
                <span> - </span>
                <a target="_blank"
                   href={'https://dex.ag/'}
                >dex.ag</a>
                <span> - </span>
                <a target="_blank"
                   href={'https://dexindex.io/?symbol=SAI&amount=1&action=buy'}
                >dexindex.io</a>
              </strong>
            </span>
          }
          continue={ () => false }
        />
        <div className={styles.container}>
          <theAppContext.Consumer>
            {({ TransactionNotifierTxRx }) =>
              <TransactionNotifierTxRx/>
            }
          </theAppContext.Consumer>
          <HeaderTxRx/>
          <RoutesRx/>
          <theAppContext.Consumer>
            {({ TheFooterTxRx }) =>
              <TheFooterTxRx/>
            }
          </theAppContext.Consumer>
        </div>
      </routerContext.Provider>
    );
  }
}

class Routes extends React.Component<{ status: WalletStatus }> {
  public render() {
    return (
      <Switch>
        <Route exact={false} path={'/market'} component={ExchangeViewTxRx}/>
        {process.env.REACT_APP_INSTANT_ENABLED === '1' &&
        <Route exact={false} path={'/instant'} component={InstantExchange}/>}
        {
          this.props.status === 'connected' &&
          <Route path={'/account'} component={BalancesView}/>
        }
        <Route path={'/leverage'} component={MarginTradingSimpleTxRx} />
        <Redirect from={'/balances'} to={'/account'}/>
        <Redirect from={'/'} to={'/market'}/>
      </Switch>
    );
  }
}

const RoutesRx = connect(Routes, walletStatus$
  .pipe(
    map(status => ({
      status
    }))
  ));

const MainContentWithRouter = withRouter(MainContent);

interface RouterContext {
  rootUrl: string;
}

export const routerContext = React.createContext<RouterContext>({ rootUrl: '/' });
