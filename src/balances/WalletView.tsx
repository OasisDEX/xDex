/*
 * Copyright (C) 2020 Maker Ecosystem Growth Holdings, INC.
 */

import * as classnames from 'classnames';
import React, { useContext } from 'react';
import { Observable } from 'rxjs';
import { theAppContext } from 'src/AppContext';
import { ModalOpener, useModal } from 'src/utils/modalHook';
import { useObservable } from 'src/utils/observableHook';
import { getToken } from '../blockchain/config';
import { TxState } from '../blockchain/transactions';
import { formatCryptoBalance, formatFiatBalance } from '../utils/formatters/format';
import { FormatAmount } from '../utils/formatters/Formatters';
import { Button } from '../utils/forms/Buttons';
import { Slider } from '../utils/forms/Slider';
import { WithLoadingIndicator } from '../utils/loadingIndicator/LoadingIndicator';
import { Panel, PanelHeader } from '../utils/panel/Panel';
import { Table } from '../utils/table/Table';
import { Currency } from '../utils/text/Text';
import { minusOne, zero } from '../utils/zero';
import { WrapUnwrapFormKind, WrapUnwrapFormState } from '../wrapUnwrap/wrapUnwrapForm';
import { WrapUnwrapFormView } from '../wrapUnwrap/WrapUnwrapFormView';
import { CombinedBalances } from './balances';
import * as styles from './mtBalancesView.scss';

export interface WalletViewProps {
  open: ModalOpener;
  wrapUnwrapForm$: (formKind: WrapUnwrapFormKind) => Observable<WrapUnwrapFormState>;
  approveWallet$: (token: string) => Observable<TxState>;
  disapproveWallet$: (token: string) => Observable<TxState>;
}

export const WalletViewHooked = () => {
  const { walletView$, approveWallet$, disapproveWallet$, wrapUnwrapForm$ } = useContext(theAppContext);
  const loadableState = useObservable(walletView$);
  const openModal = useModal();

  if (!loadableState) return null;

  const { status, value, error, ...walletViewProps } = loadableState;
  return (
    <Panel className={styles.balancesPanel}>
      <PanelHeader>My Wallet</PanelHeader>
      <WithLoadingIndicator loadable={loadableState}>
        {(combinedBalances) => (
          <WalletViewInternal
            {...{
              ...combinedBalances,
              ...walletViewProps,
              approveWallet$,
              disapproveWallet$,
              wrapUnwrapForm$,
              open: openModal,
            }}
          />
        )}
      </WithLoadingIndicator>
    </Panel>
  );
};

export const WalletViewInternal = (props: CombinedBalances & WalletViewProps) => {
  const openWrapUnwrap = (kind: WrapUnwrapFormKind) => {
    props.open(({ close }) => <WrapUnwrapFormView kind={kind} close={close} />);
  };

  const wrap = () => {
    openWrapUnwrap(WrapUnwrapFormKind.wrap);
  };

  const unwrap = () => {
    openWrapUnwrap(WrapUnwrapFormKind.unwrap);
  };
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
        {(!props.balances || props.balances.length === 0) && (
          <tr>
            <td colSpan={7} className={styles.center}>
              You have no assets
            </td>
          </tr>
        )}
        {props.balances &&
          props.balances.map((combinedBalance) => {
            return (
              <tr data-test-id={`${combinedBalance.name}-overview`} key={combinedBalance.name}>
                <td>
                  <div style={{ display: 'flex' }}>
                    <span style={{ marginRight: '12px' }}>{getToken(combinedBalance.name).icon}</span>
                    <span>{getToken(combinedBalance.name).symbol}</span>
                  </div>
                </td>
                <td className="hide-lg">
                  <div className={styles.centeredAsset}>
                    <Currency value={getToken(combinedBalance.name).name} />
                  </div>
                </td>
                <td style={{ textAlign: 'center' }}>
                  {combinedBalance.name !== 'ETH' && (
                    <Slider
                      blocked={!combinedBalance.allowance}
                      data-test-id="toggle-allowance"
                      disabled={combinedBalance.allowanceChangeInProgress}
                      inProgress={combinedBalance.allowanceChangeInProgress}
                      onClick={() =>
                        combinedBalance.allowance
                          ? props.disapproveWallet$(combinedBalance.name)
                          : props.approveWallet$(combinedBalance.name)
                      }
                    />
                  )}
                </td>
                <td data-test-id={`${combinedBalance.name}-balance`} className={styles.amount}>
                  <div>
                    <FormatAmount
                      data-test-id="amount"
                      token={combinedBalance.name}
                      value={combinedBalance.walletBalance}
                      formatter={(amount, _) => formatCryptoBalance(amount)}
                    />
                    <div className={styles.amountCurrency}>
                      <Currency value={combinedBalance.name} />
                    </div>
                  </div>
                </td>
                <td className={classnames(styles.amount, 'hide-md')}>
                  {combinedBalance.walletBalanceInUSD.eq(minusOne)
                    ? 'N/A'
                    : `$ ${formatFiatBalance(combinedBalance.walletBalanceInUSD)}`}
                </td>
                <td>
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    {combinedBalance.name === 'ETH' && (
                      <Button
                        color="secondaryOutlined"
                        data-test-id="open-wrap-form"
                        className={styles.actionButton}
                        size="xs"
                        onClick={() => wrap()}
                        disabled={combinedBalance.walletBalance.eq(zero)}
                      >
                        Wrap
                      </Button>
                    )}
                    {combinedBalance.name === 'WETH' && (
                      <Button
                        color="secondaryOutlined"
                        data-test-id="open-unwrap-form"
                        className={styles.actionButton}
                        size="xs"
                        onClick={() => unwrap()}
                        disabled={combinedBalance.walletBalance.eq(zero)}
                      >
                        Unwrap
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
      </tbody>
    </Table>
  );
};
