import { Account } from '../../pages/leverage/Account';
import { Position } from '../../pages/leverage/Position';
import { Tab } from '../../pages/Tab';
import { WalletConnection } from '../../pages/WalletConnection';
import { cypressVisitWithWeb3 } from '../../utils';

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

      Account.setOTCAllowance();

      Account.shouldNotHaveProxy();
      Account.shouldHaveOTCAllowanceSet();
    });

    it('should set collateral allowance and show My Position panel', () => {
      Account.shouldNotHaveProxy();
      Account.shouldNotHaveAllowance();

      Account.setupProxy();
      Account.shouldHaveProxyCreated();

      Account.setOTCAllowance();

      Account.leveragePositionShouldBeDisplayed();
      Account.shouldHaveProxyCFAHidden();
      Account.shouldHaveAllowanceCFAHidden();
    });
  });

  context.only('with proxy and allowance', () => {

    beforeEach(() => {
      Account.setupProxy();
      Account.shouldHaveProxyCreated();
      Account.setOTCAllowance();
      Account.leveragePositionShouldBeDisplayed();
    });

    it('should deposit collateral', () => {
      const amount = 2;
      Position.depositCollateral(amount);
      Position.expectAmountOfCollateral(`${amount}.0000`);
    });
  });
});
