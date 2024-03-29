/*
 * Copyright (C) 2020 Maker Ecosystem Growth Holdings, INC.
 */

import * as React from 'react';
import { ProgressStage } from '../form';
import { Timer } from '../Timer';

export const TransactionStateDescription = ({ progress }: { progress: ProgressStage } | any) => {
  return (
    <span>
      {progress === ProgressStage.waitingForApproval && 'Sign on Client'}
      {progress === ProgressStage.waitingForConfirmation && (
        <span>
          Unconfirmed <Timer start={new Date()} />
        </span>
      )}
      {progress === ProgressStage.done && 'Confirmed'}
      {progress === ProgressStage.canceled && 'Cancelled'}
      {progress === ProgressStage.fiasco && 'Failure'}
    </span>
  );
};
