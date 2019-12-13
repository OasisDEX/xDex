import { FunctionComponent, ReactNode } from 'react';
import * as React from 'react';
import * as ReactDOM from 'react-dom';
const { useContext, useState } = React;

export interface ModalProps { close: () => void; }
export type Modal = FunctionComponent<ModalProps>;
export type ModalOpener = (modal: Modal) => void;

const ModalContext = React.createContext<ModalOpener>(() => {
  console.warn('ModalContext not setup properly ');
});

export function SetupModal(props: { children?: ReactNode }) {

  const [TheModal, setModal] = useState<Modal>();

  function close() { setModal(undefined); }

  return (
    <ModalContext.Provider value={(modal: Modal) => setModal(() => modal)}>
      {props.children}
      {TheModal && ReactDOM.createPortal(<TheModal {...{  close }}/>, document.body)}
    </ModalContext.Provider>
  );
}

export function useModal(): ModalOpener {
  return useContext(ModalContext);
}
