import { Account } from '../../pages/leverage/Account';
import { Form } from '../../pages/leverage/Form';
import { Modal } from '../../pages/leverage/Modal';
import { Position } from '../../pages/leverage/Position';
import { Tab } from '../../pages/Tab';
import { WalletConnection } from '../../pages/WalletConnection';
import { cypressVisitWithoutProvider, cypressVisitWithWeb3 } from '../../utils';

describe('New Leverage Position', () => {
  beforeEach(() => {
    cypressVisitWithWeb3();

    WalletConnection.connect();
    WalletConnection.isConnected();

    Tab.leverage();
  });

  it('by depositing collateral', () => {
    Modal.open(Position.new('WETH'));
    Account.setupProxy();
    Account.setAllowance();
    Modal.hasActiveTab('Deposit');
    Account.deposit(1);

    Modal.hasActiveTab('Buy');
    Modal.close();

    Position.widgetShouldBeVisisble();
    Position.expectAmountOfCollateral(/1../);
  });

  it('by depositing DAI', () => {
    Modal.open(Position.new('DAI'));
    Account.setupProxy();
    Account.setAllowance();
    Modal.hasActiveTab('Deposit');
    Account.deposit(100);

    Modal.hasActiveTab('Buy');
    Modal.close();

    Position.widgetShouldBeVisisble();
    Position.expectAmountOfDAI(/100../);
  });
});

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
    it('should be or not be able to switch to sell order form', () => {});
    // tslint:disable:no-empty
    it('should be or not be able to check form settings ( slippage )', () => {});
  });

  context('with connected wallet', () => {
    beforeEach(() => {
      cypressVisitWithWeb3();
      WalletConnection.connect();
      WalletConnection.isConnected();
      Tab.leverage();
    });

    context('buying collateral using DAI', () => {
      beforeEach(() => {
        Modal.open(Position.new('DAI'));
        Account.setupProxy();
        Account.setAllowance();
        Modal.hasActiveTab('Deposit');
        Account.deposit(301);

        Modal.hasActiveTab('Buy');
        Modal.close();
        Form.selectOrderType('buy');
      });

      it('without generating debt', () => {
        Form.amountInput().type('0.5');
        Form.totalInput().should('have.value', '150.5000');
        Form.currentPurchasingPowerIs('424.35');
        Form.estimatedPurchasingPowerIs('273.85');
        Form.currentBalanceIs('0.00');
        Form.estimatedBalanceIs('0.5000');
        Form.currentDaiBalanceIs('301.00');
        Form.estimatedDaiBalanceIs('150.5');
        Form.currentPriceIs('301.00');
        Form.currentLiquidationPrice('-');
        Form.acceptedRiskCompliance();
        Form.placeOrder();

        Position.expectAmountOfCollateral(`0.5000`);
        Position.expectAmountOfDAI(`150.50`);

        Position.withdrawDAI(150.5);
        Position.expectAmountOfCollateral(`0.5000`);
        Position.expectAmountOfDAI(`0.00`);
      });

      it('with generating debt', () => {
        Form.amountInput().type('1.40981');
        Form.totalInput().should('have.value', '424.3528');
        Form.currentPurchasingPowerIs('424.35');
        Form.estimatedPurchasingPowerIs('0.00');
        Form.currentBalanceIs('0.00');
        Form.estimatedBalanceIs('1.4098');
        Form.currentDaiBalanceIs('301.00');
        Form.estimatedDaiBalanceIs('-123.35');
        Form.currentPriceIs('301.00');
        Form.currentLiquidationPrice('-');
        Form.estimatedLiquidationPrice('131.24');
        Form.acceptedRiskCompliance();
        Form.placeOrder();

        Position.expectAmountOfCollateral(`1.4098`);
        Position.expectAmountOfDAI(`-123.35`);
      });

      it('without generating debt and having WETH deposited', () => {
        Position.enableCollateral('deposit');
        Position.depositCollateral(5);

        Form.selectOrderType('sell');

        Form.amountInput().type('1');
        Form.totalInput().should('have.value', '280.0000');
        Form.currentDaiBalanceIs('301.00');
        Form.estimatedDaiBalanceIs('581.00');
        Form.currentLiquidationPrice('-');
        Form.currentPriceIs('280.0000');
        Form.placeOrder();

        Position.expectAmountOfCollateral(`4.00`);
        Position.expectAmountOfDAI(`581.00`);

        Form.selectOrderType('buy');

        Form.amountInput().type('1');
        Form.totalInput().should('have.value', '301.0000');
        Form.currentPurchasingPowerIs('1,312.54');
        Form.estimatedPurchasingPowerIs('1,011.54');
        Form.currentBalanceIs('4.0000');
        Form.estimatedBalanceIs('5.0000');
        Form.currentDaiBalanceIs('581.00');
        Form.estimatedDaiBalanceIs('0.00');
        Form.currentLiquidationPrice('-');
        Form.acceptedRiskCompliance();
        Form.placeOrder();

        Position.expectAmountOfCollateral(`4.00`);
        Position.expectAmountOfDAI(`280.00`);
      });
    });

    context('buying collateral using WETH', () => {
      beforeEach(() => {
        Modal.open(Position.new('WETH'));
        Account.setupProxy();
        Account.setAllowance();
        Modal.hasActiveTab('Deposit');
        Account.deposit(5);

        Modal.hasActiveTab('Buy');
        Modal.close();
        Form.selectOrderType('buy');
      });

      it('should buy more WETH and generate debt', () => {
        Form.amountInput().type('2');
        Form.totalInput().should('have.value', '602.0000');
        Form.currentPurchasingPowerIs('616.79');
        Form.estimatedPurchasingPowerIs('14.79');
        Form.currentBalanceIs('5.00');
        Form.estimatedBalanceIs('7.00');
        Form.currentDaiBalanceIs('0.00');
        Form.estimatedDaiBalanceIs('-602.00');
        Form.currentPriceIs('301.00');
        Form.currentLiquidationPrice('-');
        Form.estimatedLiquidationPrice('129');
        Form.acceptedRiskCompliance();
        Form.placeOrder();

        Position.expectAmountOfCollateral(`6.9999`);
        Position.expectAmountOfDAI(`-602.00`);
      });

      it('should buy more WETH, generate debt and withdraw some WETH', () => {
        Form.amountInput().type('2');
        Form.totalInput().should('have.value', '602.0000');
        Form.currentPurchasingPowerIs('616.79');
        Form.estimatedPurchasingPowerIs('14.79');
        Form.currentBalanceIs('5.00');
        Form.estimatedBalanceIs('7.00');
        Form.currentDaiBalanceIs('0.00');
        Form.estimatedDaiBalanceIs('-602.00');
        Form.currentPriceIs('301.00');
        Form.currentLiquidationPrice('-');
        Form.estimatedLiquidationPrice('129');
        Form.acceptedRiskCompliance();
        Form.placeOrder();

        Position.expectAmountOfCollateral(`6.9999`);
        Position.expectAmountOfDAI(`-602.00`);

        Position.withdrawCollateral(0.11999);
        Position.expectAmountOfCollateral(`6.8800`);
      });
    });

    context('selling collateral', () => {
      beforeEach(() => {
        Modal.open(Position.new('WETH'));
        Account.setupProxy();
        Account.setAllowance();
        Modal.hasActiveTab('Deposit');
        Account.deposit(3);

        Modal.hasActiveTab('Buy');
        Modal.close();

        Form.selectOrderType('sell');
      });

      it('full amount without generated debt', () => {
        Form.amountInput().type('3');
        Form.totalInput().should('have.value', '830.0000');
        Form.currentBalanceIs('3.00');
        Form.estimatedBalanceIs('0.00');
        Form.currentDaiBalanceIs('0.00');
        Form.estimatedDaiBalanceIs('830.00');
        Form.currentPriceIs('276.6666');
        Form.currentLiquidationPrice('-');
        Form.placeOrder();

        Position.expectAmountOfCollateral('0.00');
        Position.expectAmountOfDAI('830.00');
        Position.expectLiquidationPrice('-');
      });

      it('partial amount without generated debt', () => {
        Form.amountInput().type('2');
        Form.totalInput().should('have.value', '555.0000');
        Form.currentBalanceIs('3.00');
        Form.estimatedBalanceIs('1.00');
        Form.currentDaiBalanceIs('0.00');
        Form.estimatedDaiBalanceIs('555.00');
        Form.currentPriceIs('277.5000');
        Form.currentLiquidationPrice('-');
        Form.placeOrder();

        Position.expectAmountOfCollateral('1.00');
        Position.expectAmountOfDAI('555.00');
        Position.expectLiquidationPrice('-');
      });

      it('after generating debt', () => {
        Form.selectOrderType('buy');
        Form.amountInput().type('0.6');
        Form.totalInput().should('have.value', '180.6000');
        Form.currentBalanceIs('3.00');
        Form.estimatedBalanceIs('3.60');
        Form.currentDaiBalanceIs('0.00');
        Form.estimatedDaiBalanceIs('-180.60');
        Form.currentPriceIs('301');
        Form.currentLiquidationPrice('-');
        Form.estimatedLiquidationPrice('75.25');
        Form.acceptedRiskCompliance();
        Form.placeOrder();

        Position.expectAmountOfCollateral('3.5999');
        Position.expectAmountOfDAI('-180.60');
        // IN DAI - will change when default value is USD
        // Position.expectLiquidationPrice('77.8534');

        Form.selectOrderType('sell');
        Form.amountInput().type('3.5999');
        Form.totalInput().should('have.value', '979.9750');
        Form.currentBalanceIs('3.5999');
        Form.estimatedBalanceIs('0.00');
        Form.currentDaiBalanceIs('-180.60');
        Form.estimatedDaiBalanceIs('799.37');
        Form.currentPriceIs('272.2228');
        Form.currentLiquidationPrice('75.25');
        Form.estimatedLiquidationPrice('-');
        Form.placeOrder();

        Position.expectAmountOfCollateral('0.00');
        Position.expectAmountOfDAI('799.37');
        // IN DAI - will change when default value is USD
        Position.expectLiquidationPrice('-');
      });
    });
  });
});
