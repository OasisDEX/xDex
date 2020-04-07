import { BigNumber } from 'bignumber.js';
import classnames from 'classnames';
import * as mixpanel from 'mixpanel-browser';
import React, { useContext, useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { theAppContext } from 'src/AppContext';
import { useObservable } from 'src/utils/observableHook';
import { Panel } from 'src/utils/panel/Panel';
import { getToken, tradingPairs } from '../../blockchain/config';
import {
  FormatAmount, FormatPercent, FormatPrice, FormatQuoteToken
} from '../../utils/formatters/Formatters';
import { Loadable } from '../../utils/loadable';
import { WithLoadingIndicatorInline } from '../../utils/loadingIndicator/LoadingIndicator';
import { ServerUnreachableInline } from '../../utils/loadingIndicator/ServerUnreachable';
import { Scrollbar } from '../../utils/Scrollbar/Scrollbar';
import { BoundarySpan, InfoLabel } from '../../utils/text/Text';
import { MarketsDetails } from '../exchange';
import { TradingPair, tradingPairResolver, TradingPairsProps } from './tradingPair';
import * as styles from './TradingPairView.scss';

interface PairInfoVPProps {
  value: any;
  label: string;
  dataTestId ?: string;
}

export const TradingPairView = (props: TradingPairsProps) => {

  const [showMenu, toggleMenu] = useState(false);

  useEffect(() => {
    showMenu
      ? document.addEventListener('click', closeMenu)
      : document.removeEventListener('click', closeMenu);
  },        [showMenu]);

  const toggle = () => {
    toggleMenu(!showMenu);
  };

  const closeMenu = (_event: any) => {
    if (_event.path.filter((p: any) => p.className === styles.dropdown).length === 0) {
      toggleMenu(false);
    }
  };

  const PairVP = ({ pair, parentMatch, marketsDetailsLoadable, clickHandler }: {
    pair: TradingPair,
    parentMatch?: string,
    marketsDetailsLoadable: Loadable<MarketsDetails>,
    clickHandler: () => void,
  }) => {
    const pathname = `${parentMatch}/${pair.base}/${pair.quote}`;

    return (
      <li data-test-id={`${pair.base}-${pair.quote}`} className={styles.dropdownItem}>
        <NavLink
          exact={true}
          to={{ pathname, state: { pair } }}
          activeClassName={styles.active}
          className={classnames(styles.dropdownItemLink, styles.pairView)}
          onClick={() => {
            clickHandler();
            mixpanel.track('btn-click', {
              pair: `${pair.base}${pair.quote}`,
              id: 'change-asset-pair',
              product: 'oasis-trade',
              page: 'Market',
              section: 'asset-picker',
            });
          }}
        >
          <PairView {...{ pair, marketsDetailsLoadable }} />
        </NavLink>
      </li>
    );

  };

  const PairView = ({ pair, marketsDetailsLoadable }: {
    pair: TradingPair,
    marketsDetailsLoadable: Loadable<MarketsDetails>,
  })  => {
    const { base, quote } = pair;
    return (
      <>
        <div className={styles.iconBase}>{getToken(base).icon}</div>
        <div data-test-id="base" className={styles.tokenBase}>{base}</div>
        <div data-test-id="quote" className={styles.tokenQuote}>
          <FormatQuoteToken token={quote}/>
        </div>
        <WithLoadingIndicatorInline loadable={marketsDetailsLoadable}>
          {(marketsDetails) => {
            const { price, priceDiff } = marketsDetails[tradingPairResolver(pair)];
            return (<>
              <div data-test-id="price" className={styles.price}>
                <span className={styles.iconQuote}>{getToken(quote).icon}</span>
                {
                  price &&
                  <FormatPrice value={price} token={quote} dontGroup={true}/>
                  || <> - </>
                }
              </div>
              <div data-test-id="price-diff" className={styles.priceDiff}>{priceDiff &&
              <BoundarySpan value={priceDiff}>
                <FormatPercent  value={priceDiff} plus={true}/>
              </BoundarySpan>
              || <> - </>
              }</div>
            </>);
          }}
        </WithLoadingIndicatorInline>
      </>
    );
  };

  const ActivePairView = ({ base, quote }: any) => (
      <div  data-test-id="active-pair" className={styles.activePairView}>
        <div className={styles.activePairViewIcon}>{getToken(base).iconCircle}</div>
        <span data-test-id="base" className={styles.activePairViewTokenBase}>{base}</span>
        <span data-test-id="quote" className={styles.activePairViewTokenQuote}>
          <FormatQuoteToken token={quote} />
        </span>
        <span className={styles.dropdownIcon}/>
      </div>
    );

  const YesterdayPriceVP = (
    { yesterdayPriceChange }: { yesterdayPriceChange: BigNumber | undefined }
  ) => {
    return !yesterdayPriceChange ? null : (
      <BoundarySpan value={yesterdayPriceChange}>
        <FormatPercent value={yesterdayPriceChange} plus={true} fallback=""/>
      </BoundarySpan>
    );
  };

  const PairInfoVP = ({ value, label, dataTestId }: PairInfoVPProps) => (
    <div className={styles.pairInfo}>
        <div data-test-id={dataTestId} className={styles.mobileWrapper}>
          <span data-test-id="value" className={styles.pairInfoValue}>{value}</span>
          <InfoLabel className={styles.pairInfoLabel}>{label}</InfoLabel>
        </div>
      </div>
  );

  const dropdownDisabled = tradingPairs.length <= 1;

  return (
      <>
        <div className={styles.dropdown}>
          <div tabIndex={dropdownDisabled ? undefined : -1}
               data-test-id="select-pair"
               onClick={dropdownDisabled ? undefined : toggle}
               className={classnames(styles.dropdownBtn, {
                 [styles.dropdownBtnDisabled]: dropdownDisabled,
                 [styles.dropdownBtnActive]: showMenu
               })}>
            <ActivePairView base={props.base} quote={props.quote}/>
          </div>
          {
            showMenu && (
              <div className={styles.dropdownListWrapper}>
                <ul className={styles.dropdownList}>
                  <Scrollbar autoHeight={true}>
                    {tradingPairs.map((pair, i) => (
                      <PairVP
                        key={i}
                        parentMatch={props.parentMatch}
                        pair={pair}
                        marketsDetailsLoadable={props.marketsDetails}
                        clickHandler={toggle}
                      />
                    ))}
                  </Scrollbar>
                </ul>
              </div>
            )
          }
        </div>
        <div className={styles.container} data-test-id="trading-pair-info">
          <PairInfoVP dataTestId="last-price" label="Last price" value={
            <WithLoadingIndicatorInline
              error={<ServerUnreachableInline fallback="-"/>}
              loadable={props.currentPrice}
              className={styles.pairInfo}
            >
              {(currentPriceLoaded?: BigNumber) => (
                currentPriceLoaded ?
                  <FormatPrice value={currentPriceLoaded} token={props.quote}/> :
                  <span>?</span>
              )}
            </WithLoadingIndicatorInline>
          }/>
          <PairInfoVP dataTestId="24h-price" label="24h price" value={
            <WithLoadingIndicatorInline
              error={<ServerUnreachableInline fallback="-"/>}
              loadable={props.yesterdayPriceChange}
              className={styles.pairInfo}
            >
              {(yesterdayPriceChangeLoaded?: BigNumber) => (
                yesterdayPriceChangeLoaded ?
                  <YesterdayPriceVP
                    yesterdayPriceChange={yesterdayPriceChangeLoaded}
                  /> :
                  <span>?</span>
              )}
            </WithLoadingIndicatorInline>
          }/>
          <PairInfoVP dataTestId="24h-volume" label="24h volume" value={
            <WithLoadingIndicatorInline
              loadable={props.weeklyVolume}
              className={styles.pairInfo}
              error={<ServerUnreachableInline fallback="-"/>}
            >
              {(weeklyVolumeLoaded: BigNumber) => (
                <FormatAmount value={weeklyVolumeLoaded} token={props.quote}/>
              )}
            </WithLoadingIndicatorInline>
          }/>
        </div>
      </>
  );

};

export const TradingPairViewHook = (props: {
  parentMatch?: string;
}) => {
  const { tradingPairView$ } = useContext(theAppContext);
  const observableProps = useObservable<TradingPairsProps>(tradingPairView$);

  if (observableProps) {
    return (
      <Panel className={classnames(
        styles.tradingPairPanel,
      )}>
        <TradingPairView { ...{ ...observableProps, ...props } }/>
      </Panel>
    );
  }

  return null;
};
