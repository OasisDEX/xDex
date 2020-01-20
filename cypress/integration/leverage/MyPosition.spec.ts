import { Account } from '../../pages/leverage/Account';
import { Position } from '../../pages/leverage/Position';
import { Tab } from '../../pages/Tab';
import { WalletConnection } from '../../pages/WalletConnection';
import { cypressVisitWithWeb3, tid } from '../../utils';
import { Modal } from '../../pages/leverage/Modal';

const format = (number: number) => `${number}.0000`;

describe('My Position panel', () => {

  beforeEach(() => {
    cypressVisitWithWeb3();
    WalletConnection.connect();
    Tab.leverage();
  });

  ['WETH', 'DAI'].forEach( asset => {
    context(`without proxy and allowance set for ${asset}`, () => {    
      beforeEach(() => {
        Modal.open(Position.new(asset as 'DAI' | 'WETH'));
      })
  
      it('should create proxy', () => {
        Account.shouldNotHaveProxy();
  
        Account.setupProxy();
  
        Account.shouldHaveProxyCreated();
      });
  
      it('should set proxy collateral allowance', () => {
        Account.shouldNotHaveProxy();
        Account.shouldNotHaveAllowance();
  
        Account.setupProxy();
        Account.shouldHaveProxyCreated();
  
        Account.setAllowance();
        Account.shouldSeeDepositForm();
      });
  
      it('should see My Position Panel', () => {
        Account.setupProxy();
        Account.setAllowance();
  
        Account.shouldSeeDepositForm();
        Account.deposit(10);
  
        Account.leveragePositionShouldBeDisplayed();
      });
  
      it('should close the modal window', () => {
       Modal.close();
      })
    }); 
  })

  context.only('with proxy and allowance', () => {

    beforeEach(() => {
      Modal.open(Position.new('WETH'))
      Account.setupProxy();
      Account.shouldHaveProxyCreated();
      Account.setAllowance();
      Account.shouldSeeDepositForm();
      Account.deposit(10); 
      Account.depositedAmount(/10.../);
      Modal.close();
      Account.leveragePositionShouldBeDisplayed();     
    });

    it('should deposit collateral', () => {
      const amount = 2;
      const balance = amount + 10;
      Position.depositCollateral(amount);
      Position.expectAmountOfCollateral(format(balance));
    });

    it('should deposit DAI', () => {
      const amount = 100;

      Position.enableDAI('deposit');
      Position.depositDAI(amount);
      Position.expectAmountOfDAI(format(amount));
    });

    it('should withdraw collateral', () => {
      const amount = 1;
      const balance = 10
      Position.depositCollateral(amount);
      Position.expectAmountOfCollateral(format(amount));

      Position.withdrawCollateral(amount);

      Position.expectAmountOfCollateral(format(balance));
    });

    // Placeholder withdraw all collateral - should display buttons to deposit

    it('should withdraw all DAI', () => {
      const amount = 100;

      Position.enableDAI('deposit');
      Position.depositDAI(amount);
      Position.expectAmountOfDAI(format(amount));

      Position.withdrawDAI(amount);

      Position.expectAmountOfDAI(format(0));
    });

    it('should display current price', () => {
      Position.expectPrice('174.99');
    });

    it('should display after deposit', () => {
      Position.expectEquity(/2\,905.../);

      Position.depositCollateral(5);

      Position.expectEquity(/4\,357.5000/);
    });
  });
});
