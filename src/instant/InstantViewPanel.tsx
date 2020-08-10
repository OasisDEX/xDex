/*
 * Copyright (C) 2020 Maker Ecosystem Growth Holdings, INC.
 */

import classnames from 'classnames';
import React, { useContext } from 'react';
import { useObservable } from 'src/utils/observableHook';
import { theAppContext } from '../AppContext';
import { Loadable } from '../utils/loadable';
import { LoadingIndicator } from '../utils/loadingIndicator/LoadingIndicator';
import * as panelStyling from '../utils/panel/Panel.scss';
import * as styles from './Instant.scss';
import { InstantFormState, ViewKind } from './instantForm';
import { AccountView } from './views/AccountView';
import { AllowancesView } from './views/AllowancesView';
import { BuyAssetSelectorView, SellAssetSelectorView } from './views/AssetSelectorView';
import { FinalizationView } from './views/FinalizationView';
import { NewTradeView } from './views/NewTradeView';
import { PriceImpactWarningView } from './views/PriceImpactWarningView';
import { TradeSettingsView } from './views/TradeSettingsView';
import { TradeSummaryView } from './views/TradeSummaryView';

const views: Record<ViewKind, React.ComponentType<InstantFormState>> = {
  [ViewKind.buyAssetSelector]: BuyAssetSelectorView,
  [ViewKind.sellAssetSelector]: SellAssetSelectorView,
  [ViewKind.priceImpactWarning]: PriceImpactWarningView,
  [ViewKind.account]: AccountView,
  [ViewKind.allowances]: AllowancesView,
  [ViewKind.finalization]: FinalizationView,
  [ViewKind.new]: NewTradeView,
  [ViewKind.summary]: TradeSummaryView,
  [ViewKind.settings]: TradeSettingsView,
};

export class InstantViewPanel extends React.Component<Loadable<InstantFormState>> {
  public render() {
    const { status, value } = this.props;

    if (status === 'loaded') {
      const formState = value as InstantFormState;
      const View = views[formState.view];
      return <View {...formState} />;
    }

    return (
      <section className={classnames(styles.panel, panelStyling.panel)}>
        <LoadingIndicator />
      </section>
    );
  }
}

export function InstantExchange() {
  const { instant$ } = useContext(theAppContext);
  const state = useObservable(instant$);

  if (!state) return null;

  return <InstantViewPanel {...state} />;
}
