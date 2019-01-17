import { cypressVisitWithWeb3 } from '../utils/index';

import { Balance } from '../pages/Balance';
import { Tab } from '../pages/Tab';

describe('Balances', () => {

  beforeEach(() => cypressVisitWithWeb3());

  it('should display all token balances', () => {
    Tab.balances();

    Balance.of('ETH').shouldBe(/8,999.../);
    Balance.of('WETH').shouldBe(/1,001.../);
    Balance.of('DAI').shouldBe(/170.../);
  });
});
