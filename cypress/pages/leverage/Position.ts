import { tid } from '../../utils';

type Operation = 'withdraw' | 'deposit';
type Token = 'dai' | 'collateral';

const toggleDropdown = (operation : Operation) => {
  cy.get(tid(`${operation}-actions-dropdown`)).trigger('mouseover');
}

const execute = (operation: Operation, amount: number, token: Token) => {
  cy.get(tid(`${operation}-actions-dropdown`)).trigger('mouseover');
  cy.get(tid(`${operation}-${token}`)).click();
  cy.get(tid(`${operation}-form`)).should('be.visible').as('form');
  cy.get('@form').find(tid('amount-input')).type(`${amount}`);
  cy.get('@form').find(tid(`${operation}-btn`)).click();
  cy.get('@form').find(tid('tx-status')).contains('Confirmed');
  cy.get('@form').find(tid('close-btn')).click();
}
 
const summary = (property: string) =>
  cy.get(tid('my-position', tid('summary', tid(property))));


export class Position {
  static withdrawCollateral = (amount: number) => 
    execute('withdraw', amount, 'collateral');
  
  public static depositCollateral = (amount: number) => 
    execute('deposit', amount, 'collateral');
  
  public static depositDAI = (amount: number) => {
    const operation = 'deposit';
    execute(operation, amount, 'dai');
  }

  public static withdrawDAI = (amount: number) => {
    const operation = 'withdraw';
    execute(operation, amount, 'dai');
  }

  public static enableDAI = (operation: Operation) => {
    cy.get(tid(`${operation}-actions-dropdown`))
      .trigger('mouseover')
      .find(tid('set-allowance'))
      .click();
    cy.get(tid(`${operation}-dai`))
    .should('be.visible')
    .trigger('mouseleave');
  }

  public static expectAmountOfCollateral = (amount: string | RegExp) => 
    summary('collateral-balance').contains(amount);
  
  public static expectAmountOfDAI = (amount: string | RegExp) => 
    summary('dai-balance').contains(amount);
  
  public static expectPrice = (price: string | RegExp) => 
    summary('price').contains(price);   

  public static expectEquity = (amount: string | RegExp) => 
    summary('equity').contains(amount);   
}


