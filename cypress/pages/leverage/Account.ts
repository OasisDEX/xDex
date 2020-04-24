import { tid } from '../../utils';

export class Account {
  public static shouldNotHaveProxy = () => {
    cy.get(tid(`create-proxy`, tid('step-completed'))).should('not.exist');
  };

  public static shouldHaveProxyCreated = () => {
    cy.get(tid('create-proxy', tid('step-completed'))).should('exist');
  };

  public static shouldNotHaveAllowance = () => {
    cy.get(tid('set-allowance', tid('step-completed'))).should('not.exist');
  };

  public static setupProxy = () => {
    cy.get(tid('create-proxy')).click();
  };

  public static setAllowance = () => {
    cy.get(tid('set-allowance')).click();
  };

  public static deposit = (amount: number) => {
    cy.get(tid('transfer', tid('amount-input'))).type(amount.toString());
    cy.get(tid('deposit-btn')).click();
  };

  public static depositedAmount = (amount: string | RegExp) => {
    cy.get(tid('col-balance')).contains(amount);
  };
  /*  */
  public static depositedDaiAmount = (amount: string | RegExp) => {
    cy.get(tid('dai-balance')).contains(amount);
  };
  /* In order to use this method one should:
   * - create proxy
   * - set collateral allowance
   * so that the My Position form is visible
   * and from one of the dropdowns ( deposit / withdraw )
   * one can enable DAI allowance
   */
  public static setProxyDAIAllowance = () => {
    cy.get(tid('withdraw-actions-dropdown'))
      .trigger('mouseover')
      .find(tid('set-allowance'))
      .click();
    cy.get(tid('withdraw-dai')).should('be.visible');
  };
}
