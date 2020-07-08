/*
 * Copyright (C) 2020 Maker Ecosystem Growth Holdings, INC.
 */

import classnames from 'classnames';
import * as React from 'react';
import { map } from 'rxjs/operators';

import { walletStatus$ } from './blockchain/wallet';
import borrowSvg from './icons/navigation/borrow.svg';
import saveSvg from './icons/navigation/save.svg';
import tradeSvg from './icons/navigation/trade.svg';
import * as styles from './Navigation.scss';
import { SvgImage } from './utils/icons/utils';
import { useObservable } from './utils/observableHook';

export const Navigation = ({ children }: any) => {
  const state = useObservable(walletStatus$.pipe(map((walletStatus) => ({ walletStatus }))));

  const connected = state && state.walletStatus === 'connected';
  return (
    <div className={styles.container}>
      <div className={styles.horizontal}>
        <HorizontalNav connected={connected} />
      </div>
      <div className={styles.vertical}>
        <VerticalNav connected={connected} />
      </div>
      <div>{children}</div>
    </div>
  );
};

export const VerticalNav = ({ connected }: any) => {
  return (
    <div className={classnames(styles.verticalContent, connected ? styles.connected : styles.disconnected)}>
      <a href="/save">
        <SvgImage image={saveSvg} />
        Save
      </a>
      <a href="/borrow">
        <SvgImage image={borrowSvg} />
        Borrow
      </a>
      <a className={styles.activeItem}>
        <SvgImage image={tradeSvg} />
        Trade
      </a>
    </div>
  );
};

export const HorizontalNav = ({ connected }: any) => {
  return (
    <div className={classnames(styles.horizontalContent, connected ? styles.connected : styles.disconnected)}>
      <a href="/save">
        <SvgImage image={saveSvg} />
        Save
      </a>
      <a href="/borrow">
        <SvgImage image={borrowSvg} />
        Borrow
      </a>
      <a className={styles.activeItem}>
        <SvgImage image={tradeSvg} />
        Trade
      </a>
    </div>
  );
};
