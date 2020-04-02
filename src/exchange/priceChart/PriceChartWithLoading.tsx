import * as React from "react";
import { BehaviorSubject, Observable } from "rxjs";
import { map, switchMap } from "rxjs/operators";
import { useObservable } from "../../utils/observableHook";
import classnames from "classnames";
import { Button, ButtonGroup } from "../../utils/forms/Buttons";
import { LoadableWithTradingPair } from "../../utils/loadable";
import { WithLoadingIndicator } from "../../utils/loadingIndicator/LoadingIndicator";
import { ServerUnreachable } from "../../utils/loadingIndicator/ServerUnreachable";
import { PanelHeader } from "../../utils/panel/Panel";
import { GroupMode, PriceChartDataPoint } from "./pricechart";
import { PriceChartView } from "./PriceChartView";
import * as styles from "./PriceChartWithLoading.scss";
import { theAppContext } from "src/AppContext";

export interface PriceChartProps
  extends LoadableWithTradingPair<PriceChartDataPoint[]> {
  groupMode: GroupMode;
  groupMode$: BehaviorSubject<GroupMode>;
}

export const PriceChartWithLoading = () => {
  const { priceChartLoadable$ } = React.useContext(theAppContext);
  const loadableState: PriceChartProps | undefined = useObservable(
    priceChartLoadable$
  );

  const handleKindChange = (groupMode: GroupMode) => () => {
    loadableState?.groupMode$.next(groupMode);
  };

  const button = (label: string, groupMode: GroupMode) => (
    <Button
      color={
        loadableState?.groupMode === groupMode ? "primary" : "greyOutlined"
      }
      size="sm"
      className={classnames(styles.btn)}
      onClick={handleKindChange(groupMode)}
    >
      {label}
    </Button>
  );

  return loadableState ? (
    <>
      <PanelHeader bordered={true}>
        Price chart
        <ButtonGroup style={{ marginLeft: "auto" }}>
          {button("1M", "byMonth")}
          {button("1W", "byWeek")}
          {button("1D", "byDay")}
          {button("1H", "byHour")}
        </ButtonGroup>
      </PanelHeader>
      <WithLoadingIndicator
        error={<ServerUnreachable />}
        size="lg"
        loadable={loadableState}
      >
        {(points: PriceChartDataPoint[]) => (
          <PriceChartView data={points} groupMode={loadableState?.groupMode} />
        )}
      </WithLoadingIndicator>
    </>
  ) : null;
};

export function createPriceChartLoadable$(
  groupMode$: Observable<GroupMode>,
  dataSources$: {
    [key in GroupMode]: Observable<
      LoadableWithTradingPair<PriceChartDataPoint[]>
    >;
  }
): Observable<PriceChartProps> {
  return groupMode$.pipe(
    switchMap((groupMode: GroupMode) =>
      dataSources$[groupMode].pipe(
        map(
          tradeHistory =>
            ({
              ...tradeHistory,
              groupMode,
              groupMode$
            } as PriceChartProps)
        )
      )
    )
  );
}
