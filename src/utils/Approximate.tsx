import * as React from 'react';
import * as styles from './Approximate.scss';

export const Approximate = (props: any) => <span {...props}>~&nbsp;{props.children}</span>;

export const ApproximateInputValue = (props: { children: any; shouldApproximate: boolean }) => (
  <span className={styles.wrapper}>
    {props.children}
    {props.shouldApproximate && <span className={styles.inputApprox}>~</span>}
  </span>
);
