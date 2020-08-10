/*
 * Copyright (C) 2020 Maker Ecosystem Growth Holdings, INC.
 */

import * as classnames from 'classnames';
import * as React from 'react';
import chevronDownSvg from '../icons/chevron-down.svg';
import dottedMenuSvg from '../marginTrading/positions/dotted-menu.svg';
import { Button } from '../utils/forms/Buttons';
import { SvgImage } from '../utils/icons/utils';
import * as styles from './mtBalancesView.scss';

interface AssetDropdownMenuProps {
  asset: string;
  actions: React.ReactNode[];
  withIcon?: boolean;
  label?: string;
  tid?: string;
}

export const AssetDropdownMenu = ({ asset, actions, withIcon, label, tid }: AssetDropdownMenuProps) => {
  const [isCollapsed, collapse] = React.useState(false);

  return (
    <div
      className={classnames(styles.dropdownMenu, isCollapsed && styles.hover)}
      data-test-id={tid}
      onMouseOver={() => collapse(true)}
      onMouseLeave={() => collapse(false)}
    >
      <Button size="md" color="secondaryOutlined" className={styles.dropdownButton}>
        {withIcon && <SvgImage image={dottedMenuSvg} />}
        {label && (
          <>
            <span>{label}</span>
            <SvgImage image={chevronDownSvg} className={classnames(styles.arrowDown, styles.dark)} />
          </>
        )}
      </Button>
      <div className={styles.dropdownList}>
        {actions.map((actionBtn, index) => (
          <div key={`${asset}-${index}`} className={styles.actionButton}>
            {actionBtn}
          </div>
        ))}
      </div>
    </div>
  );
};
