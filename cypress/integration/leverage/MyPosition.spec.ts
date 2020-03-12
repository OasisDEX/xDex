import { Account } from '../../pages/leverage/Account';
import { Position } from '../../pages/leverage/Position';
import { Tab } from '../../pages/Tab';
import { WalletConnection } from '../../pages/WalletConnection';
import { cypressVisitWithWeb3, tid } from '../../utils';
import { Modal } from '../../pages/leverage/Modal';
import { Form } from 'cypress/pages/leverage/Form';

describe('My Position panel', () => {

  beforeEach(() => {
    cypressVisitWithWeb3();
    WalletConnection.connect();
    WalletConnection.isConnected();
    Tab.leverage();
  });

  context('with proxy and DAI allowance', () => {

    beforeEach(() => {
      Modal.open(Position.new('DAI'));
      Account.setupProxy();
      Account.setAllowance();
      Modal.hasActiveTab('Deposit');  
      Account.deposit(100);
      Modal.close();
    });

    it('should deposit DAI', () => {
      const amount = 100;

      Position.depositDAI(amount);
      Position.expectAmountOfDAI(`200.00`);
    });

    it('should withdraw all DAI', () => {
      const amount = 100;

      Position.depositDAI(amount);
      Position.expectAmountOfDAI(`200.00`);

      Position.withdrawDAI(200);

      Position.expectAmountOfDAI(`0.00`);
    });

    it('should partially withdraw DAI', () => {
      const amount = 100;

      Position.depositDAI(amount);
      Position.expectAmountOfDAI(`200.00`);

      Position.withdrawDAI(25);

      Position.expectAmountOfDAI(`175.00`);
    });

    it('should deposit WETH', () => {
      Position.enableCollateral('deposit');

      const amount = 1.5;

      Position.depositCollateral(amount);
      Position.expectAmountOfCollateral(`1.5`);
    });
  });

  context('with proxy and WETH allowance', () => {
    beforeEach(() => {
      Modal.open(Position.new('WETH'));
      Account.setupProxy();
      Account.setAllowance();
      Modal.hasActiveTab('Deposit');  
      Account.deposit(5);
      Modal.close();
    });

    it('should deposit WETH', () => {
      const amount = 5;

      Position.depositCollateral(amount);
      Position.expectAmountOfCollateral(`10.00`);
    });

    it('should withdraw all WETH', () => {
      const amount = 5;

      Position.depositCollateral(amount);
      Position.expectAmountOfCollateral(`10.00`);

      Position.withdrawCollateral(10);
      Position.expectAmountOfCollateral(`0.00`);
    });

    it('should partially withdraw WETH', () => {
      const amount = 5;

      Position.depositCollateral(amount);
      Position.expectAmountOfCollateral(`10.00`);

      Position.withdrawCollateral(2.5);
      Position.expectAmountOfCollateral(`7.5`);
    });


    it('should deposit DAI', () => {
      const amount = 100;

      Position.enableDAI('deposit');

      Position.depositDAI(amount);
      Position.expectAmountOfDAI(`100.00`);
    });
  })
});
