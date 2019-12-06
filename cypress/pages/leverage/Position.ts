import { cypressVisitWithWeb3, tid } from '../../utils';
import { Tab } from '../Tab';

export class Position {
  public static shouldHaveProxyCreated = () => {
    cy.get(tid('create-proxy', tid('step-completed'))).should('exist');
  }

  // CFA - call for action
  public static shouldHaveProxyCFAHidden = () => {
    cy.get(tid('create-proxy')).should('not.be.visible');
  }

  // CFA - call for action
  public static shouldHaveProxyAllowanceCFAHidden = () => {
    cy.get(tid('set-allowance')).should('not.be.visible');
  }

  public static shouldHaveNotCollateralAllowance = () => {
    cy.get(tid('set-allowance', tid('step-completed'))).should('not.exist');
  }

  public static setAllowance = () => {
    cy.get(tid('set-allowance', tid('cfa-btn'))).click();
    // TODO: this should be removed. It's a hacky way to get to My Position panel due to bug
    cypressVisitWithWeb3('', false);
    Tab.leverage();
  }

  public static shouldBeVisible = () => {
    cy.get(tid('my-position')).should('be.visible');
  }
}
