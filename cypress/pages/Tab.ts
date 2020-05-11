/*
 * Copyright (C) 2020 Maker Ecosystem Growth Holdings, INC.
 */

import { tid } from '../utils/index';

const defaultTimeout = { timeout: 10000 };

export class Tab {
  public static market = () => {
    cy.get(tid('Market'), { ...defaultTimeout }).click();
  };

  public static balances = () => {
    cy.get(tid('Balances'), { ...defaultTimeout }).click();
  };

  public static instant = () => {
    cy.get(tid('Instant'), { ...defaultTimeout }).click();
  };

  public static multiply = () => {
    cy.get(tid('Multiply'), { ...defaultTimeout }).click();
  };
}
