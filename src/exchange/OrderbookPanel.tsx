import * as React from 'react';
import { useObservable } from "../utils/observableHook";
import { Observable } from 'rxjs';

import { BehaviorSubject } from 'rxjs/internal/BehaviorSubject';
import { map } from 'rxjs/operators';
import { theAppContext } from 'src/AppContext';
import { inject } from 'src/utils/inject';

import { OrderbookViewHooked } from '../exchange/orderbook/OrderbookView';
import { DepthChartWithLoadingHooked } from '../exchange/depthChart/DepthChartWithLoading';

const { useContext } = React;

export enum OrderbookViewKind {
  depthChart = 'depthChart',
  list = 'list'
}

export interface OrderbookPanelProps {
  kind: OrderbookViewKind;
}

export interface SubViewsProps {
  DepthChartWithLoadingHooked : React.ComponentType;
  OrderbookViewHooked: React.ComponentType;
}

export class OrderbookPanel extends React.Component<OrderbookPanelProps & SubViewsProps> {
  public render() {
    if (this.props.kind === OrderbookViewKind.depthChart) {
      return (<this.props.DepthChartWithLoadingHooked/>);
    }
    return (<this.props.OrderbookViewHooked/>);
  }
}

export const OrderbookHooked = () => {
  const { orderbookPanel$ } = useContext(theAppContext);
  const state = useObservable(orderbookPanel$);

  if(!state) return null;

  const Wrapper = inject<OrderbookPanelProps, SubViewsProps>(
    OrderbookPanel, { DepthChartWithLoadingHooked, OrderbookViewHooked }
  );

  return <Wrapper {...state}/>;
}

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
