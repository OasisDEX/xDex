import { BigNumber } from 'bignumber.js';
import { OfferType } from '../../exchange/orderbook/orderbook';

export enum TxMetaKind {
  cancel = 'cancel',
  offerMake = 'offerMake',
  approveWallet = 'approveWallet',
  disapproveWallet = 'disapproveWallet',
  wrap = 'wrap',
  unwrap = 'unwrap',
  tradePayWithETHWithProxy = 'tradePayWithETHWithProxy',
  tradePayWithETHNoProxy = 'tradePayWithETHWithProxy',
  tradePayWithERC20 = 'tradePayWithERC20',
  setupProxy = 'setupProxy',
  approveProxy = 'approveProxy',
  disapproveProxy = 'disapproveProxy',
  setupMTProxy = 'setupMTProxy',
  approveMTProxy = 'approveMTProxy',
  fundMTAccount = 'fundMTAccount',
  drawMTAccount = 'drawMTAccount',
  buyMTAccount = 'buyMTAccount',
  sellMTAccount = 'sellMTAccount',
  reallocateMTAccount = 'reallocateMTAccount',
  makeLinearOffers = 'makeLinearOffers',
  cancelAllOffers = 'cancelAllOffers',
  swapSai = 'swapSai',
  swapDai = 'swapDai',
  devDrip = 'devDrip',
  devChangePrice = 'devChangePrice',
  devChangePriceAndPoke = 'devChangePriceAndPoke',
  devPokeOsm = 'devPokeOsm',
  devPokeSpotter = 'devPokeSpotter',
  redeem = 'redeem',
  export = 'export',
  recoverERC20 = 'recoverERC20',
}

export type TxMeta = {
  description: string;
} & (
  | {
      kind: TxMetaKind.cancel;
      offerId: BigNumber;
    }
  | {
      kind: TxMetaKind.offerMake;
      act: OfferType;
      baseAmount: BigNumber;
      baseToken: string;
      quoteAmount: BigNumber;
      quoteToken: string;
      price: BigNumber;
    }
  | {
      kind: TxMetaKind.approveWallet;
      token: string;
    }
  | {
      kind: TxMetaKind.disapproveWallet;
      token: string;
    }
  | {
      kind: TxMetaKind.wrap;
      amount: BigNumber;
    }
  | {
      kind: TxMetaKind.unwrap;
      amount: BigNumber;
    }
  | {
      kind: TxMetaKind.tradePayWithETHWithProxy | TxMetaKind.tradePayWithETHNoProxy;
      buyAmount: BigNumber;
      sellAmount: BigNumber;
      buyToken: string;
      sellToken: string;
    }
  | {
      kind: TxMetaKind.setupMTProxy;
    }
  | {
      kind: TxMetaKind.approveMTProxy;
      token: string;
    }
  | {
      kind: TxMetaKind.fundMTAccount;
      amount: BigNumber;
      token: string;
    }
  | {
      kind: TxMetaKind.drawMTAccount;
      amount: BigNumber;
      token: string;
    }
  | {
      kind: TxMetaKind.buyMTAccount;
      amount: BigNumber;
      price: BigNumber;
      token: string;
    }
  | {
      kind: TxMetaKind.sellMTAccount;
      amount: BigNumber;
      price: BigNumber;
      token: string;
    }
  | {
      kind: TxMetaKind.reallocateMTAccount;
    }
);
