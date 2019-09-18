import * as React from 'react';

import { Observable } from 'rxjs';
import { tokens } from '../blockchain/config';
import { TxState } from '../blockchain/transactions';
import { CreateMTAllocateForm$Props } from '../marginTrading/allocate/mtOrderAllocateDebtFormView';
import { findAsset, MTAccountState, UserActionKind } from '../marginTrading/state/mtAccount';
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

export type WalletViewProps = ModalOpenerProps & {
  approveWallet: (token: string) => Observable<TxState>;
  disapproveWallet: (token: string) => Observable<TxState>;
};

export class WalletView
  extends React.Component<Loadable<CombinedBalances> & WalletViewProps>
{
  public render() {
    const { status, value, error, ...walletViewProps } = this.props;
    return (
      <Panel className={styles.balancesPanel}>
        <PanelHeader>My Wallet</PanelHeader>
        <WithLoadingIndicator loadable={this.props}>
          {(combinedBalances) => (
            <WalletViewInternal
              { ...{ ...combinedBalances, ...walletViewProps } }
            />
          )}
        </WithLoadingIndicator>
      </Panel>
    );
  }
}

export class WalletViewInternal extends React.Component<CombinedBalances & WalletViewProps> {
  public render() {
    return (
      <Table className={styles.table} align="left">
        <thead>
        <tr>
          <th style={{ width: '15%' }}>Symbol</th>
          <th style={{ width: '17%' }}>Asset</th>
          <th style={{ width: '20%' }} className={styles.center}>Unlock</th>
          <th style={{ width: '15%' }} className={styles.amount}>Wallet</th>
        </tr>
        </thead>
        <tbody>
        { (!this.props.balances || this.props.balances.length === 0) && <tr>
          <td colSpan={7} className={styles.center}>You have no assets</td>
        </tr> }
        { this.props.balances && this.props.balances.map(combinedBalance => {
          return (
          <tr data-test-id={`${combinedBalance.name}-overview`} key={combinedBalance.name}>
            <td>{combinedBalance.name}</td>
            <td>
              <div className={styles.centeredAsset}>
                {tokens[combinedBalance.name].icon} <Currency
                value={tokens[combinedBalance.name].name} />
              </div>
            </td>
            <td>
              {combinedBalance.asset &&
                <Slider blocked={!combinedBalance.allowance}
                        disabled={
                          combinedBalance.allowance
                        }
                        onClick={this.approveWallet(combinedBalance)}
                        data-test-id="toggle-leverage-allowance"
                />
              }
            </td>
            <td data-test-id={`${combinedBalance.name}-balance`} className={styles.amount}>
              <FormatAmount value={combinedBalance.walletBalance} token={combinedBalance.name} />
            </td>
          </tr>
          );
        })}
        </tbody>
      </Table>
    );
  }

  private approveWallet(combinedBalance: CombinedBalance): () => void {
    return () => {
      this.props.approveWallet(combinedBalance.name);
    };
  }
}
