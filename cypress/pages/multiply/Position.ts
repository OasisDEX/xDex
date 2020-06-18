/*
 * Copyright (C) 2020 Maker Ecosystem Growth Holdings, INC.
 */

import { tid } from '../../utils';
import { Modal } from './Modal';

type Operation = 'withdraw' | 'deposit';
type Token = 'dai' | 'col';

const execute = (operation: Operation, amount: number, token: Token) => {
  cy.get(tid(`${operation}-actions-dropdown`)).trigger('mouseover');
  cy.get(tid(`${operation}-${token}`)).click();
  cy.get(tid(`modal`)).find(tid('header')).contains(new RegExp(operation, 'i'));
  cy.get(tid(`modal`)).find(tid('amount-input')).type(`${amount}`);
  cy.get(tid(`modal`))
    .find(tid(`${operation}-btn`))
    .click();
  cy.get(tid(`modal`)).find(tid('tx-status')).contains('Confirmed');
  Modal.close();
};

const summary = (property: string) => cy.get(tid('my-position', tid('summary', tid(property))));

export class Position {
  public static new = (asset: 'DAI' | 'WETH') => cy.get(tid(`open-position-with-${asset}`));

  public static withdrawCollateral = (amount: number) => execute('withdraw', amount, 'col');

  public static depositCollateral = (amount: number) => execute('deposit', amount, 'col');

  public static depositDAI = (amount: number) => {
    const operation = 'deposit';
    execute(operation, amount, 'dai');
  };

  public static withdrawDAI = (amount: number) => {
    execute('withdraw', amount, 'dai');
  };

  public static enableDAI = (operation: Operation) => {
    cy.get(tid(`${operation}-actions-dropdown`))
      .trigger('mouseover')
      .find(tid('set-allowance'))
      .click();
    cy.get(tid(`${operation}-dai`))
      .should('be.visible')
      .trigger('mouseleave');
  };

  public static enableCollateral = (operation: Operation) => {
    cy.get(tid(`${operation}-actions-dropdown`))
      .trigger('mouseover')
      .find(tid('set-allowance'))
      .click();
    cy.get(tid(`${operation}-col`))
      .should('be.visible')
      .trigger('mouseleave');
  };

  public static expectAmountOfCollateral = (amount: string | RegExp) => summary('col-balance').contains(amount);

  public static expectAmountOfDAI = (amount: string | RegExp) => summary('dai-balance').contains(amount);

  public static expectPrice = (price: string | RegExp) => summary('price').contains(price);

  public static expectEquity = (amount: string | RegExp) => summary('equity').contains(amount);

  public static expectLiquidationPrice = (price: string | RegExp) => summary('liquidation-price').contains(price);

  public static widgetShouldBeVisisble = () => {
    cy.get(tid('my-position')).should('be.visible');
  };
}
