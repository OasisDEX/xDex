/*
 * Copyright (C) 2020 Maker Ecosystem Growth Holdings, INC.
 */

import { Observable } from 'rxjs';

export function unpack<T>(o: Observable<T>): any {
  let r;

  o.subscribe(
    (v) => {
      r = v;
    },
    (e) => {
      console.log('error', e, typeof e);
      r = e;
    },
  );

  console.assert(r !== undefined);

  return r;
}
