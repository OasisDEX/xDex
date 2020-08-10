/*
 * Copyright (C) 2020 Maker Ecosystem Growth Holdings, INC.
 */

import * as React from 'react';

import { FlexLayoutRow } from '../utils/layout/FlexLayoutRow';
import { MTBalancesView } from './mtBalancesView';
import { TaxExporterHooked } from './TaxExporterView';
import { WalletViewHooked } from './WalletView';

const { REACT_APP_TAX_EXPORTER_ENABLED, REACT_APP_LT_ENABLED } = process.env;

export const BalancesView = () => {
  return (
    <div>
      <div>
        <FlexLayoutRow>
          <WalletViewHooked />
        </FlexLayoutRow>
        {REACT_APP_LT_ENABLED === '1' && (
          <FlexLayoutRow>
            <MTBalancesView />
          </FlexLayoutRow>
        )}
        {REACT_APP_TAX_EXPORTER_ENABLED === '1' && (
          <FlexLayoutRow>
            <TaxExporterHooked />
          </FlexLayoutRow>
        )}
      </div>
    </div>
  );
};
