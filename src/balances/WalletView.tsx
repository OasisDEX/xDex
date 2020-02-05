import * as classnames from 'classnames';
import * as React from 'react';
import { Observable } from 'rxjs';
import { Slider } from 'src/utils/forms/Slider';
import { getToken } from '../blockchain/config';
import { TxState } from '../blockchain/transactions';
import { connect } from '../utils/connect';
import { formatPrecision } from '../utils/formatters/format';
import { Money } from '../utils/formatters/Formatters';
import { Button } from '../utils/forms/Buttons';
import { inject } from '../utils/inject';
import { Loadable, loadablifyLight } from '../utils/loadable';
import { WithLoadingIndicator } from '../utils/loadingIndicator/LoadingIndicator';
import { ModalOpenerProps, ModalProps, } from '../utils/modal';
import { Panel, PanelHeader } from '../utils/panel/Panel';
import { Table } from '../utils/table/Table';
import { Currency } from '../utils/text/Text';
import { zero } from '../utils/zero';
import { WrapUnwrapFormKind, WrapUnwrapFormState } from '../wrapUnwrap/wrapUnwrapForm';
import { WrapUnwrapFormView } from '../wrapUnwrap/WrapUnwrapFormView';
import { CombinedBalances } from './balances';
import * as styles from './mtBalancesView.scss';

export type WalletViewProps = ModalOpenerProps & {
  wrapUnwrapForm$: (formKind: WrapUnwrapFormKind) => Observable<WrapUnwrapFormState>;
  approveWallet: (token: string) => Observable<TxState>;
  disapproveWallet: (token: string) => Observable<TxState>;
};

export class WalletView
  extends React.Component<Loadable<CombinedBalances> & WalletViewProps> {
  public render() {
    const { status, value, error, ...walletViewProps } = this.props;
    return (
      <Panel className={styles.balancesPanel}>
        <PanelHeader>My Wallet</PanelHeader>
        <WithLoadingIndicator loadable={this.props}>
          {(combinedBalances) => (
            <WalletViewInternal
              {...{ ...combinedBalances, ...walletViewProps }}
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
          <th>Symbol</th>
          <th className="hide-lg">Asset</th>
          <th style={{ textAlign: 'center' }}>Unlock</th>
          <th className={styles.amount}>Your Balance</th>
          <th className={classnames(styles.amount, 'hide-md')}>Total Value</th>
          <th className={styles.amount}>Actions</th>
        </tr>
        </thead>
        <tbody>
        {(!this.props.balances || this.props.balances.length === 0) && <tr>
          <td colSpan={7} className={styles.center}>You have no assets</td>
        </tr>}
        {this.props.balances && this.props.balances.map(combinedBalance => {
          return (
            <tr data-test-id={`${combinedBalance.name}-overview`} key={combinedBalance.name}>
              <td>
                <div style={{ display: 'flex' }}>
                  <span style={{ marginRight: '12px' }}>
                    {getToken(combinedBalance.name).icon}
                  </span>
                  <span>{getToken(combinedBalance.name).symbol}</span>
                </div>
              </td>
              <td className="hide-lg">
                <div className={styles.centeredAsset}>
                  <Currency
                    value={getToken(combinedBalance.name).name}/>
                </div>
              </td>
              <td style={{ textAlign: 'center' }}>
                {
                  combinedBalance.name !== 'ETH' && <Slider blocked={!combinedBalance.allowance}
                          data-test-id="toggle-allowance"
                          disabled={combinedBalance.allowanceChangeInProgress}
                          inProgress={combinedBalance.allowanceChangeInProgress}
                          onClick={() => combinedBalance.allowance ?
                            this.props.disapproveWallet(combinedBalance.name) :
                            this.props.approveWallet(combinedBalance.name)
                          }
                  />
                }
              </td>
              <td data-test-id={`${combinedBalance.name}-balance`} className={styles.amount}>
                <Money value={combinedBalance.walletBalance} token={combinedBalance.name}/>
              </td>
              <td className={classnames(styles.amount, 'hide-md')} >
                $ {formatPrecision(combinedBalance.mtAssetValueInDAI, 2)}
              </td>
              <td>
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  {
                    combinedBalance.name === 'ETH' &&
                    <Button
                      color="secondaryOutlined"
                      data-test-id="open-wrap-form"
                      className={styles.actionButton}
                      size="xs"
                      onClick={() => this.wrap()}
                      disabled={combinedBalance.walletBalance.eq(zero)}
                    >
                    Wrap
                  </Button>
                  }
                  {
                    combinedBalance.name === 'WETH' &&
                    <Button
                      color="secondaryOutlined"
                      data-test-id="open-unwrap-form"
                      className={styles.actionButton}
                      size="xs"
                      onClick={() => this.unwrap()}
                      disabled={combinedBalance.walletBalance.eq(zero)}
                    >
                      Unwrap
                    </Button>
                  }
                </div>
              </td>
            </tr>
          );
        })}
        </tbody>
      </Table>
    );
  }

  private openWrapUnwrap(kind: WrapUnwrapFormKind) {
    this.props.open(
      connect(
        inject<Loadable<WrapUnwrapFormState> & ModalProps, { kind: WrapUnwrapFormKind }>(
          WrapUnwrapFormView, { kind }
        ),
        loadablifyLight(this.props.wrapUnwrapForm$(kind))
      )
    );
  }

  private wrap() {
    this.openWrapUnwrap(WrapUnwrapFormKind.wrap);
  }

  private unwrap() {
    this.openWrapUnwrap(WrapUnwrapFormKind.unwrap);
  }
}
