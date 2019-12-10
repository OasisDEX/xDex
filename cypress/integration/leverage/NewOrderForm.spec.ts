import { Account } from '../../pages/leverage/Account';
import { Form } from '../../pages/leverage/Form';
import { Tab } from '../../pages/Tab';
import { WalletConnection } from '../../pages/WalletConnection';
import { cypressVisitWithoutProvider, cypressVisitWithWeb3 } from '../../utils';
import { Position } from '../../pages/leverage/Position';

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

  // TODO: Waiting for Kuba to clarify the case with Purchasing Power
  context('with connected wallet, proxy deployed and allowance set', () => {
    beforeEach(() => {
      cypressVisitWithWeb3();
      Tab.leverage();

      WalletConnection.connect();
      WalletConnection.isConnected();

      Account.setupProxy();
      Account.shouldHaveProxyCreated();
      Account.setCollateralAllowance();
      Account.leveragePositionShouldBeDisplayed();
    });

    // TODO: Current purchasing power might differ. ( check Kuba )
    it('should update form after collateral is depositted', () => {
      Form.currentPurchasingPowerIs('0.00');
      Form.currentBalanceIs('0.00000');
      Form.currentDaiBalanceIs('0.0000')

      Position.depositCollateral(5);

      Form.currentPurchasingPowerIs('616.79');
      Form.currentBalanceIs('5.00000');
      Form.currentDaiBalanceIs('0.0000')
      Form.currentLiquidationPrice('-');
      Form.currentPriceIs('301.0000')
    });

    it('should recalculate position parameters when amount is entered', () => {
      Position.depositCollateral(5);

      Form.amountInput().type('2');
      Form.totalInput().should('have.value', '602.0000')

      Form.currentPurchasingPowerIs('616.79');
      Form.estimatedPurchasingPowerIs('14.79');
      Form.currentBalanceIs('5.00000');
      Form.estimatedBalanceIs('7.00000');
      Form.currentDaiBalanceIs('0.0000');
      Form.estimatedDaiBalanceIs('-602.0000');
      Form.currentLiquidationPrice('-');
      Form.estimatedLiquidationPrice('129.00');
      Form.currentPriceIs('301.0000');
      Form.slippageLimitIs('5.00');
    });

    it('should recalculate position parameters when total is entered', () => {
      Position.depositCollateral(5);

      Form.totalInput().type('602');
      Form.amountInput().should('have.value', '2.00000')

      Form.currentPurchasingPowerIs('616.79');
      Form.estimatedPurchasingPowerIs('14.79');
      Form.currentBalanceIs('5.00000');
      Form.estimatedBalanceIs('7.00000');
      Form.currentDaiBalanceIs('0.0000');
      Form.estimatedDaiBalanceIs('-602.0000');
      Form.currentLiquidationPrice('-');
      Form.estimatedLiquidationPrice('129.00');
      Form.currentPriceIs('301.0000');
      Form.slippageLimitIs('5.00');
    });

    it('should update position after buying on leverage (enter amount)', () => {
      Position.depositCollateral(5);

      Form.amountInput().type('2');
      Form.placeOrderBtn().click();

      Form.currentPurchasingPowerIs('14.79');
      Form.currentBalanceIs('6.99999');
      Form.currentDaiBalanceIs('-602.0000');
      Form.currentLiquidationPrice('129.00');
      Form.currentPriceIs('301.0000');
      Form.slippageLimitIs('5.00');
    });

    it.only('should update position after buying on leverage (enter total)', () => {
      Position.depositCollateral(5);

      Form.totalInput().type('602');
      Form.placeOrderBtn().click();

      Form.currentPurchasingPowerIs('14.79');
      Form.currentBalanceIs('6.99999');
      Form.currentDaiBalanceIs('-602.0000');
      Form.currentLiquidationPrice('129.00');
      Form.currentPriceIs('301.0000');
      Form.slippageLimitIs('5.00');
    })
  });
});
