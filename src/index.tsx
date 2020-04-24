import 'normalize.css';
import * as Raven from 'raven-js';
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { combineLatest } from 'rxjs';
import {map, startWith} from 'rxjs/operators';
import { mixpanelInit } from './analytics/mixpanel';
import { fathomInit } from './analytics/fathom';
import { networks } from './blockchain/config';
import { networkId$ } from './blockchain/network';
import { Web3Status, web3Status$ } from './blockchain/web3';
import { LoadingState } from './landingPage/LandingPage';
import { Main } from './Main';
import { NavigationTxRx } from './Navigation';
import { connect } from './utils/connect';
import { UnreachableCaseError } from './utils/UnreachableCaseError';

interface Props {
  status: Web3Status;
  network?: string;
  tosAccepted?: boolean;
  hasSeenAnnouncement?: boolean;
}

mixpanelInit();
fathomInit();

interface Web3StatusAndNetwork {
  // status: Web3Status;
  networkId?: string;
}

class App extends React.Component<Web3StatusAndNetwork> {

  public render() {
    if(!this.props.networkId) {
      return LoadingState.INITIALIZATION;
    }
    return <NavigationTxRx><Main/></NavigationTxRx>;
  }
}

const AppTxRx = connect(
  App, networkId$.pipe(startWith(undefined)).pipe(
    map((networkId) => ({ networkId } as Web3StatusAndNetwork))
  )
);

const root: HTMLElement = document.getElementById('root')!;

if (process.env.NODE_ENV === 'production' && process.env.REACT_APP_SENTRY_DNS) {
  Raven.config(process.env.REACT_APP_SENTRY_DNS).install();
  Raven.context(() => ReactDOM.render(<AppTxRx />, root));
} else {
  ReactDOM.render(<AppTxRx />, root);
}
