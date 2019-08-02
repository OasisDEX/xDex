import * as React from 'react';

import { MTAccount, MTAccountState } from '../marginTrading/state/mtAccount';
import { FlexLayoutRow } from '../utils/layout/FlexLayoutRow';
import { ModalOpenerProps } from '../utils/modal';
import { zero } from '../utils/zero';
import { CDPRiskManagement } from './CDPRiskManagement';
import { NonmarginableManagement } from './NonmarginableManagement';

export class CDPRiskManagements
  extends React.Component<MTAccount & ModalOpenerProps>
{
  public render() {
    if (this.props.state !== MTAccountState.setup) {
      return null;
    }
    return (
      <React.Fragment>
        { this.props.marginableAssets
          .filter(ma => ma.balance.gt(zero) || ma.history.length > 0)
          .map(ma => (
            <FlexLayoutRow key={ma.name}>
              <CDPRiskManagement {...ma} open={this.props.open} />
            </FlexLayoutRow>))}
        { this.props.nonMarginableAssets
          .filter(ma => ma.balance.gt(zero))
          .map(ma => (
            <FlexLayoutRow key={ma.name}>
              <NonmarginableManagement {...ma} />
            </FlexLayoutRow>))}
      </React.Fragment>
    );
  }

}
