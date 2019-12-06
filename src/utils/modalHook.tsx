import { ReactNode } from 'react';
import * as React from 'react';
import * as ReactDOM from 'react-dom';
const { useContext, useState } = React;

export type Modal = (props: { close: () => void }) => JSX.Element;
export type ModalOpener = (modal: Modal) => void;

const ModalContext = React.createContext<ModalOpener>(() => {
  console.warn('ModalContext not setup properly ');
});

export function SetupModal(props: { children?: ReactNode }) {

  const [theModal, setModal] = useState<Modal>();

  const close = () => { setModal(undefined); };

  return (
    <>
      <ModalContext.Provider value={setModal}>
        {props.children}
      </ModalContext.Provider>
      {theModal && ReactDOM.createPortal(theModal({ close }), document.body)}
    </>
  );
}

function useModal(): ModalOpener {
  return useContext(ModalContext);
}

useModal();
