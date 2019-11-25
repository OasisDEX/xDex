import * as moment from 'moment';
import * as React from 'react';
import { Observable } from 'rxjs/index';
import { CDPHistoryView } from '../../balances-mt/CDPHistoryView';
import { TxState } from '../../blockchain/transactions';
import { connect } from '../../utils/connect';
import { formatPercent, formatPrecision } from '../../utils/formatters/format';
import { Money } from '../../utils/formatters/Formatters';
import { Button } from '../../utils/forms/Buttons';
import { SvgImage } from '../../utils/icons/utils';
import { inject } from '../../utils/inject';
import { ModalOpenerProps, ModalProps } from '../../utils/modal';
import { one, zero } from '../../utils/zero';
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
  close?: () => void;
}

export class MTMyPositionView extends
  React.Component<MTMyPositionViewProps & ModalOpenerProps>
{
  public render() {
    console.log('MTA', this.props.mta);
    console.log('MA', this.props.ma);
    const equity = this.props.ma.balance
      .times(this.props.ma.referencePrice).minus(this.props.ma.debt);
    const leverage = this.props.ma.leverage && !this.props.ma.leverage.isNaN()
      ? this.props.ma.leverage :
      this.props.ma.balance.gt(zero) ? one : zero;

    const dai = findAsset('DAI', this.props.mta);

    const liquidationTime = moment(this.props.ma.zzz);
    const duration = moment.duration(liquidationTime.diff(moment(new Date())));
    const liquidationTimeDelta = this.props.ma.zzz
      && moment.utc(duration.asMilliseconds()).format('HH:mm');

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
                  this.props.ma.liquidationPrice && !this.props.ma.liquidationPrice.isNaN()
                  && this.props.ma.liquidationPrice.gt(zero) ?
                    <>
                      {formatPrecision(this.props.ma.liquidationPrice, 2)} USD
                    </>
                    : <span>-</span>
                }
              </div>
            </div>
            <div className={styles.summaryRow}>
              <div className={styles.summaryLabel}>
                Liqu. Fee
              </div>
              <div className={styles.summaryValue}>
                -
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
                {formatPercent(this.props.ma.fee, { precision: 2 })}
              </div>
            </div>
            <div className={styles.summaryRow}>
              <div className={styles.summaryLabel}>
                Dai debt
              </div>
              <div className={styles.summaryValue}>
                {
                  this.props.ma.debt && !this.props.ma.debt.isNaN() ?
                    <Money
                      value={this.props.ma.debt}
                      token="DAI"
                      fallback="-"
                    /> : <span>-</span>
                }
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
                Equity
              </div>
              <div className={styles.summaryValue}>
                {
                  equity && !equity.isNaN() ?
                    <Money value={equity} token="DAI" /> : <span>-</span>
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
            <div className={styles.warningMessage}>
              <SvgImage image={warningIconSvg}/>
              <span>
              The {this.props.ma.name} price ({this.props.ma.osmPriceNext!.toString()} USD)
              is approaching your Liquidation Price and your position will soon be liquidated.
              You&nbsp;may rescue your Position by paying off Dai debt or deposit&nbsp;
                {this.props.ma.name} in the next {liquidationTimeDelta} minutes.</span>
            </div>
          }
          {
            this.props.ma.bitable === 'yes' &&
            <div className={styles.warningMessage}>
              <SvgImage image={warningIconSvg}/>
              <span>
              {this.props.ma.amountBeingLiquidated.toString()}
                &nbsp;of total {this.props.ma.balance.toString()} {this.props.ma.name}
                &nbsp;is being liquidated from your position.&nbsp;
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
