import * as React from 'react';
import { Observable } from 'rxjs';
import { theAppContext } from '../../AppContext';
import { useObservable } from '../../utils/observableHook';
import { OfferMakePanel } from './OfferMakePanel';

const { useContext } = React;

export function OfferMakePanelArmed() {

  const { offerMakeLoadable$ } = useContext(theAppContext);
  const loadableState = useObservable(offerMakeLoadable$);

  if (!loadableState) {
    return <>...</>;
  }
  return (<OfferMakePanel {...loadableState}/>);
}
