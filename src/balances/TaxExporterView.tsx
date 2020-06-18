/*
 * Copyright (C) 2020 Maker Ecosystem Growth Holdings, INC.
 */

import React, { useContext, useState } from 'react';
import { take } from 'rxjs/internal/operators';
import { theAppContext } from 'src/AppContext';
import { trackingEvents } from '../analytics/analytics';
import { Button } from '../utils/forms/Buttons';
import { ProgressIcon } from '../utils/icons/Icons';
import { Panel, PanelBody, PanelHeader } from '../utils/panel/Panel';
import { Muted } from '../utils/text/Text';
import { TradeExport } from './taxExporter';
import * as styles from './TaxExporter.scss';

export const TaxExporterHooked = () => {
  const { exportTax$ } = useContext(theAppContext);
  const [state, updateState] = useState({ inProgress: false });

  const exportTrades = () => {
    if (!state.inProgress) {
      updateState({ ...state, inProgress: true });
      exportTax$.pipe(take(1)).subscribe({
        next: (trades: TradeExport[]) => {
          trades = trades.filter((trade) => trade.exchange !== '');
          const url = 'data:text/csv;charset=utf-8,' + encodeURIComponent(toCSV(trades));
          downloadCSV(url);
        },
        complete: () => updateState({ ...state, inProgress: false }),
      });
    }
  };

  return (
    <Panel footerBordered={true} style={{ width: '100%' }}>
      <PanelHeader>History export</PanelHeader>
      <PanelBody paddingVertical={true} className={styles.taxExporterPanelBody}>
        <Muted className={styles.taxExporterDescription}>
          <span>Export your trades from Oasis Contracts (2018-2019)</span>
          From oasis.app/trade, oasis.direct, oasisdex.com and cdp.makerdao.com
        </Muted>
        <Button
          size="sm"
          color="secondaryOutlined"
          onClick={() => {
            exportTrades();
            trackingEvents.taxExport();
          }}
          className={styles.taxExporterButton}
        >
          {state.inProgress ? <ProgressIcon className={styles.progressIcon} /> : 'Export'}
        </Button>
      </PanelBody>
    </Panel>
  );
};

function toCSVRow(trade: any): string {
  return `"${Object.keys(trade)
    .map((key) => trade[key])
    .join('";"')}"`;
}

function toCSV(trades: any[]) {
  const header = '"Buy amount";"Buy currency";"Sell amount";"Sell currency";"Date";"Address";"Tx";"Exchange"';
  return `${header}\r\n${trades.map((trade) => `${toCSVRow(trade)}\r\n`).join('')}`;
}

function downloadCSV(url: string) {
  const currentDate = new Date();
  const fileName = `trades-report-${currentDate.getFullYear()}-${
    currentDate.getMonth() + 1 <= 9 ? `0 ${currentDate.getMonth() + 1}` : currentDate.getMonth() + 1
  }-${currentDate.getDate()}`;

  const link = document.createElement('a');
  link.href = url;

  link.download = fileName + '.csv';

  // this part will append the anchor tag and remove it after automatic click
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
