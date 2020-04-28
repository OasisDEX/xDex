/*
 * Copyright (C) 2020 Maker Ecosystem Growth Holdings, INC.
 */

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
    <div className={classnames(styles.infoIcon, className)} {...otherProps}>
      i
    </div>
  );
};

export const ButtonIcon = (props: ButtonProps & { image: any }) => {
  const { className, image, ...otherProps } = props;
  return (
    <Button size="unsized" className={className} type="button" {...otherProps}>
      <SvgImage className={styles.btnIcon} image={image} />
    </Button>
  );
};

export type ProgressIconProps = React.HTMLAttributes<HTMLDivElement> & {
  light?: boolean;
  size?: 'sm' | 'lg';
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

export const SettingsIcon = (props: ButtonProps) => {
  const { className, ...other } = props;
  return (
    <ButtonIcon
      color="secondaryOutlined"
      type="button"
      className={classnames(styles.settingsIcon, className)}
      image={cogWheelSvg}
      {...other}
    />
  );
};

export const BackIcon = (props: ButtonProps) => {
  const { className, ...other } = props;
  return (
    <ButtonIcon
      color="secondaryOutlined"
      className={classnames(styles.backIcon, className)}
      image={backSvg}
      {...other}
    />
  );
};

export const AccountIcon = (props: ButtonProps) => {
  const { className, ...other } = props;
  return (
    <ButtonIcon
      color="secondaryOutlined"
      className={classnames(styles.accountIcon, className)}
      image={accountSvg}
      {...other}
    />
  );
};
