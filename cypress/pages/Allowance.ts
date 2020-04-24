import { tid } from '../utils/index';

export enum ALLOWANCE_STATE {
  ENABLED = 'enabled',
  DISABLED = 'disabled',
}

export const checkProxyAllowances = () => {
  cy.get(tid('set-allowances')).click();
};

export const setAllowanceOf = (token: string) => {
  cy.get(tid(token)).click();
};

export const expectAllowanceStatusFor = (token: string, hasAllowance: 'true' | 'false') => {
  cy.get(tid(token, tid('status'))).should('have.attr', 'data-test-isallowed', hasAllowance);
};

export const expectAllowedTokensCount = (count: number) => {
  cy.get(tid('active-allowances')).contains(`${count} ${count === 1 ? 'Token' : 'Tokens'} enabled for Trading`);
};

export class Allowance {
  public static of = (tokenSymbol: string) => {
    const symbol = tokenSymbol.toUpperCase();
    cy.get(tid(`${symbol}-overview`), { timeout: 10000 }).as(`${symbol}`);

    return {
      enable: () => {
        cy.get(`@${symbol}`)
          .find(tid('toggle-allowance'))
          .click();
      },

      disable: () => {
        cy.get(`@${symbol}`)
          .find(tid('toggle-allowance'))
          .click();
      },

      shouldBe: (state: ALLOWANCE_STATE) => {
        switch (state) {
          case ALLOWANCE_STATE.DISABLED:
            cy.get(`@${symbol}`)
              .find(tid('toggle-button-state'))
              .should('have.attr', 'data-toggle-state', ALLOWANCE_STATE.DISABLED);
            break;
          case ALLOWANCE_STATE.ENABLED:
            cy.get(`@${symbol}`)
              .find(tid('toggle-button-state'))
              .should('have.attr', 'data-toggle-state', ALLOWANCE_STATE.ENABLED);
            break;
        }
      },
    };
  };
}
