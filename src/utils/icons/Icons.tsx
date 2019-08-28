import classnames from 'classnames';
import * as React from 'react';
import accountSvg from '../../icons/account.svg';
import backSvg from '../../icons/back.svg';
import cogWheelSvg from '../../icons/cog-wheel.svg';
import { Button, ButtonProps } from '../forms/Buttons';
import * as styles from './Icons.scss';
import { SvgImage } from './utils';

export const InfoIcon = (props: React.HTMLAttributes<HTMLDivElement>) => {
  const { className, ...otherProps } = props;
  return (
    <div
      className={classnames(styles.infoIcon, className)}
      {...otherProps}
    >i</div>
  );
};

export const ButtonIcon = (props: ButtonProps & { image: any }) => {
  const { className, image, ...otherProps } = props;
  return (
    <Button
      size="unsized"
      className={className}
      {...otherProps}>
      <SvgImage className={styles.btnIcon} image={image}/>
    </Button>
  );
};

export type ProgressIconProps = React.HTMLAttributes<HTMLDivElement> & {
  light?: boolean,
  size?: 'sm' | 'lg',
};

export const ProgressIcon = (props: ProgressIconProps) => {
  const { className, light, size, ...otherProps } = props;
  return (
    <div
      className={classnames(styles.progressIcon, className, {
        [styles.progressIconLight]: light,
        [styles.progressIconSm]: size === 'sm',
        [styles.progressIconLg]: size === 'lg',
      })}
      {...otherProps}
    />
  );
};

export type DefaultIconProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  dataTestId?: string
};

// TODO: Those two can be optimized even further;
export const SettingsIcon = (props: DefaultIconProps) => (
  <ButtonIcon
    className={classnames(styles.settingsIcon, props.className)}
    disabled={props.disabled}
    onClick={props.onClick}
    image={cogWheelSvg}
    data-test-id={props.dataTestId}
  />
);

export const BackIcon = (props: DefaultIconProps) => (
  <ButtonIcon
    className={classnames(styles.settingsIcon, props.className)}
    disabled={props.disabled}
    onClick={props.onClick}
    image={backSvg}
    data-test-id={props.dataTestId}
  />
);

export const AccountIcon = (props: DefaultIconProps) => (
  <ButtonIcon
    className={classnames(styles.accountIcon, props.className)}
    disabled={props.disabled}
    onClick={props.onClick}
    image={accountSvg}
    data-test-id={props.dataTestId}
  />
);
