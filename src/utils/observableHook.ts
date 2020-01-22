import * as React from 'react';
import { Observable } from 'rxjs';
import { useLayoutEffect } from 'react';

const { useEffect, useState } = React;

export function useObservable<O>(o$: Observable<O>): O|undefined {
  const [value, setValue] = useState<O|undefined>(undefined);

  useLayoutEffect(
    () => {
      const subscription = o$.subscribe((v: O) => {
        setValue(v);
      });
      return () => subscription.unsubscribe();
    },
    []
  );

  return value;
}
