import * as React from 'react';
import { CSSTransitionGroup } from 'react-transition-group';

import {
  TxState,
  TxStatus
} from '../blockchain/transactions';
import * as styles from './TransactionNotifier.scss';

const VISIBILITY_TIMEOUT: number = 5;

export class TransactionNotifierView extends React.Component<{
  transactions: TxState[];
}> {
  public render() {
    if (!this.props.transactions) {
      return null;
    }
    const now = new Date().getTime();
    return (
      <div className={styles.main}>
        <CSSTransitionGroup
          transitionName="transaction"
          transitionEnterTimeout={1000}
          transitionLeaveTimeout={600}
        >
          {this.props.transactions
            .filter(
              transaction =>
                transaction.status === TxStatus.Success &&
                transaction.confirmations < transaction.safeConfirmations ||
                !transaction.end ||
                now - transaction.lastChange.getTime() < VISIBILITY_TIMEOUT * 1000
            )
            .map(transaction => (
              <div key={transaction.txNo} className={styles.block}>
                <div className={styles.title}>
                  {transaction.meta.description(transaction.meta.args)}
                </div>
                <div>{transaction.status}</div>
                {transaction.status === TxStatus.Success &&
                <div>
                  confirmations: {transaction.confirmations}
                </div>}
              </div>
            ))}
        </CSSTransitionGroup>
      </div>
    );
  }
}
