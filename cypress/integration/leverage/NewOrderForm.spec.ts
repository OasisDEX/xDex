import { Account } from '../../pages/leverage/Account';
import { Form } from '../../pages/leverage/Form';
import { Tab } from '../../pages/Tab';
import { WalletConnection } from '../../pages/WalletConnection';
import { cypressVisitWithWeb3 } from '../../utils';

describe('Leverage form', () => {

  beforeEach(() => {
    cypressVisitWithWeb3();
    WalletConnection.connect();
    WalletConnection.isConnected();
    Tab.leverage();
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
});
