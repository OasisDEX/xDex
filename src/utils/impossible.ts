/*
 * Copyright (C) 2020 Maker Ecosystem Growth Holdings, INC.
 */

export type Impossible = symbol;

export function impossible(message: string): Impossible {
  return Symbol.for(message);
}

export function description(x: Impossible): string {
  return Symbol.keyFor(x)!;
}

export function isImpossible<T>(x: T | Impossible): x is Impossible {
  return typeof x === 'symbol';
}
