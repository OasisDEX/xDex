import React, { useContext } from 'react';
import { Observable } from 'rxjs';
import { useObservable } from '../utils/observableHook';

import { BehaviorSubject } from 'rxjs/internal/BehaviorSubject';
import { map } from 'rxjs/operators';
import { theAppContext } from 'src/AppContext';
import { inject } from 'src/utils/inject';

import { DepthChartWithLoadingHooked } from '../exchange/depthChart/DepthChartWithLoading';
import { OrderbookViewHooked } from '../exchange/orderbook/OrderbookView';

export enum OrderbookViewKind {
  depthChart = 'depthChart',
  list = 'list'
}

export interface OrderbookPanelProps {
  kind: OrderbookViewKind;
}

export interface SubViewsProps {
  DepthChartWithLoading : React.ComponentType;
  OrderbookView: React.ComponentType;
}

export const OrderbookPanel = (props: OrderbookPanelProps & SubViewsProps) => {
  if (props.kind === OrderbookViewKind.depthChart) {
    return (<props.DepthChartWithLoading/>);
  }
  return (<props.OrderbookView/>);
};

export const OrderbookHooked = () => {
  const { orderbookPanel$ } = useContext(theAppContext);
  const state = useObservable(orderbookPanel$);

  if (!state) return null;

  const Wrapper = inject<OrderbookPanelProps, SubViewsProps>(
    OrderbookPanel, {
      DepthChartWithLoading: DepthChartWithLoadingHooked,
      OrderbookView: OrderbookViewHooked
    }
  );

  return <Wrapper {...state}/>;
};

export function createOrderbookPanel$(): [
  (kind: OrderbookViewKind) => void,
  Observable<OrderbookPanelProps>
] {
  const kind$ = new BehaviorSubject(OrderbookViewKind.list);
  return [
    kind$.next.bind(kind$),
    kind$.pipe(
      map(kind => ({
        kind,
      }))
    )
  ];
}
