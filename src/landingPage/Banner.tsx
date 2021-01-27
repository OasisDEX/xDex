/*
 * Copyright (C) 2020 Maker Ecosystem Growth Holdings, INC.
 */

import * as classnames from 'classnames';
import React, { useState } from 'react';
import { SvgImage } from 'src/utils/icons/utils';
import closeSvg from '../icons/close.svg';
import { Button } from '../utils/forms/Buttons';
import * as styles from './Banner.scss';

interface BannerProps {
  buttonLabel?: string | React.ReactNode;
  content: string | React.ReactNode;
  continue?: () => any;
  theme: 'success' | 'danger' | 'warning';
  isClosable?: boolean;
}

export const Banner = (props: BannerProps) => {
  const { content, continue: onContinue, buttonLabel, theme, isClosable } = props;

  const [isBannerHidden, setIsBannerHidden] = useState(false);

  return !isBannerHidden ? (
    <section className={styles.section}>
      <div className={classnames(styles.panel, styles[theme])}>
        <div>{content}</div>
        {buttonLabel && (
          <Button data-test-id="banner-btn" size="xs" className={styles.btn} onClick={onContinue}>
            {buttonLabel}
          </Button>
        )}
        {isClosable && (
          <div onClick={() => setIsBannerHidden(true)} style={{ position: 'absolute', top: '5px', right: '5px' }}>
            <SvgImage
              image={closeSvg}
              style={{ width: '24px', display: 'block', cursor: 'pointer', fill: '#546978' }}
            />
          </div>
        )}
      </div>
    </section>
  ) : null;
};
