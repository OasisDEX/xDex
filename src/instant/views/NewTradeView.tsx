/*
 * Copyright (C) 2020 Maker Ecosystem Growth Holdings, INC.
 */

import { BigNumber } from 'bignumber.js';
import classnames from 'classnames';
import * as React from 'react';
import { trackingEvents } from '../../analytics/analytics';
import { etherscan, EtherscanConfig } from '../../blockchain/etherscan';
import { OfferType } from '../../exchange/orderbook/orderbook';
import swapArrowsSvg from '../../icons/swap-arrows.svg';
import { formatAmountInstant } from '../../utils/formatters/format';
import { Button } from '../../utils/forms/Buttons';
import { AccountIcon, SettingsIcon } from '../../utils/icons/Icons';
import { SvgImage } from '../../utils/icons/utils';
import { TopLeftCorner, TopRightCorner } from '../../utils/panel/TopRightCorner';
import { TradeDetails } from '../details/TradeDetails';
import * as styles from '../Instant.scss';
import {
  InstantFormChangeKind,
  InstantFormState,
  ManualAllowanceProgress,
  ManualChange,
  Message,
  MessageKind,
  ProgressKind,
  TxInProgressMessage,
  ViewKind,
} from '../instantForm';
import { InstantFormWrapper } from '../InstantFormWrapper';
import { Buying, Selling } from '../TradingSide';

const inProgressMessages = new Map<ProgressKind, (msg: TxInProgressMessage) => string>([
  [ProgressKind.onlyProxy, (_: TxInProgressMessage) => `Your manual proxy creation is pending...`],
  [
    ProgressKind.onlyAllowance,
    (msg: TxInProgressMessage) => {
      const progress = msg.progress as ManualAllowanceProgress;

      return `Your ${progress.token.toUpperCase()} ${progress.direction} is pending...`;
    },
  ],
]);

function error(msg: Message | undefined) {
  if (!msg) {
    return <></>;
  }
  // tslint:disable
  switch (msg.kind) {
    case MessageKind.insufficientAmount:
      return (
        <>
          You don't have {formatAmountInstant(msg.amount, msg.token)} {msg.token.toUpperCase()} in your wallet
        </>
      );
    case MessageKind.dustAmount:
      return (
        <>
          The Minimum trade value is {msg.amount.valueOf()} {msg.token.toUpperCase()}
        </>
      );
    case MessageKind.incredibleAmount:
      return (
        <>
          The Maximum trade value is {msg.amount.valueOf()} {msg.token.toUpperCase()}
        </>
      );
    case MessageKind.orderbookTotalExceeded:
      return (
        <>
          No orders available to {msg.side} {formatAmountInstant(msg.amount, msg.token)} {msg.token.toUpperCase()}
        </>
      );
    case MessageKind.notConnected:
      return <>Connect wallet to proceed with order</>;
    case MessageKind.txInProgress:
      let message = 'A transaction is pending...';
      const customize = inProgressMessages.get(msg.progress.kind);

      if (customize) {
        message = customize(msg);
      }

      const txHash = (msg.progress as { txHash?: string }).txHash;
      return txHash ? (
        <a
          href={etherscan(msg.etherscan || ({} as EtherscanConfig)).transaction(txHash).url}
          rel="noreferrer noopener"
          target="_blank"
          style={{
            color: '#80D8FF',
          }}
        >
          {message}
        </a>
      ) : (
        <> {message} </>
      );
  }
  // tslint:enable
}

export class NewTradeView extends React.Component<InstantFormState> {
  public render() {
    const {
      sellToken,
      sellAmount,
      buyToken,
      buyAmount,
      balances,
      etherBalance,
      message,
      price,
      user,
      kind,
    } = this.props;

    return (
      <InstantFormWrapper
        heading="Enter Order Details"
        btnLabel="Start Transaction"
        btnAction={this.startTx}
        btnDisabled={!this.props.readyToProceed}
        btnDataTestId="initiate-trade"
      >
        <TopRightCorner>
          <SettingsIcon disabled={!price} data-test-id="trade-settings" onClick={this.showTradeSettings} />
        </TopRightCorner>
        <TopLeftCorner>
          <AccountIcon
            disabled={!(user && user.account)}
            data-test-id="account-settings"
            onClick={this.showAccountSettings}
          />
        </TopLeftCorner>
        <div className={styles.tradeDetails}>
          {message && message.top ? (
            <TradeDetails.Error dataTestId={'top-error'} message={error(message.top)} />
          ) : price ? (
            <TradeDetails {...this.props} />
          ) : null}
        </div>
        <div className={styles.assets}>
          <Selling
            asset={sellToken}
            amount={sellAmount}
            onAmountChange={this.updateSellingAmount}
            change={this.props.change}
            balance={(sellToken === 'ETH' && etherBalance) || (balances && balances[sellToken]) || undefined}
            user={user}
            approx={sellAmount && kind === 'buy'}
          />
          <Button
            data-test-id="swap"
            className={classnames(styles.swapBtn)}
            disabled={this.props.sellToken === 'SAI'}
            onClick={this.swap}
          >
            <SvgImage image={swapArrowsSvg} />
          </Button>
          <Buying
            asset={buyToken}
            amount={buyAmount}
            onAmountChange={this.updateBuyingAmount}
            change={this.props.change}
            balance={(buyToken === 'ETH' && etherBalance) || (balances && balances[buyToken]) || undefined}
            user={user}
            approx={buyAmount && kind === 'sell'}
          />
        </div>
        <div
          data-test-id="bottom-error"
          className={classnames(
            message &&
              message.bottom &&
              (message.bottom.kind === MessageKind.notConnected || message.bottom.kind === MessageKind.txInProgress)
              ? styles.warnings
              : styles.errors,
            message && message.bottom ? '' : styles.hidden,
          )}
        >
          {message && message.bottom && error(message.bottom)}
        </div>
      </InstantFormWrapper>
    );
  }

  private swap = () => {
    this.props.change({
      kind: InstantFormChangeKind.pairChange,
      buyToken: this.props.sellToken,
      sellToken: this.props.buyToken,
    });
  };

  private updateSellingAmount = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/,/g, '');
    this.props.change({
      kind: InstantFormChangeKind.sellAmountFieldChange,
      value: value === '' ? undefined : new BigNumber(value),
    } as ManualChange);
  };

  private updateBuyingAmount = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/,/g, '');
    this.props.change({
      kind: InstantFormChangeKind.buyAmountFieldChange,
      value: value === '' ? undefined : new BigNumber(value),
    } as ManualChange);
  };

  private startTx = () => {
    const priceImpact = this.props.priceImpact;

    if (priceImpact && priceImpact.gt(new BigNumber(5))) {
      this.props.change({
        kind: InstantFormChangeKind.viewChange,
        view: ViewKind.priceImpactWarning,
      });
    } else {
      const { kind, quotation, buyAmount, sellAmount } = this.props;
      const amount = kind === OfferType.buy ? sellAmount : buyAmount;
      if (kind && amount && quotation) {
        trackingEvents.initiateTradeInstant();
      }
      this.props.submit(this.props);
      this.props.change({
        kind: InstantFormChangeKind.viewChange,
        view: ViewKind.finalization,
      });
    }
  };

  // @ts-ignore
  private showAccountSettings = () => {
    this.props.change({
      kind: InstantFormChangeKind.viewChange,
      view: ViewKind.account,
    });
  };

  // @ts-ignore
  private showTradeSettings = () => {
    this.props.change({
      kind: InstantFormChangeKind.viewChange,
      view: ViewKind.settings,
    });
  };
}
