// import { storiesOf } from '@storybook/react';
// import { BigNumber } from 'bignumber.js';
// import * as React from 'react';
//
// import { OfferType } from '../../exchange/orderbook/orderbook';
// import { GasEstimationStatus } from '../../utils/form';
// import { FlexLayoutRow } from '../../utils/layout/FlexLayoutRow';
// import { Panel } from '../../utils/panel/Panel';
// import { getMTAccount } from '../state/mtTestUtils';
// import { FormStage, MessageKind, MTSimpleFormState } from './mtOrderForm';
// import { MtOrderFormView } from './mtOrderFormView';
//
// const stories = storiesOf('Margin Trading/Order form', module);
//
// const normalPanelStyle = { width: '454px', height: '530px',
//   display: 'inline-block', marginRight: '2em' };
// const narrowPanelStyle = { width: '398px', height: '530px', display: 'inline-block' };
//
// const defaultMta = getMTAccount({
//   cash: {
//     name: 'DAI',
//     balance: new BigNumber(234),
//     walletBalance: new BigNumber(0),
//   },
//   marginableAssets: [{
//     name: 'MKR',
//     balance: new BigNumber(120),
//     walletBalance: new BigNumber(0),
//     referencePrice: new BigNumber(12),
//     safeCollRatio: new BigNumber(2),
//   }],
// });
//
// const defaultFormParams: MTSimpleFormState = {
//   baseToken: 'MKR',
//   quoteToken: 'DAI',
//   kind: OfferType.buy,
//   mta: defaultMta,
//   stage: FormStage.editing,
//   gasEstimationStatus: GasEstimationStatus.unset,
//   messages: [],
//   change: () => null,
//   submit: () => null,
// };
//
// stories.add('Default form', () => {
//   console.warn(defaultMta);
//   return (
//     <div style={{ width: '932px' }}>
//       <FlexLayoutRow>
//         <Panel style={normalPanelStyle}>
//           <MtOrderFormView {...defaultFormParams} />
//         </Panel>
//         <Panel style={narrowPanelStyle}>
//           <MtOrderFormView {...defaultFormParams} />
//         </Panel>
//       </FlexLayoutRow>
//       <FlexLayoutRow>
//         <Panel style={normalPanelStyle}>
//           <MtOrderFormView {...defaultFormParams} kind={OfferType.sell} />
//         </Panel>
//         <Panel style={narrowPanelStyle}>
//           <MtOrderFormView {...defaultFormParams} kind={OfferType.sell} />
//         </Panel>
//       </FlexLayoutRow>
//     </div>
//   );
// });
//
// stories.add('Buy ready to go', () => {
//   const params = {
//     ...defaultFormParams,
//     amount: new BigNumber(15),
//     price: new BigNumber(10),
//     total: new BigNumber(150),
//     gasEstimationStatus: GasEstimationStatus.calculated,
//     gasEstimationEth: new BigNumber(0.12),
//     gasEstimationUsd: new BigNumber(1.24),
//     stage: FormStage.readyToAllocateDebt,
//   };
//   return (
//     <div style={{ width: '932px' }}>
//       <FlexLayoutRow>
//         <Panel style={normalPanelStyle}>
//           <MtOrderFormView {...params} />
//         </Panel>
//         <Panel style={narrowPanelStyle}>
//           <MtOrderFormView {...params} />
//         </Panel>
//       </FlexLayoutRow>
//     </div>
//   );
// });
//
// stories.add('Sell ready to go', () => {
//   const params = {
//     ...defaultFormParams,
//     kind: OfferType.sell,
//     amount: new BigNumber(15),
//     price: new BigNumber(3),
//     total: new BigNumber(45),
//     gasEstimationStatus: GasEstimationStatus.calculated,
//     gasEstimationEth: new BigNumber(0.12),
//     gasEstimationUsd: new BigNumber(1.24),
//     stage: FormStage.readyToAllocateDebt,
//   };
//   return (
//     <div style={{ width: '932px' }}>
//       <FlexLayoutRow>
//         <Panel style={normalPanelStyle}>
//           <MtOrderFormView {...params} />
//         </Panel>
//         <Panel style={narrowPanelStyle}>
//           <MtOrderFormView {...params} />
//         </Panel>
//       </FlexLayoutRow>
//     </div>
//   );
// });
//
// stories.add('Validation', () => {
//   return (
//     <div style={{ width: '932px' }}>
//       <FlexLayoutRow>
//         <Panel style={normalPanelStyle}>
//           <MtOrderFormView {...defaultFormParams}
//           amount={new BigNumber(2)}
//           price={new BigNumber(600)}
//           total={new BigNumber(1200)}
//           messages={[
//             {
//               kind: MessageKind.insufficientAmount,
//               field: 'total',
//               priority: -1,
//               token: 'DAI'
//             },
//           ]} />
//         </Panel>
//         <Panel style={narrowPanelStyle}>
//           <MtOrderFormView {...defaultFormParams}
//             kind={OfferType.sell}
//             amount={new BigNumber(2)}
//             price={new BigNumber(600)}
//             total={new BigNumber(1200)}
//             messages={[
//               {
//                 kind: MessageKind.insufficientAmount,
//                 field: 'amount',
//                 priority: -1,
//                 token: 'MKR'
//               },
//             ]} />
//         </Panel>
//       </FlexLayoutRow>
//       <FlexLayoutRow>
//         <Panel style={normalPanelStyle}>
//           <MtOrderFormView {...defaultFormParams}
//           amount={new BigNumber(9999999)}
//           price={new BigNumber(200000000)}
//           total={new BigNumber(1999999800000000)}
//           messages={[
//             {
//               kind: MessageKind.incredibleAmount,
//               field: 'total',
//               priority: -1,
//               token: 'DAI'
//             },
//           ]} />
//         </Panel>
//         <Panel style={narrowPanelStyle}>
//           <MtOrderFormView {...defaultFormParams}
//             kind={OfferType.sell}
//             amount={new BigNumber(9999999)}
//             price={new BigNumber(200000000)}
//             total={new BigNumber(1999999800000000)}
//             messages={[
//               {
//                 kind: MessageKind.incredibleAmount,
//                 field: 'amount',
//                 priority: -1,
//                 token: 'MKR'
//               },
//             ]} />
//         </Panel>
//       </FlexLayoutRow>
//       <FlexLayoutRow>
//         <Panel style={normalPanelStyle}>
//           <MtOrderFormView {...defaultFormParams}
//             amount={new BigNumber(0.001)}
//             price={new BigNumber(1)}
//             total={new BigNumber(0.001)}
//             messages={[
//               {
//                 kind: MessageKind.dustAmount,
//                 field: 'total',
//                 priority: -1,
//                 token: 'DAI',
//                 amount: new BigNumber(0.01),
//               },
//             ]} />
//         </Panel>
//         <Panel style={narrowPanelStyle}>
//           <MtOrderFormView {...defaultFormParams}
//             kind={OfferType.sell}
//             amount={new BigNumber(0.001)}
//             price={new BigNumber(1)}
//             total={new BigNumber(0.001)}
//             messages={[
//               {
//                 kind: MessageKind.dustAmount,
//                 field: 'amount',
//                 priority: -1,
//                 token: 'MKR',
//                 amount: new BigNumber(0.01),
//               },
//             ]} />
//         </Panel>
//       </FlexLayoutRow>
//       <FlexLayoutRow>
//         <Panel style={normalPanelStyle}>
//           <MtOrderFormView {...defaultFormParams}
//             amount={new BigNumber(0)}
//             price={new BigNumber(1)}
//             total={new BigNumber(0)}
//             messages={[
//               {
//                 kind: MessageKind.dustTotal,
//                 field: 'total',
//                 priority: -1,
//               },
//             ]} />
//         </Panel>
//         <Panel style={narrowPanelStyle}>
//           <MtOrderFormView {...defaultFormParams}
//             kind={OfferType.sell}
//             amount={new BigNumber(0)}
//             price={new BigNumber(1)}
//             total={new BigNumber(0)}
//             messages={[
//               {
//                 kind: MessageKind.dustTotal,
//                 field: 'total',
//                 priority: -1,
//               },
//             ]} />
//         </Panel>
//       </FlexLayoutRow>
//     </div>
//   );
// });
