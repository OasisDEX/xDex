import classnames from 'classnames';
import * as React from 'react';

import { tokens } from '../blockchain/config';
import { MarginableAsset } from '../marginTrading/state/mtAccount';
import { FormatPercent, Money } from '../utils/formatters/Formatters';
import { Button } from '../utils/forms/Buttons';
import { inject } from '../utils/inject';
import { Hr } from '../utils/layout/LayoutHelpers';
import { ModalOpenerProps, ModalProps } from '../utils/modal';
import { Panel, PanelHeader } from '../utils/panel/Panel';
import { Currency, Muted } from '../utils/text/Text';
import { zero } from '../utils/zero';
import { CDPHistoryViewModal } from './CDPHistoryView';
import * as styles from './CDPRiskManagement.scss';

enum CollateralizationState {
  safe,
  unsafe,
  toLiquidation
}

export class CDPRiskManagement
  extends React.Component<MarginableAsset & ModalOpenerProps>
{
  public render() {
    return (
      <Panel style={{ width: '100%' }}>
        <PanelHeader bordered={true}>
          {tokens[this.props.name].iconColor}
          <Currency value={tokens[this.props.name].name}/>
          <Button
            style={{ marginLeft: 'auto' }}
            disabled={this.props.history.length === 0}
            onClick={() => this.showHistory()}
          >
            Details
          </Button>
        </PanelHeader>
        <div className={styles.panelBody}>
          <div className={styles.flex}>
            { this.purchasingPower() }
            { this.liquidationPrice() }
            { this.currentPriceInfo() }
          </div>
          { this.props.liquidationInProgress &&
            <div style={{ textAlign: 'center' }}>
              liquidation in progress!
            </div>
          }
          { this.props.safe !== undefined &&
            <div style={{ textAlign: 'center' }}>
              safe: {this.props.safe ? 'true' : 'false'}
            </div>
          }
          { this.props.balance.gt(zero) &&
            <div>
              <Hr color="dark" />
              <div className={styles.flex}>
                { this.balance() }
                { this.collateralisation() }
                { this.debt() }
              </div>
            </div>
          }
        </div>
      </Panel>
    );
  }

  private showHistory() {
    this.props.open(inject<ModalProps, MarginableAsset>(CDPHistoryViewModal, this.props));
  }

  private collateralState() {
    if (!this.props.currentCollRatio || this.props.currentCollRatio.gte(this.props.safeCollRatio)
    ) {
      return CollateralizationState.safe;
    }
    return this.props.currentCollRatio.gte(this.props.minCollRatio) ?
      CollateralizationState.unsafe : CollateralizationState.toLiquidation;
  }

  private purchasingPower() {
    return (
      <div className={classnames(styles.box, styles.centered)}>
        <Muted>
          Purchasing power
        </Muted>
        <Money value={this.props.purchasingPower}
               token="DAI"
               className={styles.largeFontSize}
               greyedNonSignZeros={false}
        />
      </div>
    );
  }

  private liquidationPrice() {
    return (
      <div className={classnames(styles.box, styles.centered)}>
        <Muted>
          Liquidation price
        </Muted>
        {
          (!this.props.liquidationPrice || this.props.liquidationPrice.isNaN()) ?
            <div className={styles.largeFontSize}>-</div> :
            <Money
              value={this.props.liquidationPrice}
              token="USD"
              className={classnames(styles.largeFontSize, {
                [styles.green]: this.collateralState() === CollateralizationState.safe,
                [styles.warn]: this.collateralState() === CollateralizationState.unsafe,
                [styles.panic]: this.collateralState() === CollateralizationState.toLiquidation,
              })}
           />
        }
      </div>
    );
  }

  private currentPriceInfo() {
    return (
      <div className={classnames(styles.box, styles.centered)}>
        <Muted>
          Oracle price
        </Muted>
        <Money value={this.props.referencePrice}
               token="USD"
               className={styles.largeFontSize}
        />
      </div>
    );
  }

  private balance() {
    return (
      <div className={styles.box}>
        Balance
        <div className={styles.detailedRow}>
          <Muted>Available</Muted>
          <Money value={this.props.availableBalance}
                 token={this.props.name}
                 className={styles.detailedMoney}
          />
        </div>
        <div className={styles.detailedRow}>
          <Muted>Locked</Muted>
          <Money value={this.props.lockedBalance}
                 token={this.props.name}
                 className={styles.detailedMoney}
          />
        </div>
        <div className={styles.detailedRow}>
          <Muted>Total</Muted>
          <Money value={this.props.balance}
                 token={this.props.name}
                 className={styles.detailedMoney}
          />
        </div>
      </div>
    );
  }

  private collateralisation() {
    return (
      <div className={styles.box}>
        Collateralisation ratio
        <div className={styles.detailedRow}>
          <Muted>Current</Muted>
          {this.props.currentCollRatio &&
            <FormatPercent value={this.props.currentCollRatio}
                           multiply={true}
                           className={classnames(styles.detailedPercent, {
                             [styles.green]:
                                this.collateralState() === CollateralizationState.safe,
                             [styles.warn]:
                                this.collateralState() === CollateralizationState.unsafe,
                             [styles.panic]:
                                this.collateralState() === CollateralizationState.toLiquidation,
                           })}
            />
          }
        </div>
        <div className={styles.detailedRow}>
          <Muted>Safe</Muted>
          <FormatPercent value={this.props.safeCollRatio}
                         multiply={true}
                         className={styles.detailedPercent}
          />
        </div>
        <div className={styles.detailedRow}>
          <Muted>Minimum</Muted>
          <FormatPercent value={this.props.minCollRatio}
                         multiply={true}
                         className={styles.detailedPercent}
          />
        </div>
      </div>
    );
  }

  private debt() {
    return (
      <div className={styles.box}>
        Debt
        <div className={styles.detailedRow}>
          <Muted>Available</Muted>
          <Money value={this.props.availableDebt}
                 token="DAI"
                 className={styles.detailedMoney}
          />
        </div>
        <div className={styles.detailedRow}>
          <Muted>Locked</Muted>
          <Money value={this.props.debt}
                 token="DAI"
                 className={styles.detailedMoney}
          />
        </div>
        <div className={styles.detailedRow}>
          <Muted>Max</Muted>
          <Money value={this.props.maxDebt}
                 token="DAI"
                 className={styles.detailedMoney}
          />
        </div>
      </div>
    );
  }
}
