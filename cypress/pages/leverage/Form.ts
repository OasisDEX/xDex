import { tid } from '../../utils';

const orderForm = (property: string) => cy.get(tid('order-form', tid(property)));
const settings  = (property?: string) =>
  !property
  ? cy.get(tid('settings')).click()
  : cy.get(tid(property));

export class Form {
  public static selectOrderType = (type: 'buy' | 'sell') =>
    cy.get(tid(`new-${type}-order`)).click()

  public static slippageLimitIs = (value: string | RegExp) =>
    orderForm('slippage-limit').contains(value)

  public static expectTotalInputError = (msg: string)  =>
    orderForm('total-error').contains(msg)

  public static expectAmountInputError = (msg: string) =>
    orderForm('amount-error').contains(msg)

  public static currentPurchasingPowerIs = (value: string | RegExp) =>
    orderForm('purchasing-power').contains(value)

  public static currentBalanceIs = (value: string | RegExp) =>
    orderForm('col-balance').contains(value)

  public static currentDaiBalanceIs = (value: string | RegExp) =>
    orderForm('dai-balance').contains(value)

  public static currentPriceIs = (value: string | RegExp) =>
    orderForm('price').contains(value)

  public static estimatedPurchasingPowerIs = (value: string | RegExp) =>
    orderForm('estimated-purchasing-power').contains(value)

  public static leverageIs = (value: string | RegExp) =>
    orderForm('leverage').contains(value)

  public static interestRateIs = (value: string | RegExp) =>
    orderForm('interest-rate').contains(value)

  public static amountInput = () =>
    orderForm('amount-input')

  public static totalInput = () =>
    orderForm('total-input')

  public static placeOrderBtn = () =>
    orderForm('place-order')

  public static changeSlippageLimitTo = (value: number) => {
    settings();
    settings('slippage-limit-input').type(`{selectall}${value}`);
    settings('done').click();
  }

  public static shouldAskUserToConnect = () =>
    orderForm('locked-form').contains(/Connect to view .../)

  public static shouldAskUserToDeployProxy = () =>
    orderForm('locked-form').contains(/Deploy your Proxy.../)
}
