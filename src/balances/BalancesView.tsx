/*
 * Copyright (C) 2020 Maker Ecosystem Growth Holdings, INC.
 */

import * as React from 'react';

import { theAppContext } from '../AppContext';
import { FlexLayoutRow } from '../utils/layout/FlexLayoutRow';
import { TaxExporterHooked } from './TaxExporterView';
import { WalletViewHooked } from './WalletView';

const { REACT_APP_TAX_EXPORTER_ENABLED, REACT_APP_LT_ENABLED } = process.env;

export const BalancesView = () => {
  return (
    <div>
      <theAppContext.Consumer>
        {({ MTBalancesViewRxTx }) => (
          <div>
            <FlexLayoutRow>
              <WalletViewHooked />
            </FlexLayoutRow>
            {REACT_APP_LT_ENABLED === '1' && (
              <FlexLayoutRow>
                <MTBalancesViewRxTx />
              </FlexLayoutRow>
            )}
            {REACT_APP_TAX_EXPORTER_ENABLED === '1' && (
              <FlexLayoutRow>
                <TaxExporterHooked />
              </FlexLayoutRow>
            )}
          </div>
        )}
      </theAppContext.Consumer>
    </div>
  );
};
