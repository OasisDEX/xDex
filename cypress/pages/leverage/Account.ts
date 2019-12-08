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

  public static setOTCAllowance = () => {
    cy.get(tid('set-allowance', tid('cfa-btn'))).click();
  }

  public static leveragePositionShouldBeDisplayed = () => {
    cy.get(tid('my-position')).should('be.visible');
  }
}
