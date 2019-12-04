import { tid } from '../../utils';

const orderForm = (property: string) => cy.get(tid('order-form', tid(property)));

export class Form {
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
}
