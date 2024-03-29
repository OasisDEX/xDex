/*
 * Copyright (C) 2020 Maker Ecosystem Growth Holdings, INC.
 */

import moment from 'moment';
import React, { useContext } from 'react';
import { default as MediaQuery } from 'react-responsive';
import { from, Observable } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { theAppContext } from 'src/AppContext';
import { useObservable } from 'src/utils/observableHook';
import { NetworkConfig } from '../blockchain/config';
import { Github, Reddit, RocketChat } from '../utils/icons/SocialIcons';
import { Loadable, loadablifyLight } from '../utils/loadable';
import { WithLoadingIndicatorInline } from '../utils/loadingIndicator/LoadingIndicator';
import * as styles from './Footer.scss';

export interface FooterProps {
  etherscan: any;
  address: string;
  expirationDate: Loadable<Date>;
}

export const TheFooterHooked = () => {
  const { context$ } = useContext(theAppContext);
  const state = useObservable(createFooter$(context$));

  if (!state) return null;

  const { etherscan, address, expirationDate } = state;
  return (
    <div>
      <hr className={styles.footerSeparator} />
      <div className={styles.footer}>
        <MediaQuery minWidth={768}>
          <div className={styles.links}>
            <span>
              Market Closing Time -{' '}
              <WithLoadingIndicatorInline loadable={expirationDate}>
                {(expDate) => <span data-vis-reg-hide={true}>{moment(expDate).format('DD.MM.YYYY')}</span>}
              </WithLoadingIndicatorInline>
            </span>
            <a target="_blank" rel="noopener noreferrer" href={`${etherscan.url}/address/${address}`}>
              Market Contract
            </a>
            <a target="_blank" rel="noopener noreferrer" href="/terms">
              Legal
            </a>
            <a target="_blank" rel="noopener noreferrer" href="/privacy">
              Privacy
            </a>
            <a target="_blank" rel="noopener noreferrer" href="https://github.com/OasisDEX/OasisTradeDigitalAssessmentFramework/raw/main/Oasis%20Trade%20Digital%20Asset%20Assessment%20Framework.pdf">
              Asset Ass. Framework
            </a>
            <a target="_blank" rel="noopener noreferrer" href="https://github.com/OasisDEX/oasis-market/issues">
              Report Issues
            </a>
            <span>
              <a
                target="_blank"
                className={styles.iconLink}
                rel="noopener noreferrer"
                href="https://chat.makerdao.com/channel/oasis"
              >
                <RocketChat />
              </a>
              <a
                target="_blank"
                className={styles.iconLink}
                rel="noopener noreferrer"
                href="https://www.reddit.com/r/OasisDEX/"
              >
                <Reddit />
              </a>
              <a
                target="_blank"
                className={styles.iconLink}
                rel="noopener noreferrer"
                href="https://github.com/OasisDEX/oasis-market"
              >
                <Github />
              </a>
            </span>
          </div>
          <div data-vis-reg-hide={true}>
            <span>
              <a
                href={`https://github.com/OasisDEX/oasis-market/commit/${process.env.__HASH__}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                {process.env.__NAME__} Commit {process.env.__HASH__}
              </a>{' '}
              - Build Date {moment(process.env.__DATE__).format('DD.MM.YYYY HH:MM')}
            </span>
          </div>
        </MediaQuery>
        <MediaQuery maxWidth={768}>
          <div>
            Market Closing Time -{' '}
            <WithLoadingIndicatorInline loadable={expirationDate}>
              {(expDate) => <span data-vis-reg-hide={true}>{moment(expDate).format('DD.MM.YYYY')}</span>}
            </WithLoadingIndicatorInline>
          </div>
          <div className={styles.links}>
            <a target="_blank" rel="noopener noreferrer" href={`${etherscan.url}/address/${address}`}>
              Market Contract
            </a>
            <a target="_blank" rel="noopener noreferrer" href="/terms">
              Legal
            </a>
            <a target="_blank" rel="noopener noreferrer" href="/privacy">
              Privacy
            </a>
            <a target="_blank" rel="noopener noreferrer" href="https://github.com/OasisDEX/OasisTradeDigitalAssessmentFramework/raw/main/Oasis%20Trade%20Digital%20Asset%20Assessment%20Framework.pdf">
              Asset Ass. Framework
            </a>
            <a target="_blank" rel="noopener noreferrer" href="https://github.com/OasisDEX/oasis-market/issues">
              Report Issues
            </a>
          </div>
          <div>
            <a
              target="_blank"
              className={styles.iconLink}
              rel="noopener noreferrer"
              href="https://chat.makerdao.com/channel/oasis-market"
            >
              <RocketChat />
            </a>
            <a
              target="_blank"
              className={styles.iconLink}
              rel="noopener noreferrer"
              href="https://www.reddit.com/r/OasisDEX/"
            >
              <Reddit />
            </a>
            <a
              target="_blank"
              className={styles.iconLink}
              rel="noopener noreferrer"
              href="https://github.com/OasisDEX/oasis-market"
            >
              <Github />
            </a>
          </div>
          <div data-vis-reg-hide={true}>
            <a
              href={`https://github.com/OasisDEX/oasis-market/commit/${process.env.__HASH__}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              {process.env.__NAME__} Commit {process.env.__HASH__}
            </a>
          </div>
          <div data-vis-reg-hide={true}>Build Date {moment(process.env.__DATE__).format('DD.MM.YYYY HH:MM')}</div>
        </MediaQuery>
      </div>
    </div>
  );
};

export function createFooter$(context$: Observable<NetworkConfig>): Observable<FooterProps> {
  return context$.pipe(
    switchMap((context) =>
      loadablifyLight<Date>(
        from(context.otc.contract.methods.close_time().call()).pipe(
          map((closeTime: string) => moment.unix(Number(closeTime)).toDate()),
        ),
      ).pipe(
        map((expirationDate) => ({
          expirationDate,
          etherscan: context.etherscan,
          address: context.otc.contract.options.address,
        })),
      ),
    ),
  );
}
