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

  it('should display proxy and collateral allowance statuses', () => {
    Position.shouldHaveProxyCreated();
    Position.shouldHaveNotCollateralAllowance();
  });

  it.only('should set collateral allowance and show My Position panel', () => {
    Position.shouldHaveProxyCreated();
    Position.shouldHaveNotCollateralAllowance();

    Position.setAllowance();

    Position.shouldBeVisible();
    Position.shouldHaveProxyCFAHidden();
    Position.shouldHaveProxyAllowanceCFAHidden();
  });
});
