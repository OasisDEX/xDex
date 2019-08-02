import * as React from 'react';

import { theAppContext } from '../AppContext';
import { FlexLayoutRow } from '../utils/layout/FlexLayoutRow';

export class BalancesView extends React.Component<{}> {
  public render() {
    return (
      <div>
        <theAppContext.Consumer>
          { ({ MTSetupButtonRxTx,
               // MTAccountDetailsRxTx,
               MTBalancesViewRxTx,
               MtSummaryViewRxTx,
               CDPRiskManagementsRxTx,
               ReallocateViewRxTx
          }) =>
            <div>
              <div style={{ display: 'flex', flexDirection: 'row-reverse' }}>
                <MTSetupButtonRxTx/> <ReallocateViewRxTx/>
              </div>
              <FlexLayoutRow>
                <MTBalancesViewRxTx />
              </FlexLayoutRow>
              <FlexLayoutRow>
                <MtSummaryViewRxTx />
              </FlexLayoutRow>
              <CDPRiskManagementsRxTx />
              {/*<FlexLayoutRow>*/}
                {/*<MTAccountDetailsRxTx />*/}
              {/*</FlexLayoutRow>*/}
            </div>
          }
        </theAppContext.Consumer>
      </div>
    );
  }
}
