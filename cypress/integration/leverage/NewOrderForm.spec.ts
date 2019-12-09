import { Account } from '../../pages/leverage/Account';
import { Form } from '../../pages/leverage/Form';
import { Tab } from '../../pages/Tab';
import { WalletConnection } from '../../pages/WalletConnection';
import { cypressVisitWithWeb3, cypressVisitWithoutProvider } from '../../utils';

describe('Leverage form', () => {
  context('without provider', () => {
    beforeEach(() => {
      cypressVisitWithoutProvider();
      Tab.leverage();
    })
  
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
    it.skip('should be or not be able to switch to sell order form', () => {

    })

    // TODO: Waiting for Kuba to verify the expected behavior. This is a placeholder.
    it.skip('should be or not be able to check form settings ( slippage )', () => {})
  })


    // TODO: Skip for now because of misimplementation. Account should be taken from user
    // The behavior of those tests should be line the ones in missing provider.
  context.skip('without wallet connected', () => {
    beforeEach(() => {
      cypressVisitWithWeb3();
      Tab.leverage();
    })
  
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

    it('should be or not be able to switch to sell order form', () => {

    })

    it('should be or not be able to check form settings ( slippage )', () => {})
  })

  context('with connected wallet, no proxy', () => {
    beforeEach(() => {
      cypressVisitWithWeb3();
      Tab.leverage();

      WalletConnection.connect();
      WalletConnection.isConnected();
    })

    it('should ask the user to deploy proxy', () => {
      Form.shouldAskUserToDeployProxy();
    })
  })

  context('with connected wallet, proxy deployed', () => {
    beforeEach(() => {
      cypressVisitWithWeb3();
      Tab.leverage();

      WalletConnection.connect();
      WalletConnection.isConnected();
      
      Account.setupProxy();
      Account.shouldHaveProxyCreated();
    });
  
    it('should display purchasing power', () => {
      Form.currentPurchasingPowerIs('0.00');
    });
  
    it('should display collateral balance in margin account',  () => {
      Form.currentBalanceIs('0.00');
    });
  
    it('should display dai balance in margin account',  () => {
      Form.currentDaiBalanceIs('0.00');
    });
  
    it('should display price',  () => {
      Form.currentPriceIs('301.00');
    });
  })
});
