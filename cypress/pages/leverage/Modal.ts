import { tid } from '../../utils';

type TabName = 'Deposit' | 'Buy' | 'Deploy Proxy';

export class Modal {
  public static close = () => {
    cy.get(tid('close-modal')).click({ force: true });
  }

  public static hasActiveTab = (tabName: TabName) => {
    cy.get(tid('active-tab')).should('have.text', tabName);
  }

  public static open = (button: any) => {
    button.click();
  }
}
