import { storiesOf } from '@storybook/react';
import { BigNumber } from 'bignumber.js';
import * as React from 'react';

import { MTHistoryEvent, MTHistoryEventKind } from '../marginTrading/state/mtAccount';
import { calculateMarginable } from '../marginTrading/state/mtCalculate';
import { getMarginableCore } from '../marginTrading/state/mtTestUtils';
import { one, zero } from '../utils/zero';
import { CDPHistoryViewModal } from './CDPHistoryView';

const stories = storiesOf('Balances/CDP history view', module);

function createEvent(e: {
  token?: string,
  kind: MTHistoryEventKind,
  date?: string,
  gem?: BigNumber,
  dai?: BigNumber,
  id?: BigNumber,
}): MTHistoryEvent {
  const timestamp = e.date ? new Date(e.date).valueOf() / 1000 : 1545297643;
  const token = e.token ? e.token : 'DGX';
  const id = e.id ? e.id : new BigNumber(3);
  if (e.kind === MTHistoryEventKind.deal) {
    return {
      token,
      timestamp,
      id,
      kind: e.kind,
      dAmount: zero,
      dDAIAmount: zero
    };
  }
  return {
    token,
    timestamp,
    id,
    kind: e.kind,
    gem: e.gem,
    dai: e.dai,
  } as MTHistoryEvent;
}

function getParams(rawHistory: MTHistoryEvent[]) {
  return {
    ...calculateMarginable(
      getMarginableCore({
        rawHistory,
        name: 'DGX',
      }),
    ),
    close: () => null,
  };
}

stories.add('Sample', () => {
  const history = [
    createEvent({
      kind: MTHistoryEventKind.bite,
      gem: new BigNumber(40),
      dai: new BigNumber(2000),
      date: '2018-12-12 07:32:54',
    }),
    createEvent({
      kind: MTHistoryEventKind.kick,
      gem: new BigNumber(40),
      dai: new BigNumber(2300),
      date: '2018-12-12 07:32:54',
    }),
    createEvent({
      kind: MTHistoryEventKind.tend,
      gem: new BigNumber(40),
      dai: new BigNumber(2300),
      date: '2018-12-12 07:32:54',
    }),
    createEvent({
      kind: MTHistoryEventKind.dent,
      gem: new BigNumber(36),
      dai: new BigNumber(2300),
      date: '2018-12-12 07:32:54',
    }),
    createEvent({
      kind: MTHistoryEventKind.deal,
      date: '2018-12-15 09:54',
    }),
  ];
  return (
    <CDPHistoryViewModal {...getParams(history)} />
  );
});

stories.add('Long history', () => {
  const history = [

    createEvent({
      kind: MTHistoryEventKind.bite,
      gem: new BigNumber(3),
      dai: new BigNumber(12),
      date: '2018-11-24 11:54:16',
      id: zero,
    }),
    createEvent({
      kind: MTHistoryEventKind.kick,
      gem: new BigNumber(3),
      dai: new BigNumber(13.8),
      date: '2018-11-24 11:54:16',
      id: one,
    }),
    createEvent({
      kind: MTHistoryEventKind.tend,
      gem: new BigNumber(3),
      dai: new BigNumber(13.8),
      date: '2018-11-24 11:54:16',
      id: one,
    }),
    createEvent({
      kind: MTHistoryEventKind.dent,
      gem: new BigNumber(2.8),
      dai: new BigNumber(13.8),
      date: '2018-11-24 11:54:16',
      id: one,
    }),
    createEvent({
      kind: MTHistoryEventKind.deal,
      date: '2018-11-27 14:15:12',
      id: one,
    }),

    createEvent({
      kind: MTHistoryEventKind.bite,
      gem: new BigNumber(120),
      dai: new BigNumber(6000),
      date: '2018-12-12 07:32:54',
      id: new BigNumber(2),
    }),

    createEvent({
      kind: MTHistoryEventKind.kick,
      gem: new BigNumber(40),
      dai: new BigNumber(2300),
      date: '2018-12-12 07:32:54',
      id: new BigNumber(3),
    }),
    createEvent({
      kind: MTHistoryEventKind.tend,
      gem: new BigNumber(40),
      dai: new BigNumber(2300),
      date: '2018-12-12 07:32:54',
      id: new BigNumber(3),
    }),
    createEvent({
      kind: MTHistoryEventKind.dent,
      gem: new BigNumber(36),
      dai: new BigNumber(2300),
      date: '2018-12-12 07:32:54',
      id: new BigNumber(3),
    }),

    createEvent({
      kind: MTHistoryEventKind.kick,
      gem: new BigNumber(40),
      dai: new BigNumber(2300),
      date: '2018-12-12 07:44:12',
      id: new BigNumber(4),
    }),
    createEvent({
      kind: MTHistoryEventKind.tend,
      gem: new BigNumber(40),
      dai: new BigNumber(2300),
      date: '2018-12-12 07:44:12',
      id: new BigNumber(4),
    }),
    createEvent({
      kind: MTHistoryEventKind.dent,
      gem: new BigNumber(37),
      dai: new BigNumber(2300),
      date: '2018-12-12 07:44:12',
      id: new BigNumber(4),
    }),

    createEvent({
      kind: MTHistoryEventKind.kick,
      gem: new BigNumber(40),
      dai: new BigNumber(2300),
      date: '2018-12-12 08:10:08',
      id: new BigNumber(5),
    }),
    createEvent({
      kind: MTHistoryEventKind.tend,
      gem: new BigNumber(40),
      dai: new BigNumber(2300),
      date: '2018-12-12 08:10:08',
      id: new BigNumber(5),
    }),
    createEvent({
      kind: MTHistoryEventKind.dent,
      gem: new BigNumber(35),
      dai: new BigNumber(2300),
      date: '2018-12-12 08:10:08',
      id: new BigNumber(5),
    }),

    createEvent({
      kind: MTHistoryEventKind.deal,
      date: '2018-12-15 09:54',
      id: new BigNumber(5),
    }),
    createEvent({
      kind: MTHistoryEventKind.deal,
      date: '2018-12-15 09:57:34',
      id: new BigNumber(4),
    }),
    createEvent({
      kind: MTHistoryEventKind.deal,
      date: '2018-12-15 10:02:12',
      id: new BigNumber(3),
    }),
  ];
  return (
    <CDPHistoryViewModal {...getParams(history)} />
  );
});
