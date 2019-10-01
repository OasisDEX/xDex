import * as React from 'react';
import { CDPHistoryView } from '../../balances-mt/CDPHistoryView';
import { CDPLiquidationHistoryView } from '../../balances-mt/CDPLiquidationHistoryView';
import { connect } from '../../utils/connect';
import { formatPrecision } from '../../utils/formatters/format';
import { Money } from '../../utils/formatters/Formatters';
import { Button } from '../../utils/forms/Buttons';
import { inject } from '../../utils/inject';
import { ModalOpenerProps, ModalProps } from '../../utils/modal';
import { one, zero } from '../../utils/zero';
import { CreateMTAllocateForm$Props } from '../allocate/mtOrderAllocateDebtFormView';
import { MarginableAsset, UserActionKind } from '../state/mtAccount';
import { CreateMTFundForm$, MTTransferFormState } from '../transfer/mtTransferForm';
import { MtTransferFormView } from '../transfer/mtTransferFormView';
import * as styles from './MTMyPositionView.scss';

interface MTMyPositionViewProps {
  ma: MarginableAsset;
  createMTFundForm$: CreateMTFundForm$;
  close?: () => void;
}

export class MTMyPositionView extends
  React.Component<MTMyPositionViewProps & ModalOpenerProps>
{
  public render() {
    const equity = this.props.ma.balance
      .times(this.props.ma.referencePrice).minus(this.props.ma.debt);
    const leverage = this.props.ma.leverage && !this.props.ma.leverage.isNaN()
      ? this.props.ma.leverage :
      this.props.ma.balance.gt(zero) ? one : zero;
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
                15%
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
            <div className={styles.summaryRow}>
              <div className={styles.summaryLabel}>
                Interest Rate
              </div>
              <div className={styles.summaryValue}>
                15.5%
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
            <div className={styles.summaryRow}>
              <div className={styles.summaryLabel}>
                Average Price
              </div>
              <div className={styles.summaryValue}>
                { this.props.ma.referencePrice &&
                <Money value={this.props.ma.referencePrice} token="DAI" />
                }
              </div>
            </div>
          </div>
          <div className={styles.MTPositionColumnNarrow}>
            <Button
              size="lg"
              className={styles.actionButton}
              disabled={!this.props.ma.availableActions.includes(UserActionKind.fund)}
              onClick={() => this.transfer(UserActionKind.fund, this.props.ma.name)}
            >
              Deposit
            </Button>
            <Button
              size="lg"
              className={styles.actionButton}
              onClick={() => this.transfer(UserActionKind.draw, this.props.ma.name)}
            >
              Withdraw
            </Button>
          </div>
        </div>
        <CDPHistoryView {...this.props.ma} />
        <CDPLiquidationHistoryView {...this.props.ma} />
      </div>);
  }

  private transfer (actionKind: UserActionKind, token: string) {
    const fundForm$ = this.props.createMTFundForm$(actionKind, token);
    const MTFundFormViewRxTx =
      connect<MTTransferFormState, ModalProps>(
        inject(
          MtTransferFormView,
          // cast is safe as CreateMTAllocateForm$Props
          // is not used inside MtTransferFormView!
          (this.props as any) as (CreateMTAllocateForm$Props & ModalOpenerProps),
        ),
        fundForm$
      );
    this.props.open(MTFundFormViewRxTx);
  }
}
