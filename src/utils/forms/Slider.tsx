import classnames from 'classnames';
import * as React from 'react';

import { ProgressIcon } from '../icons/Icons';
import * as styles from './Slider.scss';

type SliderProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  disabled?: boolean;
  moveOnHover?: boolean;
  blocked: boolean;
  className?: string;
  pointerStyle?: string;
  inProgress?: boolean;
};

export function Slider(props: SliderProps) {
  const { blocked, moveOnHover, inProgress, disabled, className, pointerStyle, ...selectProps } = props;

  return (
    <button
      className={classnames(styles.wrapper, className, {
        [styles.disabled]: disabled,
        [styles.unblocked]: !blocked,
        [styles.moveOnHover]: moveOnHover,
      })}
      disabled={disabled}
      tabIndex={disabled ? undefined : 0}
      {...selectProps}
    >
      <div
        className={classnames(styles.pointer, pointerStyle, {
          [styles.pointerBlocked]: blocked,
          [styles.pointerUnblocked]: !blocked,
          [styles.inProgress]: inProgress,
        })}
        data-toggle-state={blocked ? 'disabled' : 'enabled'}
        data-test-id="toggle-button-state"
      />
      {inProgress && (
        <ProgressIcon
          light={true}
          size="sm"
          className={classnames(styles.progressIcon, {
            [styles.progressBlocked]: blocked,
            [styles.progressUnblocked]: !blocked,
          })}
        />
      )}
    </button>
  );
}

type SwitchProps = SliderProps & {
  optionOne: any;
  optionTwo: any;
};

export function Switch(props: SwitchProps) {
  const {
    blocked,
    moveOnHover,
    inProgress,
    disabled,
    className,
    pointerStyle,
    optionOne,
    optionTwo,
    ...selectProps
  } = props;

  return (
    <button
      className={classnames(styles.wrapper, className, {
        [styles.disabled]: disabled,
        [styles.unblocked]: !blocked,
        [styles.moveOnHover]: moveOnHover,
      })}
      disabled={disabled}
      tabIndex={disabled ? undefined : 0}
      {...selectProps}
    >
      <div
        className={classnames(styles.pointer, pointerStyle, {
          [styles.pointerBlocked]: blocked,
          [styles.pointerUnblocked]: !blocked,
          [styles.inProgress]: inProgress,
        })}
        data-toggle-state={blocked ? 'disabled' : 'enabled'}
        data-test-id="toggle-button-state"
      />
      <div className={classnames(styles.option, blocked && styles.highlight)}>{optionOne}</div>
      <div className={classnames(styles.option, !blocked && styles.highlight)}>{optionTwo}</div>
    </button>
  );
}
