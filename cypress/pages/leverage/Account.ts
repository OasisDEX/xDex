import { cypressVisitWithWeb3, tid } from '../../utils';
import { Tab } from '../Tab';

export class Account {
  public static shouldNotHaveProxy = () => {
    cy.get(tid('create-proxy', tid('setup-proxy'))).should('be.enabled');
  }

  public static shouldHaveProxyCreated = () => {
    cy.get(tid('create-proxy', tid('step-completed'))).should('exist');
  }

  // CFA - call for action
  public static shouldHaveProxyCFAHidden = () => {
    cy.get(tid('create-proxy')).should('not.be.visible');
  }

  // CFA - call for action
  public static shouldHaveAllowanceCFAHidden = () => {
    cy.get(tid('set-allowance')).should('not.be.visible');
  }

  public static shouldNotHaveAllowance = () => {
    cy.get(tid('set-allowance', tid('cfa-btn'))).should('be.enabled');
  }

  public static shouldHaveOTCAllowanceSet = () => {
    cy.get(tid('set-allowance', tid('step-completed'))).should('exist');
  }

  public static setupProxy = () => {
    cy.get(tid('create-proxy', tid('setup-proxy'))).click();
  }

  // TODO: This to be changed if necessary once Kuba figures out which we are giving the allowance to
  public static setCollateralAllowance = () => {
    cy.get(tid('set-allowance', tid('cfa-btn'))).click();
  }

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
  }


  public static leveragePositionShouldBeDisplayed = () => {
    cy.get(tid('my-position')).should('be.visible');
  }
}
