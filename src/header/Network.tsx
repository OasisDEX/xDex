import React, { useContext } from 'react';
import { theAppContext } from 'src/AppContext';
import { useObservable } from 'src/utils/observableHook';
import { NetworkConfig } from '../blockchain/config';
import { Tooltip } from '../utils/tooltip/Tooltip';
import * as styles from './Header.scss';

const Networks = {
  kovan: 'Kovan',
  main: 'Main'
};

export const NetworkHooked = () => {
  const { context$ } = useContext(theAppContext);
  const state = useObservable(context$);

  if (!state) return null;
  const network = (state.name as 'kovan') || 'main';
  const id = 'status';
  return (
    <Tooltip id={id} text={`${Networks[network]} Network`}>
      <span
        data-tip={true}
        data-for={id}
        className={`${styles.networkIndicator} ${styles[network]}`}
      />
    </Tooltip>
  );
};
