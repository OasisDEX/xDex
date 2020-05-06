/*
 * Copyright (C) 2020 Maker Ecosystem Growth Holdings, INC.
 */

export class UnreachableCaseError extends Error {
  constructor(val: never) {
    super(`Unreachable case: ${val}`);
  }
}
