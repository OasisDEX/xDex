import * as React from 'react';
import { Observable } from 'rxjs';
import { theAppContext } from '../AppContext';
import { getToken } from '../blockchain/config';
import { TxState } from '../blockchain/transactions';
import dottedMenuSvg from '../marginTrading/positions/dotted-menu.svg';
import { connect } from '../utils/connect';
import { formatPrecision } from '../utils/formatters/format';
import { Money } from '../utils/formatters/Formatters';
import { Button } from '../utils/forms/Buttons';
import { SvgImage } from '../utils/icons/utils';
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
import { CombinedBalance, CombinedBalances } from './balances';
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

class AssetDropdownMenu extends React.Component<{
  asset: string,
  actions: React.ReactNode[];
}> {
  public render() {
    const { asset, actions } = this.props;
    return (
      <div
        className={styles.dropdownMenu}
        style={{ display: 'flex' }}
      >
        <Button
          size="sm"
          color="secondaryOutlined"
          className={styles.dropdownButton}
          data-test-id="myposition-actions-list"
        >
          <SvgImage image={dottedMenuSvg}/>
        </Button>
        <div className={styles.dropdownList}>
          {
            actions.map((actionBtn, index) =>
                          <div key={`${asset}-${index}`}
                               className={styles.actionButton}
                          >
                            {actionBtn}
                          </div>
            )
          }
        </div>
      </div>
    );
  }
}

export class WalletViewInternal extends React.Component<CombinedBalances & WalletViewProps> {
  public render() {
    return (
      <Table className={styles.table} align="left">
        <thead>
        <tr>
          <th>Asset</th>
          <th className={styles.amount}>Your Balance</th>
          <th className={styles.amount}>Total Value</th>
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
                <div className={styles.centeredAsset}>
                  <div style={{ width: '24px', height: '24px', marginRight: '12px' }}>
                    {getToken(combinedBalance.name).iconColor}
                  </div>
                  <Currency
                    value={getToken(combinedBalance.name).name}/>
                </div>
              </td>
              <td data-test-id={`${combinedBalance.name}-balance`} className={styles.amount}>
                <Money value={combinedBalance.walletBalance} token={combinedBalance.name}/>
              </td>
              <td className={styles.amount}>
                $ {formatPrecision(combinedBalance.mtAssetValueInDAI, 2)}
              </td>
              <td className={styles.amount} style={{ display: 'flex', justifyContent: 'flex-end' }}>
                {combinedBalance.name === 'ETH' &&
                <Button
                  color="secondaryOutlined"
                  data-test-id="open-wrap-form"
                  className={styles.actionButton}
                  size="sm"
                  onClick={() => this.wrap()}
                  disabled={combinedBalance.walletBalance.eq(zero)}
                >
                  Wrap
                </Button>}
                {combinedBalance.name === 'WETH' &&
                <Button
                  color="secondaryOutlined"
                  data-test-id="open-unwrap-form"
                  className={styles.actionButton}
                  size="sm"
                  onClick={() => this.unwrap()}
                  disabled={combinedBalance.walletBalance.eq(zero)}
                >
                  Unwrap
                </Button>
                }
                {
                  combinedBalance.name !== 'ETH' &&
                  <AssetDropdownMenu
                    actions={this.createActionsPerAsset(combinedBalance)}
                    asset={combinedBalance.name}
                  />
                }
              </td>
            </tr>
          );
        })}
        </tbody>
      </Table>
    );
  }

  private createActionsPerAsset = (combinedBalance: CombinedBalance): (React.ReactNode[]) => {
    const actions: React.ReactNode[] = [];

    if (combinedBalance
      && combinedBalance.name !== 'ETH'
      && combinedBalance.allowance
    ) {
      actions.push(
        <Button
          key={combinedBalance.name}
          size="sm"
          color="secondaryOutlined"
          block={true}
          onClick={() => this.props.disapproveWallet(combinedBalance.name)}
        >
          Disable
        </Button>
      );
    }

    if (combinedBalance
      && combinedBalance.name !== 'ETH'
      && !combinedBalance.allowance) {
      actions.push(
        <Button
          key={combinedBalance.name}
          size="sm"
          color="secondaryOutlined"
          onClick={() => this.props.approveWallet(combinedBalance.name)}
        >
          Enable
        </Button>
      );
    }

    if (combinedBalance && combinedBalance.name === 'SAI') {
      actions.push(
        <theAppContext.Consumer>
          {({ SAI2DAIMigrationTxRx }) =>
            // @ts-ignore
            <SAI2DAIMigrationTxRx label={'Upgrade Sai'}
                                  tid="update-btn-account"
                                  className={styles.redeemBtn}
            />
          }
        </theAppContext.Consumer>
      );
    }

    if (combinedBalance && combinedBalance.name === 'DAI') {
      actions.push(
        <theAppContext.Consumer>
          {({ DAI2SAIMigrationTxRx }) =>
            // @ts-ignore
            <DAI2SAIMigrationTxRx label={'Swap for Sai'}
                                  tid="swap-btn-account"
                                  className={styles.redeemBtn}
            />
          }
        </theAppContext.Consumer>
      );
    }
    return actions;
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
