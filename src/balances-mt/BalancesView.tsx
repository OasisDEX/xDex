import * as React from 'react';

import { theAppContext } from '../AppContext';
import { FlexLayoutRow } from '../utils/layout/FlexLayoutRow';

export class BalancesView extends React.Component<{}> {
  public render() {
    return (
      <div>
        <theAppContext.Consumer>
          { ({ MTSetupButtonRxTx,
               MTBalancesViewRxTx,
               TaxExporterTxRx,
               WalletViewRxTx
          }) =>
            <div>
              <FlexLayoutRow>
                <WalletViewRxTx />
              </FlexLayoutRow>
              <FlexLayoutRow>
                <MTBalancesViewRxTx />
              </FlexLayoutRow>
              {
                process.env.REACT_APP_TAX_EXPORTER_ENABLED === '1' &&
                <FlexLayoutRow>
                    <TaxExporterTxRx/>
                </FlexLayoutRow>
              }
              <div style={{ display: 'flex', flexDirection: 'row-reverse' }}>
                <MTSetupButtonRxTx/>
              </div>
            </div>
          }
        </theAppContext.Consumer>
      </div>
    );
  }
}
