/*
 * Copyright (C) 2020 Maker Ecosystem Growth Holdings, INC.
 */

import * as React from 'react';

import { Loadable } from '../../utils/loadable';
import { LoadingIndicator } from '../../utils/loadingIndicator/LoadingIndicator';
import { PanelHeader } from '../../utils/panel/Panel';
import { OfferFormState } from './offerMake';
import { OfferMakeForm } from './OfferMakeForm';
import * as styles from './OfferMakePanel.scss';

export const OfferMakePanel = ({ status, value }: Loadable<OfferFormState>) => {
  if (status === 'loaded') {
    const formState = value as OfferFormState;
    return <OfferMakeForm {...formState} />;
  }

  return (
    <>
      <PanelHeader bordered={true}>Create order</PanelHeader>
      <div className={styles.loaderWithFooterBordered}>
        <LoadingIndicator size="lg" />
      </div>
    </>
  );
};
