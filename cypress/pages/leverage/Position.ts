import { tid } from '../../utils';

export class Position {
  public static depositCollateral = (amount: number) => {
    cy.get(tid('deposit-actions-dropdown')).trigger('mouseover');
    cy.get(tid('deposit-collateral')).click();
    cy.get(tid('deposit-form')).should('be.visible');
    cy.get(tid('deposit-form', tid('amount-input'))).type(`${amount}`);
    cy.get(tid('deposit-form', tid('deposit-btn'))).click();
    cy.get(tid('deposit-form', tid('tx-status'))).contains('Confirmed');
    cy.get(tid('deposit-form', tid('close-btn'))).click();
  }

  public static expectAmountOfCollateral = (amount: string | RegExp) => {
    cy.get(tid('my-position', tid('summary', tid('collateral-balance')))).contains(amount);
  }
}
