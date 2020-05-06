/*
 * Copyright (C) 2020 Maker Ecosystem Growth Holdings, INC.
 */

import { tid, timeout } from '../utils';

export class TradeSettings {
  public static button = () => cy.get(tid('trade-settings'), timeout(3000));

  public static back = () => cy.get(tid('back')).click();

  public static slippageLimit = (value: string) => {
    cy.get(tid('slippage-limit'), timeout(2000)).as('slippageLimit');
    cy.get('@slippageLimit').clear();
    cy.get('@slippageLimit').should('be.empty');
    cy.get('@slippageLimit').type(value);
  };
}
