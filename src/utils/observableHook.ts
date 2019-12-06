import * as React from 'react';
import { Observable } from 'rxjs';

const { useEffect, useState } = React;

export function useObservable<O>(o$: Observable<O>): O|undefined {
  const [value, setValue] = useState<O|undefined>(undefined);

  useEffect(
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
