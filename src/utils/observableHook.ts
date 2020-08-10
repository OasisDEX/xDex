import { useLayoutEffect, useState } from 'react';
import { Observable } from 'rxjs';

export function useObservable<O>(o$: Observable<O>): O | undefined {
  const [value, setValue] = useState<O | undefined>(undefined);

  useLayoutEffect(() => {
    const subscription = o$.subscribe((v: O) => {
      setValue(v);
    });
    return () => subscription.unsubscribe();
  }, []);

  return value;
}
