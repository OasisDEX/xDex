/*
 * Copyright (C) 2020 Maker Ecosystem Growth Holdings, INC.
 */

// import { storiesOf } from '@storybook/react';
// import { BigNumber } from 'bignumber.js';
// import * as React from 'react';
//
// import { Observable, of } from 'rxjs';
// import { shareReplay } from 'rxjs/operators';
// import { Calls, ReadCalls } from '../../blockchain/calls/calls';
// import { OfferType } from '../../exchange/orderbook/orderbook';
// import { GasEstimationStatus, ProgressStage } from '../../utils/form';
// import { impossible } from '../../utils/impossible';
// import { inject } from '../../utils/inject';
// import { Loadable, loadablifyLight } from '../../utils/loadable';
// import { ModalProps } from '../../utils/modal';
// import { unpack } from '../../utils/testHelpers';
// import { AllocationRequestPilot } from './allocate';
// import {
//   AllocateChangeKind,
//   createMTAllocateForm$,
//   MTAllocateState
// } from './mtOrderAllocateDebtForm';
// import {
//   BuyAllocateFormView,
//   OrderAllocateFormProps,
//   SellAllocateFormView
// } from './mtOrderAllocateDebtFormView';

// const stories = storiesOf('Margin Trading/Create position - allocate targetDebt', module);
//
// const wethAssetDefault = {
//   name: 'ETH',
//   balance: new BigNumber(8000),
//   debt: new BigNumber(17645.5),
//   safeCollRatio: new BigNumber(2),
//   minCollRatio: new BigNumber(1.5),
//   referencePrice: new BigNumber(1298.54),
//   maxDebt: new BigNumber(25000),
// };
//
// const dgxAssetDefault = {
//   name: 'DGX',
//   balance: new BigNumber(5000),
//   debt: new BigNumber(0),
//   minCollRatio: new BigNumber(1.6),
//   safeCollRatio: new BigNumber(1.5),
//   referencePrice: new BigNumber(150),
//   maxDebt: new BigNumber(15000),
// };
//
// const orderFormProps = {
//   baseToken: 'ETH',
//   amount: new BigNumber(5),
//   price: new BigNumber(100),
//   total: new BigNumber(500),
// } as OrderAllocateFormProps;
//
// function createForm(props?: { kind?: OfferType } & Partial<AllocationRequestPilot>
// ): Observable<MTAllocateState> {
//   const p = {
//     cashBalance: new BigNumber(800),
//     // targetDaiBalance = cashBalance -sum(debt) - maxTotal(if buy) + maxTotal(if sell)
//     targetDaiBalance: new BigNumber(800 - 17645.5 - 500),
//     defaultTargetCash: new BigNumber('800'),
//     assets: [wethAssetDefault, dgxAssetDefault], // AllocateInfo
//     createPlan: () => impossible('its only storybook'),
//     ...props
//   } as AllocationRequestPilot;
//   return createMTAllocateForm$(
//     of(new BigNumber('1.01')),
//     of(new BigNumber('100')),
//     of({} as Calls),
//     of({} as ReadCalls),
//     undefined,
//     p
//   ).pipe(shareReplay(1));
// }
//
// stories.add('Buy form with zero allocated dai', () => {
//
//   const form$ = createForm();
//   const MtOrderAllocateDebtFormViewTxRx =
//     connect<Loadable<MTAllocateState>, ModalProps>(
//       inject(BuyAllocateFormView, orderFormProps),
//       loadablifyLight(form$)
//     );
//
//   return (
//     <MtOrderAllocateDebtFormViewTxRx close={() => null} />
//   );
// });
//
// function get500daiFromCash(): Observable<MTAllocateState> {
//   const form$ = createForm();
//
//   unpack(form$).change({
//     kind: AllocateChangeKind.cashDeltaChange,
//     value: new BigNumber('-500')
//   });
//
//   return form$;
// }
//
// stories.add('Buy 5oo dai from cash - editing', () => {
//
//   const form$ = get500daiFromCash();
//   const MtOrderAllocateDebtFormViewTxRx =
//     connect<Loadable<MTAllocateState>, ModalProps>(
//       inject(BuyAllocateFormView, orderFormProps),
//       loadablifyLight(form$)
//     );
//
//   return (
//     <MtOrderAllocateDebtFormViewTxRx close={() => null} />
//   );
// });
//
// stories.add('Buy 5oo dai from cash - waiting for approval', () => {
//
//   const form = unpack(get500daiFromCash());
//   form.progress = ProgressStage.waitingForApproval;
//   form.gasEstimationStatus = GasEstimationStatus.calculated;
//   form.gasEstimationEth = new BigNumber('3.1');
//   form.gasEstimationUsd = new BigNumber('0.45');
//
//   return (
//     <BuyAllocateFormView
//       close={() => null}
//       status="loaded"
//       value={form}
//       {...orderFormProps}
//     />
//   );
// });
//
// function get500daiFromDgx(): Observable<MTAllocateState> {
//   const form$ = createForm();
//
//   unpack(form$).change({
//     kind: AllocateChangeKind.debtChange,
//     name: 'DGX',
//     value: new BigNumber('500')
//   });
//
//   return form$;
// }
//
// stories.add('Buy 5oo dai from DGX - editing', () => {
//
//   const form$ = get500daiFromDgx();
//
//   const MtOrderAllocateDebtFormViewTxRx =
//     connect<Loadable<MTAllocateState>, ModalProps>(
//       inject(BuyAllocateFormView, orderFormProps),
//       loadablifyLight(form$)
//     );
//
//   return (
//     <MtOrderAllocateDebtFormViewTxRx close={() => null} />
//   );
// });
//
// stories.add('Buy 5oo dai from DGX - waiting for approval', () => {
//
//   const form = unpack(get500daiFromDgx());
//   form.progress = ProgressStage.waitingForApproval;
//   form.gasEstimationStatus = GasEstimationStatus.calculated;
//   form.gasEstimationEth = new BigNumber('3.1');
//   form.gasEstimationUsd = new BigNumber('0.45');
//
//   return (
//     <BuyAllocateFormView
//       close={() => null}
//       status="loaded"
//       value={form}
//       {...orderFormProps}
//     />
//   );
// });
//
// function get500daiFromDaiEthAndDgx(): Observable<MTAllocateState> {
//   const form$ = createForm();
//   unpack(form$).change({
//     kind: AllocateChangeKind.cashDeltaChange,
//     value: new BigNumber('-100')
//   });
//
//   unpack(form$).change({
//     kind: AllocateChangeKind.debtChange,
//     name: 'ETH',
//     value: new BigNumber('17695.5')
//   });
//
//   unpack(form$).change({
//     kind: AllocateChangeKind.debtChange,
//     name: 'DGX',
//     value: new BigNumber('350')
//   });
//
//   return form$;
// }
//
// stories.add('Buy DAI from DAI, ETH and DGX - editing', () => {
//
//   const form$ = get500daiFromDaiEthAndDgx();
//
//   const MtOrderAllocateDebtFormViewTxRx =
//     connect<Loadable<MTAllocateState>, ModalProps>(
//       inject(BuyAllocateFormView, orderFormProps),
//       loadablifyLight(form$)
//     );
//
//   return (
//     <MtOrderAllocateDebtFormViewTxRx close={() => null} />
//   );
// });
// stories.add('Buy DAI from DAI, ETH and DGX - waiting for approval', () => {
//
//   const form: MTAllocateState = unpack(get500daiFromDaiEthAndDgx());
//   form.progress = ProgressStage.waitingForApproval;
//   form.gasEstimationStatus = GasEstimationStatus.calculated;
//   form.gasEstimationEth = new BigNumber('3.1');
//   form.gasEstimationUsd = new BigNumber('0.45');
//
//   return (
//     <BuyAllocateFormView
//       close={() => null}
//       status="loaded"
//       value={form}
//       {...orderFormProps}
//     />
//   );
// });
//
// // ------------------------------------------- sell ------------------------------------------
//
// stories.add('Sell form with zero allocated dai', () => {
//
//   const form$ = createForm({
//     // targetDaiBalance = cashBalance -sum(debt) - maxTotal(if buy) + maxTotal(if sell)
//     targetDaiBalance: new BigNumber(800 - 17645.5 + 1000),
//   });
//   const orderProps = {
//     ...orderFormProps,
//     price: new BigNumber(200),
//     total: new BigNumber(1000),
//   };
//   const MtOrderAllocateDebtFormViewTxRx =
//     connect<Loadable<MTAllocateState>, ModalProps>(
//       inject(SellAllocateFormView, orderProps),
//       loadablifyLight(form$)
//     );
//
//   return (
//     <MtOrderAllocateDebtFormViewTxRx close={() => null} />
//   );
// });
//
// function sellEthFor500dai(): Observable<MTAllocateState> {
//   const form$ = createForm({
//     // targetDaiBalance = cashBalance -sum(debt) - maxTotal(if buy) + maxTotal(if sell)
//     targetDaiBalance: new BigNumber(800 - 17645.5 + 500),
//   });
//
//   unpack(form$).change({
//     kind: AllocateChangeKind.cashDeltaChange,
//     value: new BigNumber('500')
//   });
//
//   return form$;
// }
//
// stories.add('Sell eth for 5oo dai - editing', () => {
//
//   const form$ = sellEthFor500dai();
//
//   const MtOrderAllocateDebtFormViewTxRx =
//     connect<Loadable<MTAllocateState>, ModalProps>(
//       inject(SellAllocateFormView, orderFormProps),
//       loadablifyLight(form$)
//     );
//
//   return (
//     <MtOrderAllocateDebtFormViewTxRx close={() => null} />
//   );
// });
//
// stories.add('Sell eth for 5oo dai - waiting for approval', () => {
//
//   const form = unpack(sellEthFor500dai());
//   form.progress = ProgressStage.waitingForApproval;
//   form.gasEstimationStatus = GasEstimationStatus.calculated;
//   form.gasEstimationEth = new BigNumber('3.1');
//   form.gasEstimationUsd = new BigNumber('0.45');
//
//   return (
//     <SellAllocateFormView
//       close={() => null}
//       status="loaded"
//       value={form}
//       {...orderFormProps}
//     />
//   );
// });
//
// function sellEthForDaiAndEth(): Observable<MTAllocateState> {
//   const form$ = createForm({
//     // targetDaiBalance = cashBalance -sum(debt) - maxTotal(if buy) + maxTotal(if sell)
//     targetDaiBalance: new BigNumber(800 - 17645.5 + 500),
//   });
//
//   unpack(form$).change({
//     kind: AllocateChangeKind.cashDeltaChange,
//     value: new BigNumber('100')
//   });
//
//   unpack(form$).change({
//     kind: AllocateChangeKind.debtDeltaChange,
//     value: new BigNumber('-450'),
//     name: 'ETH'
//   });
//
//   unpack(form$).change({
//     kind: AllocateChangeKind.debtDeltaChange,
//     value: new BigNumber('50'),
//     name: 'DGX'
//   });
//
//   return form$;
// }
//
// stories.add('Sell eth for dai and eth cdp - editing', () => {
//
//   const form$ = sellEthForDaiAndEth();
//
//   const MtOrderAllocateDebtFormViewTxRx =
//     connect<Loadable<MTAllocateState>, ModalProps>(
//       inject(SellAllocateFormView, orderFormProps),
//       loadablifyLight(form$)
//     );
//
//   return (
//     <MtOrderAllocateDebtFormViewTxRx close={() => null} />
//   );
// });
//
// stories.add('Sell eth for dai and eth cdp - waiting for approval', () => {
//
//   const form = unpack(sellEthForDaiAndEth());
//   form.progress = ProgressStage.waitingForApproval;
//   form.gasEstimationStatus = GasEstimationStatus.calculated;
//   form.gasEstimationEth = new BigNumber('3.1');
//   form.gasEstimationUsd = new BigNumber('0.45');
//
//   return (
//     <SellAllocateFormView
//       close={() => null}
//       status="loaded"
//       value={form}
//       {...orderFormProps}
//     />
//   );
// });
//
// function sellEthAndUseDaiForEth(): Observable<MTAllocateState> {
//   const form$ = createForm({
//     kind: OfferType.sell,
//     // targetDaiBalance = cashBalance -sum(debt) - maxTotal(if buy) + maxTotal(if sell)
//     targetDaiBalance: new BigNumber(800 - 17645.5 + 500),
//   });
//
//   unpack(form$).change({
//     kind: AllocateChangeKind.cashDeltaChange,
//     value: new BigNumber('-100')
//   });
//
//   unpack(form$).change({
//     kind: AllocateChangeKind.debtDeltaChange,
//     value: new BigNumber('-600'),
//     name: 'ETH'
//   });
//
//   return form$;
// }
//
// stories.add('Sell eth and use dai for eth cdp - editing', () => {
//
//   const form$ = sellEthAndUseDaiForEth();
//
//   const MtOrderAllocateDebtFormViewTxRx =
//     connect<Loadable<MTAllocateState>, ModalProps>(
//       inject(SellAllocateFormView, orderFormProps),
//       loadablifyLight(form$)
//     );
//
//   return (
//     <MtOrderAllocateDebtFormViewTxRx close={() => null} />
//   );
// });
//
// stories.add('Sell eth and use dai for eth cdp - waiting for approval', () => {
//
//   const form = unpack(sellEthAndUseDaiForEth());
//   form.progress = ProgressStage.waitingForApproval;
//   form.gasEstimationStatus = GasEstimationStatus.calculated;
//   form.gasEstimationEth = new BigNumber('3.1');
//   form.gasEstimationUsd = new BigNumber('0.45');
//
//   return (
//     <SellAllocateFormView
//       close={() => null}
//       status="loaded"
//       value={form}
//       {...orderFormProps}
//     />
//   );
// });
