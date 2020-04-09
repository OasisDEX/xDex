import 'normalize.css';
import * as Raven from 'raven-js';
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { combineLatest } from 'rxjs';
import {map, startWith} from 'rxjs/operators';
import { mixpanelInit } from './analytics';
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

interface Web3StatusAndNetwork {
  status: Web3Status;
  networkId?: string;
}

class App extends React.Component<Web3StatusAndNetwork> {

  public render() {
    switch (this.props.status) {
      case Web3Status.connecting:
      case Web3Status.disconnecting:
        return LoadingState.INITIALIZATION;
      // case Web3Status.missing:
      //   return LoadingState.MISSING_PROVIDER;
      case Web3Status.ready:
      case Web3Status.readonly:
        if (this.props.networkId !== undefined && !networks[this.props.networkId]) {
          return LoadingState.UNSUPPORTED;
        }
        return <NavigationTxRx><Main/></NavigationTxRx>;
      default:
        throw new UnreachableCaseError(this.props.status);
    }
  }
}

const AppTxRx = connect<Props, {}>(
  App, combineLatest(web3Status$, networkId$.pipe(startWith(undefined))).pipe(
    map(([status, networkId]) => ({ status, networkId }))
  )
);

const root: HTMLElement = document.getElementById('root')!;

if (process.env.NODE_ENV === 'production' && process.env.REACT_APP_SENTRY_DNS) {
  Raven.config(
    process.env.REACT_APP_SENTRY_DNS
  ).install();
  Raven.context(() => ReactDOM.render(<AppTxRx/>, root));
} else {
  ReactDOM.render(<AppTxRx/>, root);
}
