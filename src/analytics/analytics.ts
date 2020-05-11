import * as mixpanel from 'mixpanel-browser';
import { Dictionary } from 'ramda';
import { OfferType } from '../exchange/orderbook/orderbook';
import { UserActionKind } from '../marginTrading/state/mtAccount';
import * as Fathom from './fathom';

export const trackingEvents = {
  pageView: (location: string) => {
    mixpanel.track('Pageview', {
      product: 'oasis-trade',
      id: location,
    });
    Fathom.trackPageview();
  },
  initiateTradeInstant: (kind: OfferType, total: number, pair: string) => {
    mixpanel.track('btn-click', {
      id: 'initiate-trade',
      product: 'oasis-trade',
      page: 'Instant',
      section: 'order-details',
    });

    const fathomGoal: Dictionary<string> =
      kind === OfferType.buy
        ? (Fathom.fathomGoals.instantBuy as Dictionary<string>)
        : (Fathom.fathomGoals.instantSell as Dictionary<string>);

    Fathom.trackGoal(fathomGoal[pair], total);
  },
  initiateTradeMarket: (kind: OfferType, total: number, pair: string) => {
    mixpanel.track('btn-click', {
      kind,
      id: 'initiate-trade',
      product: 'oasis-trade',
      page: 'Market',
      section: 'create-order',
    });

    const fathomGoal: Dictionary<string> =
      kind === OfferType.buy
        ? (Fathom.fathomGoals.marketBuy as Dictionary<string>)
        : (Fathom.fathomGoals.marketSell as Dictionary<string>);

    Fathom.trackGoal(fathomGoal[pair], total);
  },
  initiateTradeLeverage: (kind: OfferType, total: number) => {
    mixpanel.track('btn-click', {
      kind,
      id: 'initiate-trade',
      product: 'oasis-trade',
      page: 'Leverage',
      section: 'manage-multiple',
    });

    const fathomGoal = kind === OfferType.buy ? Fathom.fathomGoals.multipleBuy : Fathom.fathomGoals.multipleSell;

    Fathom.trackGoal(fathomGoal, total);
  },
  taxExport: () => {
    mixpanel.track('btn-click', {
      id: 'export-trades',
      product: 'oasis-trade',
      page: 'Account',
      section: 'history-export',
    });
  },
  changeOrderType: () => {
    mixpanel.track('btn-click', {
      id: 'submit-order-type',
      product: 'oasis-trade',
      page: 'Market',
      section: 'choose-order-type',
    });
  },
  changeOrderbookType: () => {
    mixpanel.track('btn-click', {
      id: 'change-orderbook-view',
      product: 'oasis-trade',
      page: 'Market',
      section: 'orderbook',
    });
  },
  changeAssetPair: (base: string, quote: string) => {
    mixpanel.track('btn-click', {
      pair: `${base}${quote}`,
      id: 'change-asset-pair',
      product: 'oasis-trade',
      page: 'Market',
      section: 'asset-picker',
    });
  },
  transferTokens: (actionKind: string, token: string, amount: number) => {
    const { depositDai, depositCollateral, withdrawDai, withdrawCollateral } = Fathom.fathomGoals;

    mixpanel.track('btn-click', {
      id: `${actionKind}-${token === 'DAI' ? 'dai' : 'collateral'}-submit`,
      product: 'oasis-trade',
      page: 'Leverage',
      section: 'deposit-withdraw-modal',
      currency: token,
    });
    if (actionKind === UserActionKind.fund) {
      Fathom.trackGoal(token === 'DAI' ? depositDai : depositCollateral, amount);
    }
    if (actionKind === UserActionKind.draw) {
      Fathom.trackGoal(token === 'DAI' ? withdrawDai : withdrawCollateral, amount);
    }
  },
  daiUsdToggle: (toggle: boolean) => {
    mixpanel.track('btn-click', {
      id: 'dai-usd-toggle',
      product: 'oasis-trade',
      page: 'Leverage',
      section: 'my-position',
      currency: toggle ? 'usd' : 'dai',
    });
  },
  depositCollateral: () => {
    mixpanel.track('btn-click', {
      id: 'fund-collateral-open',
      product: 'oasis-trade',
      page: 'Leverage',
      section: 'my-position',
    });
  },
  depositDai: () => {
    mixpanel.track('btn-click', {
      id: 'fund-dai-open',
      product: 'oasis-trade',
      page: 'Leverage',
      section: 'my-position',
    });
  },
  withdrawCollateral: () => {
    mixpanel.track('btn-click', {
      id: 'draw-collateral-open',
      product: 'oasis-trade',
      page: 'Leverage',
      section: 'my-position',
    });
  },
  withdrawDai: () => {
    mixpanel.track('btn-click', {
      id: 'draw-dai-open',
      product: 'oasis-trade',
      page: 'Leverage',
      section: 'my-position',
    });
  },
  accountChange: (account: string, network: string) => {
    mixpanel.track('account-change', {
      account,
      network,
      product: 'oasis-trade',
      wallet: 'metamask',
    });
    Fathom.trackGoal(Fathom.fathomGoals.connectWallet, 0);
  },
  txNotification: (txStatus: string, network: string) => {
    mixpanel.track('notification', {
      network,
      product: 'oasis-trade',
      status: txStatus,
    });
  },
  cancelOffer: () => {
    Fathom.trackGoal(Fathom.fathomGoals.cancelOffer, 0);
  },
};
