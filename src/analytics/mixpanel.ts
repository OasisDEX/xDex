/*
 * Copyright (C) 2020 Maker Ecosystem Growth Holdings, INC.
 */

import * as mixpanel from 'mixpanel-browser';

const env = process.env.NODE_ENV === 'production' ? 'prod' : 'test';

const config = {
  test: {
    mixpanel: {
      token: 'b10b850880cb0a8557d878c2e6024d03',
      config: { debug: false, ip: false, api_host: 'https://mpp.oazolabs.xyz' },
    },
  },
  prod: {
    mixpanel: {
      token: 'a15aec2e0c806315e4646a120dfb7515',
      config: { ip: false, api_host: 'https://mpp.oazolabs.xyz' },
    },
  },
}[env];

export const mixpanelInit = () => {
  if (config.mixpanel.config.debug) {
    console.debug(`[Mixpanel] Tracking initialized for ${env} env using ${config.mixpanel.token}`);
  }
  mixpanel.init(config.mixpanel.token, config.mixpanel.config);
  mixpanel.track('Pageview', { product: 'oasis-trade' });
};

export const mixpanelIdentify = (id: string, props: any) => {
  // @ts-ignore
  if (!mixpanel.config) return;
  console.debug(
    `[Mixpanel] Identifying as ${id} ${props && props.walletType ? `using wallet ${props.walletType}` : ''}`,
  );
  mixpanel.identify(id.toLowerCase());
  if (props) mixpanel.people.set(props);
};
