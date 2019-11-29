import { tid } from '../../utils';

export class Form {
  public static currentPurchasingPowerIs = (value: string | RegExp) =>
    cy.get(tid('purchasing-power')).contains(value);

  public static estimatedPurchasingPowerIs = (value: string | RegExp) =>
    cy.get(tid('estimated-purchasing-power')).contains(value);
}
