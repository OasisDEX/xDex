import { LoadableWithTradingPair } from '../../utils/loadable';
import * as React from 'react';
import { MarginableAsset } from '../state/mtAccount';

export class MTMyPositionView
  extends React.Component<MarginableAsset>
{
  public render() {
    return <div>
      Amount: { this.props.balance.toString() }
      <br />
      Dai generated: { this.props.debt.toString() }
      <br />
      Coll. Ratio: { this.props.currentCollRatio && this.props.currentCollRatio.toString() }
      <br />
      Liquidation Price: { this.props.liquidationPrice && this.props.liquidationPrice.toString() }
      <br />
      Price Feed: { this.props.referencePrice && this.props.referencePrice.toString() }
      <br />
      Type: Long { this.props.leverage && this.props.leverage.toString() }
      <br />
      PnL: ?
      <br />
      Open Price: ?
      <br />
      Interest Owed: ?
      <br />
    </div>;
  }
}
