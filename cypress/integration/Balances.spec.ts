import { Balance } from '../pages/Balance'
import { Tab } from '../pages/Tab'
import { WalletConnection } from '../pages/WalletConnection'
import { cypressVisitWithWeb3 } from '../utils/index'
import { makeScreenshots } from '../utils/makeScreenshots'

describe('Balances', () => {
  beforeEach(() => {
    cypressVisitWithWeb3()
    WalletConnection.connect()
  })

  it('should display all token balances', () => {
    Tab.balances()

    Balance.of('ETH').shouldBe(/8999\.96.../)
    Balance.of('WETH').shouldBe(/1001\.00.../)
    Balance.of('DAI').shouldBe(/9170\.00.../)

    makeScreenshots('balances')
  })
})
