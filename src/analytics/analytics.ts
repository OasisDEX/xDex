import * as mixpanel from 'mixpanel-browser'
import { OfferType } from '../exchange/orderbook/orderbook'
import * as Fathom from './fathom'

export const trackingEvents = {
  pageView: (location: string) => {
    mixpanel.track('Pageview', {
      product: 'oasis-trade',
      id: location,
    })
    Fathom.trackPageview()
    // Fathom.trackGoal('RROZMOHX', 100);
  },
  initiateTrade: () => {
    mixpanel.track('btn-click', {
      id: 'initiate-trade',
      product: 'oasis-trade',
      page: 'Instant',
      section: 'order-details',
    })
  },
  initiateTradeInstant: () => {
    mixpanel.track('btn-click', {
      id: 'initiate-trade',
      product: 'oasis-trade',
      page: 'Instant',
      section: 'order-details',
      case: 'price-impact-warning',
    })
  },
  initiateTradeMarket: (kind: OfferType) => {
    mixpanel.track('btn-click', {
      kind,
      id: 'initiate-trade',
      product: 'oasis-trade',
      page: 'Market',
      section: 'create-order',
    })
  },
  initiateTradeLeverage: (kind: OfferType) => {
    mixpanel.track('btn-click', {
      kind,
      id: 'initiate-trade',
      product: 'oasis-trade',
      page: 'Leverage',
      section: 'manage-leverage',
    })
  },
  taxExport: () => {
    mixpanel.track('btn-click', {
      id: 'export-trades',
      product: 'oasis-trade',
      page: 'Account',
      section: 'history-export',
    })
  },
  changeOrderType: () => {
    mixpanel.track('btn-click', {
      id: 'submit-order-type',
      product: 'oasis-trade',
      page: 'Market',
      section: 'choose-order-type',
    })
  },
  changeOrderbookType: () => {
    mixpanel.track('btn-click', {
      id: 'change-orderbook-view',
      product: 'oasis-trade',
      page: 'Market',
      section: 'orderbook',
    })
  },
  changeAssetPair: (base: string, quote: string) => {
    mixpanel.track('btn-click', {
      pair: `${base}${quote}`,
      id: 'change-asset-pair',
      product: 'oasis-trade',
      page: 'Market',
      section: 'asset-picker',
    })
  },
  transferTokens: (actionKind: string, token: string) => {
    mixpanel.track('btn-click', {
      id: `${actionKind}-${token === 'DAI' ? 'dai' : 'collateral'}-submit`,
      product: 'oasis-trade',
      page: 'Leverage',
      section: 'deposit-withdraw-modal',
      currency: token,
    })
  },
  daiUsdToggle: (toggle: boolean) => {
    mixpanel.track('btn-click', {
      id: 'dai-usd-toggle',
      product: 'oasis-trade',
      page: 'Leverage',
      section: 'my-position',
      currency: toggle ? 'usd' : 'dai',
    })
  },
  depositCollateral: () => {
    mixpanel.track('btn-click', {
      id: 'fund-collateral-open',
      product: 'oasis-trade',
      page: 'Leverage',
      section: 'my-position',
    })
  },
  depositDai: () => {
    mixpanel.track('btn-click', {
      id: 'fund-dai-open',
      product: 'oasis-trade',
      page: 'Leverage',
      section: 'my-position',
    })
  },
  withdrawCollateral: () => {
    mixpanel.track('btn-click', {
      id: 'draw-collateral-open',
      product: 'oasis-trade',
      page: 'Leverage',
      section: 'my-position',
    })
  },
  withdrawDai: () => {
    mixpanel.track('btn-click', {
      id: 'draw-dai-open',
      product: 'oasis-trade',
      page: 'Leverage',
      section: 'my-position',
    })
  },
  accountChange: (account: string, network: string) => {
    mixpanel.track('account-change', {
      account,
      network,
      product: 'oasis-trade',
      wallet: 'metamask',
    })
  },
  txNotification: (txStatus: string, network: string) => {
    mixpanel.track('notification', {
      network,
      product: 'oasis-trade',
      status: txStatus,
    })
  },
}
