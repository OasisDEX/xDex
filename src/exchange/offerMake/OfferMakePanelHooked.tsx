import React, { useContext } from 'react';
import { theAppContext } from '../../AppContext';
import { useObservable } from '../../utils/observableHook';
import { OfferMakePanel } from './OfferMakePanel';

export function OfferMakePanelHooked() {

  const { offerMakeLoadable$ } = useContext(theAppContext);
  const loadableState = useObservable(offerMakeLoadable$);

  if (!loadableState) {
    return <>...</>;
  }

  return (<>
    <OfferMakePanel {...loadableState}/>
  </>);
}
