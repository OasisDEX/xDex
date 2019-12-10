import { Account } from '../../pages/leverage/Account';
import { Form } from '../../pages/leverage/Form';
import { Tab } from '../../pages/Tab';
import { WalletConnection } from '../../pages/WalletConnection';
import { cypressVisitWithoutProvider, cypressVisitWithWeb3 } from '../../utils';

describe('Leverage form', () => {
  context('without provider', () => {
    beforeEach(() => {
      cypressVisitWithoutProvider();
      Tab.leverage();
    });

    it('should ask the user to connect the wallet', () => {
      Form.shouldAskUserToConnect();
    });

    it('should not do form calculations when values are entered in amount input', () => {
      Form.amountInput().type('12345');
      Form.shouldAskUserToConnect();
      Form.totalInput().should('be.empty');
      Form.leverageIs('-');
      Form.interestRateIs('-');
      Form.placeOrderBtn().should('be.disabled');
    });

    it('should not do form calculations when values are entered in total input', () => {
      Form.totalInput().type('12345');
      Form.shouldAskUserToConnect();
      Form.amountInput().should('be.empty');
      Form.leverageIs('-');
      Form.interestRateIs('-');
      Form.placeOrderBtn().should('be.disabled');
    });

    // TODO: Waiting for Kuba to verify the expected behavior. This is a placeholder.
    // tslint:disable:no-empty
    it.skip('should be or not be able to switch to sell order form', () => {

    });

    // TODO: Waiting for Kuba to verify the expected behavior. This is a placeholder.
    // tslint:disable:no-empty
    it.skip('should be or not be able to check form settings ( slippage )', () => {});
  });

    // TODO: Skip for now because of misimplementation. Account should be taken from user
    // The behavior of those tests should be line the ones in missing provider.
  context.skip('without wallet connected', () => {
    beforeEach(() => {
      cypressVisitWithWeb3();
      Tab.leverage();
    });

    it('should ask the user to connect the wallet', () => {
      Form.shouldAskUserToConnect();
    });

    it('should not do form calculations when values are entered in amount input', () => {
      Form.amountInput().type('12345');
      Form.shouldAskUserToConnect();
      Form.totalInput().should('be.empty');
      Form.leverageIs('-');
      Form.interestRateIs('-');
      Form.placeOrderBtn().should('be.disabled');
    });

    it('should not do form calculations when values are entered in total input', () => {
      Form.totalInput().type('12345');
      Form.shouldAskUserToConnect();
      Form.amountInput().should('be.empty');
      Form.leverageIs('-');
      Form.interestRateIs('-');
      Form.placeOrderBtn().should('be.disabled');
    });

    // tslint:disable:no-empty
    it('should be or not be able to switch to sell order form', () => {

    });
    // tslint:disable:no-empty
    it('should be or not be able to check form settings ( slippage )', () => {});
  });

  context('with connected wallet, no proxy', () => {
    beforeEach(() => {
      cypressVisitWithWeb3();
      Tab.leverage();

      WalletConnection.connect();
      WalletConnection.isConnected();
    });

    it('should ask the user to deploy proxy', () => {
      Form.shouldAskUserToDeployProxy();
    });

    // Add test checking if anything is getting calculated
    // First wait for Kuba's clarification.
  });

  context('with connected wallet, proxy deployed no allowance', () => {
    beforeEach(() => {
      cypressVisitWithWeb3();
      Tab.leverage();

      WalletConnection.connect();
      WalletConnection.isConnected();

      Account.setupProxy();
      Account.shouldHaveProxyCreated();
    });

    it('should display form params', () => {
      Form.currentPurchasingPowerIs('0.00');
      Form.currentBalanceIs('0.00');
      Form.currentDaiBalanceIs('0.00');
      Form.currentPriceIs('301.00');
    });

    it('should be able to change slippage limi', () => {
      Form.slippageLimitIs('5.00');
      Form.changeSlippageLimitTo(3);
      Form.slippageLimitIs('3.00');
    });

    context('buying collateral', () => {
      beforeEach(() => {
        Form.selectOrderType('buy');
      });

      it('entering amount value without any collateral locked', () => {
        Form.amountInput().type('1');
        Form.totalInput().should('have.value', '301.0000');
        Form.expectTotalInputError('Your DAI balance is too low to fund this order');
        Form.placeOrderBtn().should('be.disabled');
      });

      it('entering value for total without any collateral locked', () => {
        Form.totalInput().type('301');
        Form.amountInput().should('have.value', '1.00000');
        Form.expectTotalInputError('Your DAI balance is too low to fund this order');
        Form.placeOrderBtn().should('be.disabled');
      });

      it('entering value for amount without any collateral locked exceeding orderbook size', () => {
        Form.amountInput().type('11');
        Form.totalInput().should('be.empty');
        Form.expectAmountInputError('Can\'t calculate: orderbook too shallow. Type smaller amount');
        Form.placeOrderBtn().should('be.disabled');
      });

      it('entering value for total without any collateral locked exceeding orderbook size', () => {
        Form.totalInput().type('10000');
        Form.amountInput().should('be.empty');
        Form.expectTotalInputError('Can\'t calculate: orderbook too shallow. Type smaller amount');
        Form.placeOrderBtn().should('be.disabled');
      });
    });

    context('selling collateral', () => {

      beforeEach(() => {
        Form.selectOrderType('sell');
      });

      it('entering amount vlaue without any collateral locked', () => {
        Form.amountInput().type('1');
        Form.totalInput().should('have.value', '280.0000');
        Form.expectAmountInputError('Your WETH balance is too low to fund this order');
        Form.placeOrderBtn().should('be.disabled');
      });

      it('entering total vlaue without any collateral locked', () => {
        Form.totalInput().type('302');
        Form.amountInput().should('have.value', '1.08000');
        Form.expectAmountInputError('Your WETH balance is too low to fund this order');
        Form.placeOrderBtn().should('be.disabled');
      });

      it('entering value for amount without any collateral locked exceeding orderbook size', () => {
        Form.amountInput().type('5');
        Form.totalInput().should('be.empty');
        Form.expectAmountInputError('Can\'t calculate: orderbook too shallow. Type smaller amount');
        Form.placeOrderBtn().should('be.disabled');
      });

      it('entering value for total without any collateral locked exceeding orderbook size', () => {
        Form.totalInput().type('10000');
        Form.amountInput().should('be.empty');
        Form.expectTotalInputError('Can\'t calculate: orderbook too shallow. Type smaller amount');
        Form.placeOrderBtn().should('be.disabled');
      });
    });
  });
});
