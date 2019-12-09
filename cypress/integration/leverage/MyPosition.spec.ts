import { Account } from '../../pages/leverage/Account';
import { Position } from '../../pages/leverage/Position';
import { Tab } from '../../pages/Tab';
import { WalletConnection } from '../../pages/WalletConnection';
import { cypressVisitWithWeb3 } from '../../utils';

const format = (number: number) => `${number}.0000`;


describe('My Position panel', () => {

  beforeEach(() => {
    cypressVisitWithWeb3();
    WalletConnection.connect();
    Tab.leverage();
  });

  context('without proxy and allowance set', () => {

    it('should create proxy', () => {
      Account.shouldNotHaveProxy();

      Account.setupProxy();

      Account.shouldHaveProxyCreated();
    });

    it('should should set proxy collateral allowance', () => {
      Account.shouldNotHaveProxy();
      Account.shouldNotHaveAllowance();

      Account.setCollateralAllowance();

      Account.shouldNotHaveProxy();
      Account.shouldHaveOTCAllowanceSet();
    });

    it('should set collateral allowance and show My Position panel', () => {
      Account.shouldNotHaveProxy();
      Account.shouldNotHaveAllowance();

      Account.setupProxy();
      Account.shouldHaveProxyCreated();

      Account.setCollateralAllowance();

      Account.leveragePositionShouldBeDisplayed();
      Account.shouldHaveProxyCFAHidden();
      Account.shouldHaveAllowanceCFAHidden();
    });
  });

  context('with proxy and allowance', () => {

    beforeEach(() => {
      Account.setupProxy();
      Account.shouldHaveProxyCreated();
      Account.setCollateralAllowance();
      Account.leveragePositionShouldBeDisplayed();
    });

    it('should deposit collateral', () => {
      const amount = 2;
      Position.depositCollateral(amount);
      Position.expectAmountOfCollateral(format(amount));
    });

    it('should deposit DAI', () => {
      const amount = 100;

      Position.enableDAI('deposit');
      Position.depositDAI(amount);
      Position.expectAmountOfDAI(format(amount));
    });

    it('should withdraw all collateral', () => {
      const amount = 1;
      Position.depositCollateral(amount);
      Position.expectAmountOfCollateral(format(amount));

      Position.withdrawCollateral(amount);

      Position.expectAmountOfCollateral(format(0));
    });

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
      Position.expectEquity('0');

      Position.depositCollateral(5);

      Position.expectEquity('874.9999');
    });
  });
});
