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
          }) =>
            <div>
              <div style={{ display: 'flex', flexDirection: 'row-reverse' }}>
                <MTSetupButtonRxTx/>
              </div>
              <FlexLayoutRow>
                <MTBalancesViewRxTx />
              </FlexLayoutRow>
            </div>
          }
        </theAppContext.Consumer>
      </div>
    );
  }
}
