import * as React from 'react';

import { theAppContext } from '../AppContext';
import { FlexLayoutRow } from '../utils/layout/FlexLayoutRow';
import { TaxExporterHooked } from './TaxExporterView';

const {
  REACT_APP_TAX_EXPORTER_ENABLED,
  REACT_APP_LT_ENABLED
} = process.env;

export class BalancesView extends React.Component<{}> {
  public render() {
    return (
      <div>
        <theAppContext.Consumer>
          { ({ MTBalancesViewRxTx,
               WalletViewRxTx
          }) =>
            <div>
              <FlexLayoutRow>
                <WalletViewRxTx />
              </FlexLayoutRow>
              {
                REACT_APP_LT_ENABLED === '1' &&
                <FlexLayoutRow>
                  <MTBalancesViewRxTx/>
                </FlexLayoutRow>
              }
              {
                REACT_APP_TAX_EXPORTER_ENABLED === '1' &&
                <FlexLayoutRow>
                    <TaxExporterHooked/>
                </FlexLayoutRow>
              }
            </div>
          }
        </theAppContext.Consumer>
      </div>
    );
  }
}
