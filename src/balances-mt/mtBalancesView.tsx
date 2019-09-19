import * as React from 'react';

import { BehaviorSubject, combineLatest, Observable, Subject } from 'rxjs';
import { map } from 'rxjs/internal/operators';
import {AssetKind, tokens} from '../blockchain/config';
import { TxState } from '../blockchain/transactions';
import {
  CreateMTAllocateForm$, CreateMTAllocateForm$Props
} from '../marginTrading/allocate/mtOrderAllocateDebtFormView';
import {
  MTMyPositionPanel, MTMyPositionPanelInternal
} from '../marginTrading/positions/MTMyPositionPanel';
import {
  findAsset, MarginableAsset, MTAccountState, UserActionKind
} from '../marginTrading/state/mtAccount';
import { MTTransferFormState } from '../marginTrading/transfer/mtTransferForm';
import { MtTransferFormView } from '../marginTrading/transfer/mtTransferFormView';
import { connect } from '../utils/connect';
import { FormatAmount } from '../utils/formatters/Formatters';
import { Slider } from '../utils/forms/Slider';
import { inject } from '../utils/inject';
import { Loadable } from '../utils/loadable';
import { WithLoadingIndicator } from '../utils/loadingIndicator/LoadingIndicator';
import { ModalOpenerProps, ModalProps, } from '../utils/modal';
import { Panel, PanelHeader } from '../utils/panel/Panel';
import { Table } from '../utils/table/Table';
import { Currency } from '../utils/text/Text';
import { CombinedBalance, CombinedBalances } from './balances';
import * as styles from './mtBalancesView.scss';

export type MTBalancesProps = CombinedBalances & {
  ma?: MarginableAsset;
  selectMa: (ma?: MarginableAsset) => void;
};

export type MTBalancesOwnProps = ModalOpenerProps &
  {
    createMTFundForm$:
      (actionKind: UserActionKind, token: string) => Observable<MTTransferFormState>,
    approveMTProxy: (args: {token: string; proxyAddress: string}) => Observable<TxState>,
    createMTAllocateForm$: CreateMTAllocateForm$,
  };

export class MTBalancesView
  extends React.Component<Loadable<MTBalancesProps> & MTBalancesOwnProps>
{
  public render() {
    const { status, value, error, ...props } = this.props;
    return (
      <Panel className={styles.balancesPanel}>
        <PanelHeader>Asset overview</PanelHeader>
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
                ma: combinedBalances.ma,
                mta: combinedBalances.mta
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

export function createBalancesView$(mtBalances$: Observable<CombinedBalances>) {
  const ma$: Subject<MarginableAsset | undefined> =
    new BehaviorSubject<MarginableAsset | undefined>(undefined);

  return combineLatest(ma$, mtBalances$).pipe(
    map(([ma, balances]) => ({
      ...balances,
      ma,
      selectMa: ma$.next.bind(ma$)
    }))
  );
}

export class MTBalancesViewInternal
  extends React.Component<MTBalancesProps & MTBalancesOwnProps> {

  public render() {
    return (
      <Table className={styles.table} align="left">
        <thead>
        <tr>
          <th style={{ width: '15%' }}>Symbol</th>
          <th style={{ width: '17%' }}>Asset</th>
          <th style={{ width: '20%' }} className={styles.center}>Unlock on Proxy</th>
          <th style={{ width: '15%' }} className={styles.amount}>Wallet</th>
          <th style={{ width: '15%' }} className={styles.center}>Transfer</th>
          <th style={{ width: '15%' }} className={styles.amount}>Margin Account</th>
          <th style={{ width: '15%' }} className={styles.amount}>Value (DAI)</th>
          <th style={{ width: '15%' }} className={styles.amount}>Cash (DAI)</th>
        </tr>
        </thead>
        <tbody>
        { (!this.props.balances || this.props.balances.length === 0) && <tr>
          <td colSpan={7} className={styles.center}>You have no assets</td>
        </tr> }
        { this.props.balances && this.props.balances
          .filter(b => b.asset && b.asset.assetKind === AssetKind.marginable)
          .map(combinedBalance => {
            return (
            <tr
              onClick={ () => this.props.selectMa(combinedBalance.asset as MarginableAsset)}
              data-test-id={`${combinedBalance.name}-overview`}
              key={combinedBalance.name}
            >
              <td>{combinedBalance.name}</td>
              <td>
                <div className={styles.centeredAsset}>
                  {tokens[combinedBalance.name].icon} <Currency
                  value={tokens[combinedBalance.name].name} />
                </div>
              </td>
              <td className={styles.center}>
                {combinedBalance.asset &&
                  <Slider blocked={!combinedBalance.asset.allowance}
                        disabled={
                          this.props.mta.state !== MTAccountState.setup ||
                          combinedBalance.asset.allowance
                        }
                        onClick={this.approveMTProxy(combinedBalance)}
                        data-test-id="toggle-leverage-allowance"
                  />
                }
              </td>
              <td data-test-id={`${combinedBalance.name}-balance`} className={styles.amount}>
                <FormatAmount value={combinedBalance.walletBalance} token={combinedBalance.name} />
              </td>
              <td className={styles.center}>
                { combinedBalance.asset &&
                  <div>
                    <button className={`${styles.transferBtn} ${styles.transferBtnLeft}`}
                            disabled={!this.isActionEnabled(
                              combinedBalance.name,
                              UserActionKind.draw)}
                            onClick={() => this.transfer(
                              UserActionKind.draw,
                              combinedBalance.name)}
                    >
                      <Arrow/>
                    </button>
                    < button className={styles.transferBtn}
                             disabled={!this.isActionEnabled(
                               combinedBalance.name,
                               UserActionKind.fund)}
                             onClick={() => this.transfer(
                               UserActionKind.fund,
                               combinedBalance.name)}
                    >
                      <Arrow />
                    </button>
                  </div>
                }
              </td>
              <td className={styles.amount}>
                {combinedBalance.asset && combinedBalance.name !== 'DAI' &&
                 <FormatAmount
                   value={combinedBalance.asset.balance}
                   token={combinedBalance.name}
                 />
                }
              </td>
              <td className={styles.amount}>
                {combinedBalance.name !== 'ETH' && combinedBalance.name !== 'DAI' &&
                  <FormatAmount value={combinedBalance.mtAssetValueInDAI} token="DAI"/>
                }
              </td>
              <td className={styles.amount}>
                  <FormatAmount value={combinedBalance.cashBalance} token="DAI"/>
              </td>
            </tr>
            );
          })}
        </tbody>
      </Table>
    );
  }

  private transfer (actionKind: UserActionKind, token: string) {
    const fundForm$ = this.props.createMTFundForm$(actionKind, token);
    const MTFundFormViewRxTx =
      connect<MTTransferFormState, ModalProps>(
        inject(MtTransferFormView, this.props as (CreateMTAllocateForm$Props & ModalOpenerProps)),
        fundForm$);
    // const MTFundFormViewRxTx = withModal<ModalProps, ModalOpenerProps>(
    //   connect<MTTransferFormState, ModalProps & ModalOpenerProps>(
    //     inject(MtTransferFormView, this.props as CreateMTAllocateForm$Props),
    //     fundForm$));
    this.props.open(MTFundFormViewRxTx);
  }

  private approveMTProxy(combinedBalance: CombinedBalance): () => void {
    return () => {
      if (this.props.mta.state === MTAccountState.notSetup) {
        return;
      }
      this.props.approveMTProxy({
        token: combinedBalance.name,
        proxyAddress: this.props.mta.proxy.address as string
      });
    };
  }

  private isActionEnabled(token: string, action: UserActionKind): boolean {
    if (!this.props.mta || this.props.mta.state !== MTAccountState.setup) {
      return false;
    }

    const asset = findAsset(token, this.props.mta);
    return asset !== undefined &&
      asset.availableActions.includes(action);
  }
}

class Arrow extends React.PureComponent {
  public render() {
    // tslint:disable:max-line-length
    return (
      <svg width="20px" height="20px" viewBox="0 0 20 20" version="1.1">
        <g stroke="none" strokeWidth="1" fill="none" fillRule="evenodd">
          <polygon fill="#FFFFFF" fillRule="nonzero" points="11.51 9 4.5 9 4.5 11 11.51 11 11.51 14 15.5 10 11.51 6" />
        </g>
      </svg>
    );
  }
}
