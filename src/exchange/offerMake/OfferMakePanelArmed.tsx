import * as React from 'react';
import { Observable } from 'rxjs';
import { theAppContext } from '../../AppContext';
import { OfferMakePanel } from './OfferMakePanel';

const { useContext, useEffect, useState } = React;

function useObservable<O>(o$: Observable<O>): O|undefined {
  const [value, setValue] = useState<O|undefined>(undefined);

  useEffect(() => {
    const subscription = o$.subscribe((v: O) => {
      setValue(v);
    });
    return () => subscription.unsubscribe();
  },        []);

  return value;
}

export function OfferMakePanelArmed() {
  const { offerMakeLoadable$ } = useContext(theAppContext);
  const loadableState = useObservable(offerMakeLoadable$);

  if (!loadableState) {
    return <>...</>;

  }
  return (<OfferMakePanel {...loadableState}/>);
}
