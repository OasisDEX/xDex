/*
 * Copyright (C) 2020 Maker Ecosystem Growth Holdings, INC.
 */

import React, { useContext }from 'react';
import { Link } from 'react-router-dom';
import { AssetKind, getToken, tradingPairs } from '../../blockchain/config';
import { routerContext } from '../../Main';
import { LoadableWithTradingPair } from '../../utils/loadable';
import { LoadingIndicator } from '../../utils/loadingIndicator/LoadingIndicator';
import { PanelBody, PanelHeader } from '../../utils/panel/Panel';
import { CreateMTFundForm$ } from '../transfer/mtTransferForm';
import { MTSimpleFormState } from './mtOrderForm';
import { MtSimpleOrderFormView } from './mtOrderFormView';
import * as styles from './mtOrderFormView.scss';
import { ModalOpener, useModal } from 'src/utils/modalHook';
import { theAppContext } from 'src/AppContext';
import { useObservable } from 'src/utils/observableHook';

export interface MTSimpleOrderPanelProps {
  createMTFundForm$: CreateMTFundForm$;
}

export function MTSimpleOrderPanel(){
  const { createMTFundForm$, mtOrderFormLoadable$ } = useContext(theAppContext)
  const state = useObservable(mtOrderFormLoadable$)
  const open = useModal()

  if(!state) return null

  const { status, value, tradingPair } = state
  if (
    getToken(tradingPair.base).assetKind !== AssetKind.marginable ||
    tradingPair.quote !== 'DAI'
  ) {
    const marginablePairs = tradingPairs.filter(
      ({ base, quote }) => getToken(base).assetKind === AssetKind.marginable && quote === 'DAI',
    );

    return (
      <>
        <PanelHeader>Manage Your Position</PanelHeader>
        <PanelBody className={styles.orderPanel}>
          Multiply trading is enabled only on following markets:
          {marginablePairs.map(({ base, quote }) => (
            <routerContext.Consumer key={base}>
              {({ rootUrl }) => (
                <>
                  {marginablePairs.length > 1 && <>, </>}
                  <Link to={`${rootUrl}multiply/${base}/${quote}`} style={{ whiteSpace: 'nowrap' }}>
                    {base}
                  </Link>
                </>
              )}
            </routerContext.Consumer>
          ))}
        </PanelBody>
      </>
    );
  }

  if (status === 'loaded' && value && value.mta) {
    const formState = value;
    return <MtSimpleOrderFormView {...{ ...state, ...formState, ...{createMTFundForm$, open} }} />;
  }

  return (
    <div className={styles.orderPanel}>
      <PanelHeader style={{ width: '100%' }}>Manage Your Position</PanelHeader>
      <LoadingIndicator size="lg" />
    </div>
  );
}
