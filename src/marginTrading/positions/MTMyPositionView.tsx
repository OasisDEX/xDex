import { default as BigNumber } from 'bignumber.js';
import classnames from 'classnames';
import * as React from 'react';
import { Observable } from 'rxjs/index';
import { first, switchMap } from 'rxjs/internal/operators';
import { CDPHistoryView } from '../../balances/CDPHistoryView';
import { Calls$ } from '../../blockchain/calls/calls';
import { TxMetaKind } from '../../blockchain/calls/txMeta';
import { isDone, TxState } from '../../blockchain/transactions';
import { formatPrecision } from '../../utils/formatters/format';
import { FormatPercent, Money } from '../../utils/formatters/Formatters';
import { Button } from '../../utils/forms/Buttons';
import { SvgImage } from '../../utils/icons/utils';
import { LoadingIndicator } from '../../utils/loadingIndicator/LoadingIndicator';
import { ModalOpenerProps } from '../../utils/modal';
import { minusOne, one, zero } from '../../utils/zero';
import {
  MarginableAsset,
  MTAccount
} from '../state/mtAccount';
import { CreateMTFundForm$ } from '../transfer/mtTransferForm';
import * as styles from './MTMyPositionView.scss';
import warningIconSvg from './warning-icon.svg';

interface MTMyPositionViewProps {
  mta: MTAccount;
  ma: MarginableAsset;
  createMTFundForm$: CreateMTFundForm$;
  approveMTProxy: (args: {token: string; proxyAddress: string}) => Observable<TxState>;
  redeem: (args: {token: string; proxy: any, amount: BigNumber}) => void;
  close?: () => void;
  transactions: TxState[];
}

interface RedeemButtonProps {
  disabled: boolean;
  redeem: () => void;
  token: string;
  transactions: TxState[];
}

class RedeemButton extends React.Component<RedeemButtonProps> {

  public render() {
    const txInProgress = Boolean(this.props.transactions.find((t: TxState) =>
      t.meta.kind === TxMetaKind.redeem &&
      !isDone(t) &&
      t.meta.args.token === this.props.token
    ));

    return (<Button
        size="md"
        disabled={this.props.disabled || txInProgress}
        className={styles.redeemButton}
        onClick={this.props.redeem}
      >
        {txInProgress ? <LoadingIndicator className={styles.buttonLoading} /> : 'Redeem'}
      </Button>
    );
  }
}

export function createRedeem(calls$: Calls$) {
  return (args: {token: string; proxy: any, amount: BigNumber}): Observable<TxState> => {
    const r = calls$.pipe(
      first(),
      switchMap(calls => {
        return calls.mtRedeem(args);
      })
    );
    r.subscribe();
    return r;
  };
}

export class MTMyPositionView extends
  React.Component<MTMyPositionViewProps & ModalOpenerProps>
{
  public render() {
    const equity = this.props.ma.balance
      .times(this.props.ma.referencePrice).minus(this.props.ma.debt).plus(this.props.ma.dai);
    const leverage = this.props.ma.leverage && !this.props.ma.leverage.isNaN()
      ? this.props.ma.leverage :
      this.props.ma.balance.gt(zero) ? one : zero;
    const asset = this.props.ma;
    const liquidationPrice = this.props.ma.liquidationPrice
    && !this.props.ma.liquidationPrice.isNaN() ?
      this.props.ma.liquidationPrice : zero;

    // const totalBalance = this.props.ma.balance.plus(this.props.ma.amountBeingLiquidated);
    return (
      <div>
        <div className={styles.MTPositionPanel}>

          <div className={styles.MTPositionColumn}>
            <div className={styles.summaryRow}>
              <div className={styles.summaryLabel}>
                Leverage
              </div>
              <div className={styles.summaryValue}>
                Long - { formatPrecision(leverage, 1) }x
              </div>
            </div>

            <div className={styles.summaryRow}>
              <div className={styles.summaryLabel}>
                Stability Fee
              </div>
              <div className={styles.summaryValue}>
                <FormatPercent
                  value={this.props.ma.fee}
                  fallback="-"
                  multiply={false}
                />
              </div>
            </div>
            <div className={styles.summaryRow}>
              <div className={styles.summaryLabel}>
                Liquidation Penalty
              </div>
              <div className={styles.summaryValue}>
                {/*15%*/}
                {/*{*/}
                {/*this.props.liquidationFee && !this.props.liquidationFee.isNaN() ?*/}
                {/*<>*/}
                {/*{formatPrecision(this.props.liquidationPrice, 2)} USD*/}
                {/*</>*/}
                {/*: <span>-</span>*/}
                {/*}*/}
              </div>
            </div>
          </div>

          <div className={styles.MTPositionColumn}>
            <div className={styles.summaryRow}>
              <div className={styles.summaryLabel}>
                Liquidation Price
              </div>
              <div className={styles.summaryValue}>
                {
                  liquidationPrice.gt(zero) ?
                    <Money
                      value={liquidationPrice}
                      token="USD"
                      fallback="-"
                      className={
                        classnames({
                          [styles.summaryValuePositive]: asset && asset.safe,
                          [styles.summaryValueNegative]: asset && !asset.safe,
                        })
                      }
                    /> : <span>-</span>
                }
              </div>
            </div>
            <div className={styles.summaryRow}>
              <div className={styles.summaryLabel}>
                Current Price
              </div>
              <div className={styles.summaryValue}>
                {this.props.ma.referencePrice &&
                  <Money value={this.props.ma.referencePrice} token="USD"/>
                }
              </div>
            </div>
          </div>
          <div className={styles.MTPositionColumn}>
            <div className={styles.summaryRow}>
              <div className={styles.summaryLabel}>
                Balance
              </div>
              <div className={styles.summaryValue}>
                {
                  this.props.ma.balance && !this.props.ma.balance.isNaN() ?
                    <Money
                      value={this.props.ma.balance}
                      token={this.props.ma.name}
                      fallback="-"
                    /> : <span>-</span>
                }
              </div>
            </div>
            <div className={styles.summaryRow}>
              <div className={styles.summaryLabel}>
                DAI Balance
              </div>
              <div className={styles.summaryValue}>
                { asset && asset.debt.gt(zero) ?
                  <Money
                    value={asset.debt.times(minusOne)}
                    token="DAI"
                    fallback="-"
                  /> : asset && asset.dai ?
                    <Money
                      value={asset.dai}
                      token="DAI"
                      fallback="-"
                    /> : <span>-</span>
                }
              </div>
            </div>
            <div className={styles.summaryRow}>
              <div className={styles.summaryLabel}>
                Equity
              </div>
              <div className={styles.summaryValue}>
                {
                  equity && !equity.isNaN() ?
                    <Money
                      value={equity}
                      token="DAI"
                      fallback="-"
                    /> : <span>-</span>
                }

              </div>
            </div>
            {/*<div className={styles.summaryRow}>*/}
              {/*<div className={styles.summaryLabel}>*/}
                {/*Purchasing Power*/}
              {/*</div>*/}
              {/*<div className={styles.summaryValue}>*/}
              {/*</div>*/}
            {/*</div>*/}
          </div>
        </div>

        <div>
          {
            this.props.ma.bitable === 'imminent' &&
            // tslint:disable
            <div className={styles.warningMessage}>
              <SvgImage image={warningIconSvg}/>
              <span>
              The {this.props.ma.name} price&nbsp;
                ({this.props.ma.osmPriceNext && this.props.ma.osmPriceNext.toString()} USD)
              is approaching your Liquidation Price and your position will soon be liquidated.
              You&nbsp;may rescue your Position by paying off Dai debt or deposit&nbsp;
                {this.props.ma.name} in the next {this.props.ma.nextPriceUpdateDelta} minutes.
              </span>
            </div>
            // tslint:enable
          }
          {
            this.props.ma.bitable === 'yes' &&
            <div className={styles.warningMessage}>
              <SvgImage image={warningIconSvg}/>
              <span>
                <Money
                  value={this.props.ma.amountBeingLiquidated}
                  token={this.props.ma.name}
                  fallback="-"
                />
                &nbsp;of total <Money
                value={this.props.ma.balance}
                token={this.props.ma.name}
                fallback="-"
              />&nbsp;is being liquidated from your position.&nbsp;
                { this.props.ma.redeemable.gt(zero) &&
                // tslint:disable
                <><br />You can redeem <Money
                  value={this.props.ma.redeemable}
                  token={this.props.ma.name}
                  fallback="-"
                /> collateral.
                </>
                  // tslint:enable
                }
            </span>

              <RedeemButton
                redeem={() => this.props.redeem({
                  token: this.props.ma.name,
                  proxy: this.props.mta.proxy,
                  amount: this.props.ma.redeemable})}

                token={this.props.ma.name}
                disabled={this.props.ma.redeemable.eq(zero)}
                transactions={this.props.transactions}
              />
            </div>
          }
          {
            this.props.ma.bitable === 'no' && this.props.ma.redeemable.gt(zero) &&
            <div className={styles.infoMessage}>
              <span>
                Your Position has been liquidated.
                Please redeem {this.props.ma.redeemable.toString()}
                &nbsp;{this.props.ma.name} of collateral.
              </span>
              <Button
                size="md"
                disabled={this.props.ma.redeemable.eq(zero)}
                className={styles.redeemButton}
              >Redeem</Button>
            </div>
          }
        </div>
        <CDPHistoryView {...this.props.ma} />
      </div>);
  }
}
