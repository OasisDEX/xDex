/*
 * Copyright (C) 2020 Maker Ecosystem Growth Holdings, INC.
 */

import { Account } from '../../pages/multiply/Account';
import { Modal } from '../../pages/multiply/Modal';
import { Position } from '../../pages/multiply/Position';
import { Tab } from '../../pages/Tab';
import { WalletConnection } from '../../pages/WalletConnection';
import { cypressVisitWithWeb3 } from '../../utils';

describe('My Position panel', () => {
  beforeEach(() => {
    cypressVisitWithWeb3();
    WalletConnection.connect();
    WalletConnection.isConnected();
    Tab.multiply();
  });

  context('with proxy and DAI allowance', () => {
    beforeEach(() => {
      Modal.open(Position.new('DAI'));
      Account.setupProxy();
      Account.setAllowance();
      Modal.hasActiveTab('Deposit');
      Account.deposit(100);
      Modal.hasActiveTab('Buy')
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
      Modal.hasActiveTab('Buy')
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
  });

  context('with proxy and DAI/WETH allowance', () => {
    beforeEach(() => {
      Modal.open(Position.new('WETH'));
      Account.setupProxy();
      Account.setAllowance();
      Modal.hasActiveTab('Deposit');
      Account.deposit(5);
      Modal.hasActiveTab('Buy');
      Modal.close();
      Position.enableDAI('deposit');
      Position.depositDAI(100);
    });

    it('should deposit more WETH', () => {
      Position.depositCollateral(10);

      Position.expectAmountOfCollateral(`15.00`);
    });

    it('should withdraw partially WETH', () => {
      Position.withdrawCollateral(0.5);

      Position.expectAmountOfCollateral(`4.50`);
      Position.expectAmountOfDAI(`100`);
    });

    it('should withdraw full WETH', () => {
      Position.withdrawCollateral(5);

      Position.expectAmountOfCollateral(`0.00`);
      Position.expectAmountOfDAI(`100`);
    });

    it('should withdraw partially DAI', () => {
      Position.withdrawDAI(45);

      Position.expectAmountOfCollateral(`5.00`);
      Position.expectAmountOfDAI(`55.00`);
    });

    it('should withdraw full DAI', () => {
      Position.withdrawDAI(100);

      Position.expectAmountOfCollateral(`5.00`);
      Position.expectAmountOfDAI(`0.00`);
    });
  });
});
