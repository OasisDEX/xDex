/*
 * Copyright (C) 2020 Maker Ecosystem Growth Holdings, INC.
 */

import classnames from 'classnames';
import { isEqual } from 'lodash';
import * as React from 'react';
// @ts-ignore
// tslint:disable:import-name
import Jazzicon, { jsNumberForAddress } from 'react-jazzicon';
// @ts-ignore
import * as ReactPopover from 'react-popover';
import { BehaviorSubject, combineLatest, Observable } from 'rxjs';
import { distinctUntilChanged, map } from 'rxjs/operators';

import { IoIosWifi } from 'react-icons/io';
import MediaQuery from 'react-responsive';
import { NavLink } from 'react-router-dom';
import { useObservable } from 'src/utils/observableHook';
import { account$ } from '../blockchain/network';
import { WalletStatus, walletStatus$ } from '../blockchain/wallet';
import { web3Status$ } from '../blockchain/web3';
import chevronDownSvg from '../icons/chevron-down.svg';
import { routerContext } from '../Main';
import { SAI2DAIMigrationHooked } from '../migration/MigrationFormView';
import { Button } from '../utils/forms/Buttons';
import { SvgImage } from '../utils/icons/utils';
import { Loadable } from '../utils/loadable';
import { WithLoadingIndicatorInline } from '../utils/loadingIndicator/LoadingIndicator';
import * as styles from './Header.scss';
import { NetworkHooked } from './Network';
import OasisDexLogo from './OasisDexLogo.svg';
import { WalletConnectionViewKind, walletConnectionViewManual$, WalletConnectionViews } from './WalletConnectionView';

const { REACT_APP_INSTANT_ENABLED, REACT_APP_LT_ENABLED, REACT_APP_SUBDIR } = process.env;

const {
  header,
  nav,
  list,
  item,
  section,
  sectionStatus,
  sectionNavigation,
  logo,
  navElement,
  navLink,
  activeNavLink,
  arrowDown,
  dark,
  mild,
  walletConnection,
} = styles;

interface HeaderProps {
  walletStatus: WalletStatus;
}

const walletConnectionView$: Observable<WalletConnectionViewKind> = combineLatest(
  walletConnectionViewManual$,
  walletStatus$,
  web3Status$,
).pipe(
  map(([manualViewChange, walletStatus, web3Status]) => {
    if (manualViewChange) {
      return manualViewChange;
    }

    if (web3Status === 'readonly') {
      return WalletConnectionViewKind.noClient;
    }

    if (walletStatus === 'connected') {
      return WalletConnectionViewKind.connected;
    }

    return WalletConnectionViewKind.notConnected;
  }),
  distinctUntilChanged(isEqual),
);

const popup = new BehaviorSubject(false);

const popup$ = combineLatest(walletStatus$, popup, walletConnectionView$).pipe(
  map(([status, isOpen, view]) => ({
    view,
    isOpen,
    open: () => popup.next(true),
    close: () => {
      popup.next(false);
      setTimeout(() => {
        walletConnectionViewManual$.next('');
      }, 500);
    },
    isConnected: status === 'connected',
    isConnecting: status === 'connecting',
  })),
);

walletStatus$.pipe().subscribe((status) => {
  if (status === 'connected' || status === 'disconnected') {
    popup.next(false);
  }
});

const Header = ({ walletStatus }: HeaderProps) => {
  return (
    <routerContext.Consumer>
      {({ rootUrl }) => (
        <header className={header}>
          <section className={section}>
            <a href={REACT_APP_SUBDIR ? REACT_APP_SUBDIR : '/'} className={logo}>
              <SvgImage image={OasisDexLogo} />
            </a>
          </section>
          <section className={classnames(section, sectionNavigation)}>
            <nav className={nav}>
              <div className={list}>
                <HeaderNavLink to={`${rootUrl}market`} name="Market" />
                {REACT_APP_INSTANT_ENABLED === '1' && <HeaderNavLink to={`${rootUrl}instant`} name="Instant" />}
                {REACT_APP_LT_ENABLED === '1' && walletStatus === 'connected' && (
                    <HeaderNavLink to={`${rootUrl}multiply`} name="Multiply" />
                )}
                {walletStatus === 'connected' && <HeaderNavLink to={`${rootUrl}balances`} name="Balances" />}
              </div>
            </nav>
          </section>
          <section className={classnames(section, sectionStatus)}>
            <WalletConnectionHooked />
          </section>
        </header>
      )}
    </routerContext.Consumer>
  );
};

export const HeaderHooked = () => {
  const state = useObservable(combineLatest(walletStatus$).pipe(map(([walletStatus]) => ({ walletStatus }))));

  if (!state) return null;

  return <Header {...state} />;
};

interface WalletConnectionStatusProps {
  open: () => void;
  close: () => void;
  isOpen: boolean;
  isConnected: boolean;
  isConnecting: boolean;
  view: any;
}

const WalletConnectionStatus = (props: WalletConnectionStatusProps) => {
  const { open, close, view, isConnected, isConnecting, isOpen } = props;
  const View = WalletConnectionViews.get(isConnecting ? WalletConnectionViewKind.connecting : view);

  return (
    <ReactPopover
      isOpen={isOpen}
      place="below"
      crossAlign="center-end"
      onOuterAction={close}
      className="noWallet"
      enterExitTransitionDistancePx={-10}
      body={<View close={close} />}
    >
      <div className={walletConnection}>
        <NetworkHooked />
        {isConnected ? (
          <>
            <SAI2DAIMigrationHooked label="Upgrade Sai" tid="update-btn-header" className={styles.redeemBtn} />
            <div onClick={open} data-test-id="wallet-status">
              <StatusHooked />
            </div>
          </>
        ) : (
          <Button
            color="secondaryOutlined"
            size="lg"
            onClick={open}
            data-test-id="new-connection"
            className={classnames(styles.login, styles.connectWalletButton)}
          >
            <MediaQuery minWidth={880}>
              {(matches) => {
                if (matches) {
                  return (
                    <>
                      Connect Wallet
                      <SvgImage image={chevronDownSvg} className={classnames(arrowDown, dark)} />
                    </>
                  );
                }
                return <IoIosWifi />;
              }}
            </MediaQuery>
          </Button>
        )}
      </div>
    </ReactPopover>
  );
};

const WalletConnectionHooked = () => {
  const state = useObservable(popup$);

  if (!state) return null;

  return <WalletConnectionStatus {...state} />;
};

export const StatusHooked = () => {
  const loadableState = useObservable(loadableAccount$);

  if (!loadableState) return null;

  return (
    <span className={styles.accountLoader}>
      <WithLoadingIndicatorInline loadable={loadableState} className={styles.account}>
        {({ account }: Account) => {
          const label = account ? account.slice(0, 6) + '...' + account.slice(-4) : 'Logged out';

          return (
            <div title={account} data-test-id="status" className={classnames(navElement, styles.account)}>
              <Jazzicon diameter={20} seed={jsNumberForAddress(account)} />
              <span data-test-id="account" style={{ marginLeft: '.625rem', letterSpacing: '.2px' }}>
                {label}
              </span>
              {/* TODO: Unify this with the market dropdown icon. Extract?*/}

              <SvgImage image={chevronDownSvg} className={classnames(arrowDown, mild)} />
            </div>
          );
        }}
      </WithLoadingIndicatorInline>
    </span>
  );
};

interface Account {
  account: string | undefined;
  available?: boolean;
}

const loadableAccount$: Observable<Loadable<Account>> = combineLatest(walletStatus$, account$).pipe(
  map(([walletStatus, account]) => {
    if (walletStatus === 'connecting') {
      return { status: 'loading' } as Loadable<Account>;
    }
    return {
      status: 'loaded',
      value: { account, available: walletStatus !== 'missing' },
    } as Loadable<Account>;
  }),
);

export const HeaderNavLink = ({ to, name }: { to: string; name: string }) => (
  <NavLink data-test-id={name} to={to} className={classnames(item, navLink)} activeClassName={activeNavLink}>
    {name}
  </NavLink>
);
