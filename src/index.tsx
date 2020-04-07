import { isEqual } from 'lodash';
import 'normalize.css';
import * as Raven from 'raven-js';
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { combineLatest, Observable, of } from 'rxjs';
import { distinctUntilChanged, startWith, switchMap, tap } from 'rxjs/internal/operators';
import { map } from 'rxjs/operators';
import { mixpanelInit } from './analytics';
import { networks } from './blockchain/config';
import { account$, networkId$ } from './blockchain/network';
import { Web3Status, web3Status$ } from './blockchain/web3';
import { LoadingState } from './landingPage/LandingPage';
import { Main } from './Main';
import { NavigationTxRx } from './Navigation';
import { useObservable } from './utils/observableHook';
import { UnreachableCaseError } from './utils/UnreachableCaseError';

interface Props {
  status: Web3Status;
  network?: string;
}

mixpanelInit();

const App = ({ network, status }: Props) => {

  switch (status) {
    case 'initializing':
      return LoadingState.INITIALIZATION;
    case 'missing':
      return LoadingState.MISSING_PROVIDER;
    case 'ready':
    case 'readonly':
      if (network !== undefined && !networks[network]) {
        return LoadingState.UNSUPPORTED;
      }
      return <NavigationTxRx><Main/></NavigationTxRx>;
    default:
      throw new UnreachableCaseError(status);
  }
};

const web3StatusResolve$: Observable<Props> = web3Status$.pipe(
  switchMap(status =>
    status === 'ready' || status === 'readonly' ?
      combineLatest(networkId$, account$).pipe(
        tap(([network, account]) =>
          console.log(`status: ${status}, network: ${network}, account: ${account}`)),
        map(([network, _account]) => ({ status, network })),
      ) : of({ status })
  ),
  startWith({ status: 'initializing' as Web3Status })
);

const props$: Observable<Props> = web3StatusResolve$.pipe(
  map((web3Status) => {
    return {
      ...web3Status
    } as Props;
  }),
  distinctUntilChanged(isEqual)
);

const AppHooked = () => {
  const state = useObservable(props$);

  if (!state) return null;

  return <App {...state}/>;
};

const root: HTMLElement = document.getElementById('root')!;

if (process.env.NODE_ENV === 'production' && process.env.REACT_APP_SENTRY_DNS) {
  Raven.config(
    process.env.REACT_APP_SENTRY_DNS
  ).install();
  Raven.context(() => ReactDOM.render(<AppHooked/>, root));
} else {
  ReactDOM.render(<AppHooked/>, root);
}
