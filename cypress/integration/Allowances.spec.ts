/*
 * Copyright (C) 2020 Maker Ecosystem Growth Holdings, INC.
 */

import { Allowance, ALLOWANCE_STATE } from '../pages/Allowance';
import { Tab } from '../pages/Tab';
import { WalletConnection } from '../pages/WalletConnection';
import { cypressVisitWithWeb3 } from '../utils';

describe('Setting allowances', () => {
  beforeEach(() => {
    cypressVisitWithWeb3();
    WalletConnection.connect();
    Tab.balances();
  });

  it('should enable allowance on a given token', () => {
    const allowance = Allowance.of('ZRX');
    allowance.shouldBe(ALLOWANCE_STATE.DISABLED);
    allowance.enable();
    allowance.shouldBe(ALLOWANCE_STATE.ENABLED);
  });

  it('should disable allowance on a given token', () => {
    const allowance = Allowance.of('WETH');

    allowance.shouldBe(ALLOWANCE_STATE.ENABLED);
    allowance.disable();
    allowance.shouldBe(ALLOWANCE_STATE.DISABLED);
  });
});
