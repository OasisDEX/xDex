import { BigNumber } from 'bignumber.js';
import { Offer } from '../../exchange/orderbook/orderbook';
import { Impossible, isImpossible } from '../../utils/impossible';
import { minusOne, zero } from '../../utils/zero';
import { EditableDebt } from '../allocate/mtOrderAllocateDebtForm';
import { prepareBuyAllocationRequest } from '../plan/planBuy';
import { prepareSellAllocationRequest } from '../plan/planSell';
import {
  MarginableAsset,
  MTAccount,
  Operation
} from '../state/mtAccount';

type PlanInfo = [
  Operation[] | Impossible,
  {
    debtDelta: BigNumber
  }
];

export function getBuyPlan(
  mta: MTAccount,
  sellOffers: Offer[],
  baseToken: string,
  amount: BigNumber,
  price: BigNumber,
  realPurchasingPower: BigNumber,
): PlanInfo {

  const request = prepareBuyAllocationRequest(
    mta,
    sellOffers,
    baseToken,
    amount,
    price,
    realPurchasingPower
  );

  if (isImpossible(request)) {
    return [
      request,
      {
        debtDelta: zero
      }
    ];
  }

  const debtDelta = BigNumber.min(request.targetDaiBalance, zero).times(minusOne);

  return [
    request.createPlan([{
      ...request.assets.find(ai => ai.name === baseToken),
      delta: debtDelta
    } as Required<EditableDebt>]),
    { debtDelta }
  ];
}

export function getSellPlan(
  mta: MTAccount,
  buyOffers: Offer[],
  baseToken: string,
  amount: BigNumber,
  price: BigNumber,
  total: BigNumber,
): PlanInfo {

  const request = prepareSellAllocationRequest(
    mta,
    buyOffers,
    baseToken,
    amount,
    price,
  );

  if (isImpossible(request)) {
    return [
      request,
      {
        debtDelta: zero
      }
    ];
  }

  const asset: MarginableAsset =
    request.assets.find(ai => ai.name === baseToken) as MarginableAsset;

  const debtDelta = BigNumber.min(asset.debt, total).times(minusOne);

  return [
    request.createPlan([{
      ...request.assets.find(ai => ai.name === baseToken),
      delta: debtDelta
    } as Required<EditableDebt>]),
    { debtDelta }
  ];
}

// export function calculatePostOrder(state: MTSimpleFormState) {
//
//   const baseAsset =
//     findMarginableAsset(state.baseToken, state.mta) ||
//     findNonMarginableAsset(state.baseToken, state.mta);
//
//   if (!state.mta
//     || state.mta.state !== MTAccountState.setup
//     || !state.orderbook
//     || !baseAsset
//   ) {
//     return state;
//   }
//
//   const realPurchasingPower = baseAsset.assetKind === AssetKind.marginable ?
//     realPurchasingPowerMarginable(
//       baseAsset,
//       state.orderbook.sell)
//     :
//     realPurchasingPowerNonMarginable(
//       state.mta.cash.balance,
//       state.orderbook.sell
//     );
//
//   const realPurchasingPowerPost =
//     state.messages.length === 0 &&
//     state.total &&
//     realPurchasingPower.minus(state.total);
//
//   return {
//     ...state,
//     realPurchasingPower,
//     realPurchasingPowerPost:
//       realPurchasingPowerPost && realPurchasingPowerPost.gt(zero) ?
//         realPurchasingPowerPost : zero,
//   };
// }

  // const postTradeAsset = calculateMarginable(
  //   {
  //     ...asset,
  //     urnBalance: asset.urnBalance.plus(amount),
  //     debt: asset.debt.plus(delta)
  //   } as MarginableAssetCore,
  // );
  // const collRatioPost = postTradeAsset.currentCollRatio;
  // const liquidationPricePost = postTradeAsset.liquidationPrice;
  // const isSafePost = postTradeAsset.safe;
  // const leveragePost = postTradeAsset.leverage;
  // const balancePost = postTradeAsset.balance;
  // const daiBalancePost = postTradeAsset.debt.gt(zero) ?
  //   postTradeAsset.debt.times(minusOne) : postTradeAsset.dai;
