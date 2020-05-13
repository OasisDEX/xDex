/*
 * Copyright (C) 2020 Maker Ecosystem Growth Holdings, INC.
 */

import * as React from 'react';

import { default as BigNumber } from 'bignumber.js';
import classnames from 'classnames';
import { withRouter } from 'react-router';
import { BehaviorSubject, combineLatest, Observable, Subject } from 'rxjs';
import { map, switchMap } from 'rxjs/internal/operators';
import { AssetKind, getToken } from '../blockchain/config';
import { TxState } from '../blockchain/transactions';
import { RouterProps } from '../Main';
import { CreateMTAllocateForm$ } from '../marginTrading/allocate/mtOrderAllocateDebtFormView';
import { MTMyPositionPanelInternal } from '../marginTrading/positions/MTMyPositionPanel';
import { findMarginableAsset, MarginableAsset, MTAccountState, UserActionKind } from '../marginTrading/state/mtAccount';
import { MTTransferFormState } from '../marginTrading/transfer/mtTransferForm';
import { formatDateTime, formatPrecision } from '../utils/formatters/format';
import { CryptoMoney, Money } from '../utils/formatters/Formatters';
import { Loadable } from '../utils/loadable';
import { WithLoadingIndicator } from '../utils/loadingIndicator/LoadingIndicator';
import { ModalOpenerProps } from '../utils/modal';
import { Panel, PanelHeader } from '../utils/panel/Panel';
import { Table } from '../utils/table/Table';
import { Currency, InfoLabel } from '../utils/text/Text';
import { one, zero } from '../utils/zero';
import { CombinedBalances } from './balances';
import * as styles from './mtBalancesView.scss';

export type MTBalancesProps = CombinedBalances & {
  ma?: MarginableAsset;
  selectMa: (ma?: MarginableAsset) => void;
  daiPrice: BigNumber;
};

export type MTBalancesOwnProps = ModalOpenerProps & {
  createMTFundForm$: (params: { actionKind: UserActionKind; token: string }) => Observable<MTTransferFormState>;
  approveMTProxy: (args: { token: string; proxyAddress: string }) => Observable<TxState>;
  redeem: (args: { token: string; proxy: any; amount: BigNumber }) => void;
  transactions: TxState[];
  createMTAllocateForm$: CreateMTAllocateForm$;
  daiAllowance: Observable<boolean>;
};

export class MTBalancesView extends React.Component<Loadable<MTBalancesProps> & MTBalancesOwnProps> {
  public render() {
    const { status, value, error, ...props } = this.props;

    return (
      <Panel className={styles.balancesPanel}>
        <PanelHeader>Multiply Account</PanelHeader>
        <WithLoadingIndicator loadable={this.props}>
          {(combinedBalances) =>
            combinedBalances.ma && combinedBalances.mta.state === MTAccountState.setup ? (
              <MTMyPositionPanelInternal
                {...{
                  open: props.open,
                  close: () => combinedBalances.selectMa(undefined),
                  createMTFundForm$: props.createMTFundForm$,
                  approveMTProxy: props.approveMTProxy,
                  account: 'TODO',
                  redeem: props.redeem,
                  transactions: props.transactions,
                  daiAllowance: props.daiAllowance,
                  ma: findMarginableAsset(combinedBalances.ma.name, combinedBalances.mta)!,
                  mta: combinedBalances.mta,
                  daiPrice: new BigNumber(0),
                }}
              />
            ) : (
              <MTBalancesViewInternal
                {...{
                  ...combinedBalances,
                  ...props,
                }}
              />
            )
          }
        </WithLoadingIndicator>
      </Panel>
    );
  }
}

export function createBalancesView$(
  initializedAccount$: Observable<string>,
  mtBalances$: Observable<CombinedBalances>,
  daiPriceUsd$: Observable<BigNumber | undefined>,
) {
  return initializedAccount$.pipe(
    switchMap(() => {
      const ma$: Subject<MarginableAsset | undefined> = new BehaviorSubject<MarginableAsset | undefined>(undefined);
      return combineLatest(ma$, mtBalances$, daiPriceUsd$).pipe(
        map(([ma, balances, daiPrice]) => ({
          ...balances,
          ma,
          daiPrice,
          selectMa: ma$.next.bind(ma$),
        })),
      );
    }),
  );
}

export class MTBalancesViewInternalImpl extends React.Component<MTBalancesProps & MTBalancesOwnProps & RouterProps> {
  public render() {
    return (
      <Table className={classnames(styles.table, styles.assets)} align="left">
        <thead>
          <tr>
            <th>Asset</th>
            <th className={styles.amount}>Multiple</th>
            <th className={styles.amount}>Equity (DAI)</th>
            <th className={styles.amount}>Mark Price (DAI)</th>
            <th className={styles.amount}>Liq. Price (DAI)</th>
            <th className={styles.amount}>Last interaction</th>
          </tr>
        </thead>
        <tbody>
          {(!this.props.balances || this.props.balances.length === 0) && (
            <tr>
              <td colSpan={7} className={styles.center}>
                You have no assets
              </td>
            </tr>
          )}
          {this.props.balances &&
            this.props.balances
              .filter((b) => b.asset && b.asset.assetKind === AssetKind.marginable)
              .map((combinedBalance) => {
                const asset: MarginableAsset = combinedBalance.asset!;
                const lastEvent = asset.rawHistory.slice(-1)[0] || undefined;
                const daiPrice = this.props.daiPrice;
                const multiple = asset.multiple ? asset.multiple : asset.balance.gt(zero) ? one : zero;
                const liquidationPrice = asset.liquidationPrice ? asset.liquidationPrice : zero;
                const liquidationPriceMarket =
                  liquidationPrice && asset.midpointPrice ? liquidationPrice.times(daiPrice) : zero;
                const liquidationPriceDisplay = liquidationPriceMarket.gt(zero) ? liquidationPriceMarket : undefined;

                const markPrice = asset.markPrice && daiPrice ? asset.markPrice.times(daiPrice) : undefined;

                return (
                  <tr
                    onClick={() =>
                      this.props.mta.state === MTAccountState.setup
                        ? this.props.selectMa(asset)
                        : this.props.history.push(`multiply/${asset.name}/DAI`)
                    }
                    data-test-id={`${combinedBalance.name}-overview`}
                    key={combinedBalance.name}
                  >
                    <td>
                      <div className={styles.centeredAsset}>
                        <div style={{ width: '24px', height: '24px', marginRight: '12px' }}>
                          {getToken(combinedBalance.name).iconColor}
                        </div>
                        <Currency value={getToken(combinedBalance.name).name} />
                      </div>
                    </td>
                    <td className={styles.amount}>
                      {multiple.gt(zero) ? <> Long - {formatPrecision(multiple, 1)}x</> : <span>-</span>}
                    </td>
                    <td className={styles.amount}>
                      {asset.equity && <CryptoMoney value={asset.equity} token="DAI" fallback="-" />}
                    </td>
                    <td className={styles.amount}>
                      {markPrice ? (
                        <>
                          ~<Money value={markPrice} token={'DAI'} />
                        </>
                      ) : (
                        <>N/A</>
                      )}
                    </td>
                    <td className={styles.amount}>
                      {liquidationPriceDisplay ? (
                        <>
                          ~<Money value={liquidationPriceDisplay} token={'DAI'} fallback="-" />
                        </>
                      ) : (
                        <>N/A</>
                      )}
                    </td>
                    <td className={styles.amount}>
                      <InfoLabel>{lastEvent ? formatDateTime(new Date(lastEvent.timestamp), true) : <>-</>}</InfoLabel>
                    </td>
                  </tr>
                );
              })}
        </tbody>
      </Table>
    );
  }
}

export const MTBalancesViewInternal = withRouter(MTBalancesViewInternalImpl);
