import { storiesOf } from '@storybook/react';
import { BigNumber } from 'bignumber.js';
import * as React from 'react';
import { getMarginableCore } from '../state/mtTestUtils';
import { MTMyPositionView } from './MTMyPositionView';

const stories = storiesOf('Leverage Trading/My Position Panel', module)
 .addDecorator(story => (
    <div style={{ width: '932px', background: '#2F2F38' }}>
      {story()}
    </div>)
 );

const MarginableAssetFixture = {
  balance: new BigNumber(12.987654321),
  balanceInCash: new BigNumber(1000),
  purchasingPower: new BigNumber(2000),
  lonelyPurchasingPower: new BigNumber(2000),
  maxDebt: new BigNumber(2000),
  liquidationPrice: new BigNumber(134.123456789),
  leverage: new BigNumber(2.345),
  availableDebt: new BigNumber(2000),
  maxSafeLeverage: new BigNumber(2.5),
  availableActions: [],
  availableBalance: new BigNumber(2000),
  lockedBalance: new BigNumber(200),
  safe: true,
  liquidationInProgress: false,
  currentCollRatio: new BigNumber(234.567)
};

const ethMarginableAsset = getMarginableCore({
  name: 'WETH',
  balance: new BigNumber(100),
  walletBalance: new BigNumber(100),
  allowance: true,
  // ma core
  debt: new BigNumber(5000),
  referencePrice: new BigNumber(200),
  minCollRatio: new BigNumber(1.5),
  safeCollRatio: new BigNumber(1.9),
  // maxSafeLeverage: new BigNumber(2),
});

stories.add('CDP 1', () => (
  <MTMyPositionView {...ethMarginableAsset} {...MarginableAssetFixture} />
));

//
// export class MTMyPositionView
//   extends React.Component<MarginableAsset>
// {
//   public render() {
//     return <div>
//       Amount: { this.props.balance.toString() }
//       <br />
//       Dai generated: { this.props.debt.toString() }
//       <br />
//       Coll. Ratio: { this.props.currentCollRatio && this.props.currentCollRatio.toString() }
//       <br />
//       Liquidation Price: { this.props.liquidationPrice && this.props.liquidationPrice.toString() }
//       <br />
//       Price Feed: { this.props.referencePrice && this.props.referencePrice.toString() }
//       <br />
//       Type: Long { this.props.leverage && this.props.leverage.toString() }
//       <br />
//       PnL: ?
//       <br />
//       Open Price: ?
//       <br />
//       Interest Owed: ?
//       <br />
//     </div>;
//   }
// }
