import * as React from 'react';
import * as ReactModal from 'react-modal';
import { Observable } from 'rxjs';
import { theAppContext } from '../../AppContext';
import * as styles from '../../marginTrading/setup/mtSetupFormView.scss';
import {Button} from '../../utils/forms/Buttons';
import {Modal, useModal} from '../../utils/modalHook';
import { useObservable } from '../../utils/observableHook';
import { OfferMakePanel } from './OfferMakePanel';

const { useContext } = React;

export function OfferMakePanelHooked() {

  const { offerMakeLoadable$ } = useContext(theAppContext);
  const loadableState = useObservable(offerMakeLoadable$);
  // const openModal = useModal();

  if (!loadableState) {
    return <>...</>;
  }

  // const modal: Modal = ({ close }) => {
  //   return (
  //     <ReactModal
  //       ariaHideApp={false}
  //       isOpen={true}
  //       className={styles.modal}
  //       overlayClassName={styles.modalOverlay}
  //       closeTimeoutMS={250}
  //     >
  //       Kuku!
  //       <Button onClick={() => close()}>Close</Button>
  //     </ReactModal>
  //   );
  // };
  //
  // console.log('Rendered!');

  return (<>
    <OfferMakePanel {...loadableState}/>
    {/*<Button onClick={() => openModal(modal)}>*/}
    {/*  Open modal!*/}
    {/*</Button>*/}
  </>);
}
