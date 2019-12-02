import bignumberJs, { default as BigNumber } from 'bignumber.js';
import classnames from 'classnames';
import * as React from 'react';
import { Observable } from 'rxjs/index';
import { first, switchMap } from 'rxjs/internal/operators';
import { CDPHistoryView } from '../../balances/CDPHistoryView';
import { Calls$ } from '../../blockchain/calls/calls';
import { TxState } from '../../blockchain/transactions';
import { connect } from '../../utils/connect';
import { formatPrecision } from '../../utils/formatters/format';
import { FormatPercent, Money } from '../../utils/formatters/Formatters';
import { Button } from '../../utils/forms/Buttons';
import { SvgImage } from '../../utils/icons/utils';
import { inject } from '../../utils/inject';
import { ModalOpenerProps, ModalProps } from '../../utils/modal';
import { minusOne, one, zero } from '../../utils/zero';
import { CreateMTAllocateForm$Props } from '../allocate/mtOrderAllocateDebtFormView';
import {
  findAsset,
  MarginableAsset,
  MTAccount,
  MTAccountState,
  UserActionKind
} from '../state/mtAccount';
import { CreateMTFundForm$, MTTransferFormState } from '../transfer/mtTransferForm';
import { MtTransferFormView } from '../transfer/mtTransferFormView';
import * as styles from './MTMyPositionView.scss';
import warningIconSvg from './warning-icon.svg';

interface MTMyPositionViewProps {
  mta: MTAccount;
  ma: MarginableAsset;
  createMTFundForm$: CreateMTFundForm$;
  approveMTProxy: (args: {token: string; proxyAddress: string}) => Observable<TxState>;
  redeem: (args: {token: string; proxy: any, amount: BigNumber}) => void;
  close?: () => void;
}

// interface RedeemButtonProps {
//   disabled: boolean;
//   redeem: () => void;
// }
//
// export class RedeemButton extends React.Component<RedeemButtonProps> {
//
//   public render() {
//     return (<Button
//               size="md"
//               disabled={this.props.disabled}
//               className={styles.redeemButton}
//               onClick={this.props.redeem}
//             >Redeem</Button>
//     );
//   }
// }

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
    // const equity = this.props.ma.balance
    //   .times(this.props.ma.referencePrice).minus(this.props.ma.debt);
    const leverage = this.props.ma.leverage && !this.props.ma.leverage.isNaN()
      ? this.props.ma.leverage :
      this.props.ma.balance.gt(zero) ? one : zero;
    const dai = findAsset('DAI', this.props.mta);
    const asset = this.props.ma;
    const liquidationPrice = this.props.ma.liquidationPrice
    && !this.props.ma.liquidationPrice.isNaN() ?
      this.props.ma.liquidationPrice : zero;

    // const totalBalance = this.props.ma.balance.plus(this.props.ma.amountBeingLiquidated);
    return (
      <div>
        <div className={styles.MTPositionPanel}>
          <div className={styles.MTPositionColumnNarrow}>
            <div className={styles.statsBox}>
              <div className={styles.summaryValue}>
                <>Long - { formatPrecision(leverage, 1) }x</>
                <div className={styles.summaryLabel}>Leverage</div>
              </div>
            </div>
            <div className={styles.statsBox}>
              <div className={styles.summaryValue}>
                <>-</>
                <div className={styles.summaryLabel}>PnL</div>
              </div>
            </div>
          </div>
          <div className={styles.MTPositionColumn}>
            <div className={styles.summaryRow}>
              <div className={styles.summaryLabel}>
                Liqu. Price
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
                Liqu. Fee
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
            <div className={styles.summaryRow}>
              <div className={styles.summaryLabel}>
                Interest Rate
              </div>
              <div className={styles.summaryValue}>
                <FormatPercent
                  value={this.props.ma.fee}
                  fallback="-"
                  multiply={false}
                />
              </div>
            </div>
          </div>
          <div className={styles.MTPositionColumn}>
            <div className={styles.summaryRow}>
              <div className={styles.summaryLabel}>
                Your Balance
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
          </div>
          <div className={styles.MTPositionColumnNarrow}>
            <Button
              size="md"
              className={styles.actionButton}
              disabled={!this.props.ma.availableActions.includes(UserActionKind.fund)}
              onClick={() => this.transfer(UserActionKind.fund, this.props.ma.name, undefined)}
            >
              Deposit
            </Button>
            <Button
              size="md"
              className={styles.actionButton}
              onClick={() => this.transfer(UserActionKind.draw, this.props.ma.name, undefined)}
            >
              Withdraw
            </Button>

            { dai && dai.allowance ? <>
                <Button
                  size="md"
                  className={styles.actionButton}
                  disabled={!this.props.ma.availableActions.includes(UserActionKind.fund)}
                  onClick={() => this.transfer(UserActionKind.fund, 'DAI', this.props.ma.name)}
                >
                  Deposit DAI
                </Button>
                <Button
                  size="md"
                  className={styles.actionButton}
                  onClick={() => this.transfer(UserActionKind.draw, 'DAI', this.props.ma.name)}
                >
                  Withdraw DAI
                </Button>
              </>
              : <>
                <Button
                  size="md"
                  className={styles.actionButton}
                  onClick={ this.approveMTProxy('DAI')}
                >
                  Enable DAI
                </Button>
              </>
            }
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

              {this.props.ma.redeemable.gt(zero) &&
                <Button
                  size="md"
                  disabled={this.props.ma.redeemable.eq(zero)}
                  className={styles.redeemButton}
                  onClick={() => this.props.redeem({
                    token: this.props.ma.name,
                    proxy: this.props.mta.proxy,
                    amount: this.props.ma.redeemable})}
                >Redeem</Button>
              }
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

  private approveMTProxy(token: string) {
    return () => {
      if (this.props.mta.state === MTAccountState.notSetup) {
        return;
      }
      this.props.approveMTProxy({
        token,
        proxyAddress: this.props.mta.proxy.address as string
      });
    };
  }

  private transfer (actionKind: UserActionKind, token: string, ilk: string | undefined) {
    const fundForm$ = this.props.createMTFundForm$(actionKind, token, ilk);
    const MTFundFormViewRxTx =
      connect<MTTransferFormState, ModalProps>(
        inject(
          MtTransferFormView,
          // cast is safe as CreateMTAllocateForm$Props
          // is not used inside MtTransferFormView!
          (this.props as any) as (CreateMTAllocateForm$Props & ModalOpenerProps)
        ),
        fundForm$
      );
    this.props.open(MTFundFormViewRxTx);
  }
}
