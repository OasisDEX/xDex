import classnames from 'classnames';
import * as React from 'react';
import { Observable } from 'rxjs/index';
import { CDPHistoryView } from '../../balances-mt/CDPHistoryView';
import { CDPLiquidationHistoryView } from '../../balances-mt/CDPLiquidationHistoryView';
import { TxState } from '../../blockchain/transactions';
import { connect } from '../../utils/connect';
import { formatPrecision } from '../../utils/formatters/format';
import { FormatPercent, Money } from '../../utils/formatters/Formatters';
import { Button } from '../../utils/forms/Buttons';
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
    const leverage = this.props.ma.leverage && !this.props.ma.leverage.isNaN()
      ? this.props.ma.leverage :
      this.props.ma.balance.gt(zero) ? one : zero;
    const dai = findAsset('DAI', this.props.mta);
    const asset = this.props.ma;
    const liquidationPrice = this.props.ma.liquidationPrice
    && !this.props.ma.liquidationPrice.isNaN() ?
      this.props.ma.liquidationPrice : zero;
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
        <CDPHistoryView {...this.props.ma} />
        <CDPLiquidationHistoryView {...this.props.ma} />
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
