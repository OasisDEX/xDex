import * as React from 'react';

import { default as BigNumber } from 'bignumber.js';
import { BehaviorSubject, combineLatest, Observable, Subject } from 'rxjs';
import { map, switchMap } from 'rxjs/internal/operators';
import { AssetKind, getToken } from '../blockchain/config';
import { TxState } from '../blockchain/transactions';
import {
  CreateMTAllocateForm$
} from '../marginTrading/allocate/mtOrderAllocateDebtFormView';
import {
  MTMyPositionPanelInternal
} from '../marginTrading/positions/MTMyPositionPanel';
import {
  MarginableAsset, UserActionKind
} from '../marginTrading/state/mtAccount';
import { MTTransferFormState } from '../marginTrading/transfer/mtTransferForm';
import { formatAmount, formatPercent } from '../utils/formatters/format';
import { Loadable } from '../utils/loadable';
import { WithLoadingIndicator } from '../utils/loadingIndicator/LoadingIndicator';
import { ModalOpenerProps } from '../utils/modal';
import { Panel, PanelHeader } from '../utils/panel/Panel';
import { Table } from '../utils/table/Table';
import { Currency } from '../utils/text/Text';
import { CombinedBalances } from './balances';
import * as styles from './mtBalancesView.scss';

export type MTBalancesProps = CombinedBalances & {
  ma?: MarginableAsset;
  selectMa: (ma?: MarginableAsset) => void;
};

export type MTBalancesOwnProps = ModalOpenerProps &
  {
    createMTFundForm$:
      (params: { actionKind: UserActionKind, token: string }) =>
        Observable<MTTransferFormState>,
    approveMTProxy: (args: {token: string; proxyAddress: string}) => Observable<TxState>,
    redeem: (args: {token: string; proxy: any, amount: BigNumber}) => void,
    transactions: TxState[],
    createMTAllocateForm$: CreateMTAllocateForm$,
    daiAllowance: Observable<boolean>,
  };

export class MTBalancesView
  extends React.Component<Loadable<MTBalancesProps> & MTBalancesOwnProps>
{
  public render() {
    const { status, value, error, ...props } = this.props;

    return (
      <Panel className={styles.balancesPanel}>
        <PanelHeader>Leverage Account</PanelHeader>
        <WithLoadingIndicator loadable={this.props}>
          {(combinedBalances) => (
            combinedBalances.ma ?
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
                ma: combinedBalances.ma,
                mta: combinedBalances.mta,
                daiPrice: new BigNumber(0)
              }}
            /> :
            <MTBalancesViewInternal
              { ...{
                ...combinedBalances,
                ...props
              } }
            />
          )}
        </WithLoadingIndicator>
      </Panel>
    );
  }
}

export function createBalancesView$(
  initializedAccount$: Observable<string>,
  mtBalances$: Observable<CombinedBalances>
) {
  return initializedAccount$.pipe(
    switchMap(() => {
      const ma$: Subject<MarginableAsset | undefined> =
        new BehaviorSubject<MarginableAsset | undefined>(undefined);
      return combineLatest(ma$, mtBalances$).pipe(
        map(([ma, balances]) => ({
          ...balances,
          ma,
          selectMa: ma$.next.bind(ma$)
        }))
      );
    })
  );
}

export class MTBalancesViewInternal
  extends React.Component<MTBalancesProps & MTBalancesOwnProps> {

  public render() {
    return (
      <Table className={styles.table} align="left">
        <thead>
        <tr>
          <th>Asset</th>
          <th className={styles.amount}>Interest Rate</th>
          <th className={styles.amount}>Market Price</th>
          <th className={styles.amount}>Liq. Price</th>
          <th className={styles.amount}>PnL</th>
          <th className={styles.amount}>Your Balance</th>
        </tr>
        </thead>
        <tbody>
        {(!this.props.balances || this.props.balances.length === 0) && <tr>
            <td colSpan={7} className={styles.center}>You have no assets</td>
        </tr>}
        {this.props.balances && this.props.balances
          .filter(b => b.asset && b.asset.assetKind === AssetKind.marginable)
          .map(combinedBalance => {
            const asset: MarginableAsset = combinedBalance.asset!;
            return (
              <tr
                onClick={() => this.props.selectMa(asset)}
                data-test-id={`${combinedBalance.name}-overview`}
                key={combinedBalance.name}
              >
                <td>
                  <div className={styles.centeredAsset}>
                    <div style={{ width: '24px', height: '24px', marginRight: '12px' }}>
                      {getToken(combinedBalance.name).iconColor}
                    </div>
                    <Currency
                      value={getToken(combinedBalance.name).name}/>
                  </div>
                </td>
                <td className={styles.amount}>
                  {formatPercent(asset.fee, { precision: 2 })}
                </td>
                <td className={styles.amount}>
                  {formatAmount(asset.referencePrice, 'DAI')}
                </td>
                <td className={styles.amount}>
                  {!asset.liquidationPrice.isNaN() &&
                  formatAmount(asset.liquidationPrice, 'DAI') ||
                  '-'}
                </td>
                <td className={styles.amount}>
                  {asset.pnl && formatPercent(asset.pnl) || '-'}
                </td>
                <td className={styles.amount}>
                  {formatAmount(asset.balance, asset.name)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </Table>
    );
  }
}
