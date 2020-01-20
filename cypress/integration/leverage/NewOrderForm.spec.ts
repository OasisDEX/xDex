import { Account } from '../../pages/leverage/Account';
import { Form } from '../../pages/leverage/Form';
import { Position } from '../../pages/leverage/Position';
import { Tab } from '../../pages/Tab';
import { WalletConnection } from '../../pages/WalletConnection';
import { cypressVisitWithoutProvider, cypressVisitWithWeb3, tid } from '../../utils';
import { Modal } from '../../pages/leverage/Modal';
import { format } from 'path';
import { formatWithOptions } from 'util';

describe('Leverage form', () => {
  context.skip('without provider', () => {
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

  context('with connected wallet', () => {
    beforeEach(() => {
      cypressVisitWithWeb3();
      Tab.leverage();

      WalletConnection.connect();
      WalletConnection.isConnected();

      // TODO: refactor this object. It should return the process with 2 steps , setting proxy, setting allowance.
      Modal.open(Position.new('WETH'));
      Account.setupProxy();
      Account.setAllowance();
      Account.shouldSeeDepositForm();  
      Account.deposit(1);
      
      Account.depositedAmount(/1.../);
      Modal.close();
    });

    it('should display form params', () => {
      Form.currentPurchasingPowerIs('123.35');
      Form.currentBalanceIs('1.00');
      Form.currentDaiBalanceIs('0.00');
      Form.currentPriceIs('301.00');
      Form.currentLiquidationPrice('-');
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

      it('entering amount value without sufficied collateral locked', () => {
        Form.amountInput().type('2');
        Form.totalInput().should('have.value', '602.0000');
        Form.expectTotalInputError('Your DAI balance is too low to fund this order');
        Form.placeOrderBtn().should('be.disabled');
      });

      it('entering value for total without sufficient collateral locked', () => {
        Form.totalInput().type('602');
        Form.amountInput().should('have.value', '2.00000');
        Form.expectTotalInputError('Your DAI balance is too low to fund this order');
        Form.placeOrderBtn().should('be.disabled');
      });

      it('entering value for amount exceeding orderbook size', () => {
        Form.amountInput().type('11');
        Form.totalInput().should('be.empty');
        Form.expectAmountInputError('Can\'t calculate: orderbook too shallow. Type smaller amount');
        Form.placeOrderBtn().should('be.disabled');
      });

      it('entering value for total exceeding orderbook size', () => {
        Form.totalInput().type('10000');
        Form.amountInput().should('be.empty');
        Form.expectTotalInputError('Can\'t calculate: orderbook too shallow. Type smaller amount');
        Form.placeOrderBtn().should('be.disabled');
      });

      it('using leverage', () => {
        const purchasingPower = new RegExp(/23.34/);
        const colBalance = new RegExp(/1.33222/);
        const daiBalance = new RegExp(/-99.9982/);
        const liquidationPrice = new RegExp(/112.59/);

        Form.amountInput().type('0.33222');
        Form.totalInput().should('have.value', '99.9982');
        Form.estimatedPurchasingPowerIs(purchasingPower);
        Form.estimatedBalanceIs(colBalance);
        Form.estimatedDaiBalanceIs(daiBalance);
        Form.estimatedLiquidationPrice(liquidationPrice)

        Form.placeOrderBtn().click();
        
        Form.currentPurchasingPowerIs(purchasingPower);
        Form.currentBalanceIs(colBalance);
        Form.currentDaiBalanceIs(daiBalance);
        Form.currentLiquidationPrice(liquidationPrice);
      })
    });

    context('selling collateral', () => {

      beforeEach(() => {
        Form.selectOrderType('sell');
      });

      it('entering amount vlaue without sufficient collateral locked', () => {
        Form.amountInput().type('2');
        Form.totalInput().should('have.value', '555.0000');
        Form.expectAmountInputError('Your WETH balance is too low to fund this order');
        Form.placeOrderBtn().should('be.disabled');
      });

      it('entering total vlaue without sufficient collateral locked', () => {
        Form.totalInput().type('555');
        Form.amountInput().should('have.value', '2.00000');
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

      it.only('using leverage', () => {
        Form.selectOrderType('buy');
        const purchasingPower = new RegExp(/77.62/);
        const colBalance = new RegExp(/1.13222/);
        const daiBalance = new RegExp(/-43.9982/);
        const liquidationPrice = new RegExp(/58.29/);

        Form.amountInput().type('0.33222');
        Form.totalInput().should('have.value', '99.9982');

        Form.placeOrderBtn().click();        
        Form.currentPurchasingPowerIs(/23.34/);
        Form.currentBalanceIs(/1.33222/);
        Form.currentDaiBalanceIs(/-99.9982/);

        Form.selectOrderType('sell');

        Form.amountInput().type('0.2');
        Form.totalInput().should('have.value', '56.0000');

        // Form.estimatedPurchasingPowerIs(purchasingPower);
        Form.estimatedBalanceIs(colBalance);
        Form.estimatedDaiBalanceIs(daiBalance);
        Form.estimatedLiquidationPrice(liquidationPrice)

        Form.placeOrderBtn().click();
        
        // Form.currentPurchasingPowerIs(purchasingPower);
        Form.currentBalanceIs(colBalance);
        Form.currentDaiBalanceIs(daiBalance);
        Form.currentLiquidationPrice(liquidationPrice);
      })
    });
  });
});
