import { BigNumber } from 'bignumber.js';
import { Allowances } from '../balances-nomt/balances';

import { setupFakeWeb3ForTesting } from '../blockchain/web3';
setupFakeWeb3ForTesting();

import { tokens } from '../blockchain/config';
import { getCashCore, getMarginableCore, getMTAccount } from '../marginTrading/state/mtTestUtils';
import { Balances, combineBalances, CombinedBalances } from './balances';

const defaultCash = getCashCore({
  name: 'DAI',
  balance: new BigNumber(0),
  walletBalance: new BigNumber(0),
  allowance: false,
});

const defaultMta = getMTAccount({
  cash: defaultCash,
});

const defaultBalances: Balances = {
  DAI: new BigNumber(0),
  MKR: new BigNumber(0),
  DGX: new BigNumber(0),
  WETH: new BigNumber(0),
};

const defaultAllowances: Allowances = {
  DAI: true,
  MKR: true,
  DGX: true,
  WETH: true,
};

interface TokenAssertion {
  name: string;
  walletBalance: BigNumber;
  marginBalance: BigNumber | undefined | 'empty';  // empty means undefined or 0
  mtAssetValueInDAI: BigNumber;
}

declare global {
  namespace jest {
    // tslint:disable-next-line:interface-name
    interface Matchers<R> {
      toMatchMtAssetValueInDAI(ta: TokenAssertion): R;
      toBeDefinedTokenData(ta: TokenAssertion): R;
      toMatchMarginBalance(ta: TokenAssertion): R;
      toMatchWalletBalance(ta: TokenAssertion): R;
    }
  }
}

// Extend expect mainly to make custom error messages
expect.extend({
  toMatchWalletBalance(received, ta: TokenAssertion) {
    const pass = received && received.walletBalance &&
      received.walletBalance.isEqualTo(ta.walletBalance);

    if (pass) {
      return {
        message: () =>
          `expected for ${ta.name} wallet in dai ${received.walletBalance
        } to be different than ${ta.walletBalance}`,
        pass: true,
      };
    }

    return {
      message: () =>
          `expected for ${ta.name} wallet in dai ${received.walletBalance
            } to be equal ${ta.walletBalance}`,
      pass: false,
    };
  },
  toMatchMtAssetValueInDAI(received, ta: TokenAssertion) {
    const totalPass = received && received.mtAssetValueInDAI &&
      received.mtAssetValueInDAI.isEqualTo(ta.mtAssetValueInDAI);

    if (totalPass) {
      return {
        message: () =>
          `expected for ${ta.name} asset value in dai ${received.mtAssetValueInDAI
        } to be different that ${ta.mtAssetValueInDAI}`,
        pass: true,
      };
    }

    return {
      message: () =>
          `expected for ${ta.name} asset value in dai ${received.mtAssetValueInDAI
            } to be equal ${ta.mtAssetValueInDAI}`,
      pass: false,
    };
  },
  toBeDefinedTokenData(received, ta: TokenAssertion) {
    if (received) {
      return {
        message: () =>
          `expected token for ${ta.name} to be undefined`,
        pass: true,
      };
    }

    return {
      message: () =>
        `expected token for ${ta.name} to be defined`,
      pass: false,
    };
  },
  toMatchMarginBalance(received, ta: TokenAssertion) {
    if (ta.marginBalance === undefined) {
      if (received.asset === undefined) {
        return {
          message: () =>
            `expected asset for ${ta.name} to be defined`,
          pass: true,
        };
      }
      return {
        message: () =>
          `expected token for ${ta.name} to be undefined`,
        pass: false,
      };
    }
    if (ta.marginBalance === 'empty') {
      if (received.asset === undefined || received.asset.balance.isEqualTo(new BigNumber(0))) {
        return {
          message: () =>
            `expected asset for ${ta.name} to be defined or marginBalance not to be zero`,
          pass: true,
        };
      }
      return {
        message: () =>
          `expected asset for ${ta.name} to be undefined or marginBalance to be zero`,
        pass: false,
      };
    }
    if (received.asset && received.asset.balance.isEqualTo(ta.marginBalance)) {
      return {
        message: () =>
          `expected asset.balance for ${ta.name} ${received.asset.balance.toString()
        } to be different than ${ta.marginBalance && ta.marginBalance.toString()}`,
        pass: true,
      };
    }
    return {
      message: () =>
        `expected asset.balance for ${ta.name} ${received.asset.balance.toString()
          } to be equal ${ta.marginBalance && ta.marginBalance.toString()}`,
      pass: true,
    };
  },
});

function assertTokens(cb: CombinedBalances,
                      tokensAssertions: TokenAssertion[]) {
  // given tokens should exist and have proper wallet,
  // margin (asset.balance), mtAssetValueInDAI values
  tokensAssertions.forEach(ta =>
    assertToken(cb, ta)
  );
  // all tokens not given in tokensAssertion should have values:
  // wallet 0, margin (asset.balance) 0 or undefined, totalIndDAI 0
  Object.keys(tokens)
    .filter(token => tokensAssertions.findIndex(ta => ta.name === token) < 0)
    .forEach(name  =>
      assertToken(cb, { name,
        walletBalance: new BigNumber(0),
        marginBalance: 'empty',
        mtAssetValueInDAI: new BigNumber(0) })
    );
}

function assertToken(cb: CombinedBalances, ta: TokenAssertion) {
  const tokenData = cb.balances.find(b => b.name === ta.name);

  expect(tokenData).toBeDefinedTokenData(ta);
  if (tokenData === undefined) {
    return;
  }

  expect(tokenData).toMatchWalletBalance(ta);
  expect(tokenData).toMatchMarginBalance(ta);
  expect(tokenData).toMatchMtAssetValueInDAI(ta);
}

// ---------------- zeros -----------------------
test('zeros balances and mta', () => {
  const cb = combineBalances(new BigNumber(0), defaultBalances, defaultAllowances, defaultMta);

  assertTokens(cb, []);
});

// ---------------- empty MTA -------------------
test('balances with DAI and empty mta', () => {
  const balance = {
    ...defaultBalances,
    DAI: new BigNumber(2),
  } as Balances;
  const cb = combineBalances(new BigNumber(0), balance, defaultAllowances, defaultMta);

  assertTokens(cb, [{
    name: 'DAI',
    walletBalance: new BigNumber(2),
    marginBalance: new BigNumber(0),
    mtAssetValueInDAI: new BigNumber(0)
  }]);
});

test('balances with DAI and WETH and empty mta', () => {
  const balance = {
    ...defaultBalances,
    DAI: new BigNumber(2),
    WETH: new BigNumber(5),
  } as Balances;
  const cb = combineBalances(new BigNumber(0), balance, defaultAllowances, defaultMta);

  assertTokens(cb, [{
    name: 'DAI',
    walletBalance: new BigNumber(2),
    marginBalance: new BigNumber(0),
    mtAssetValueInDAI: new BigNumber(0),
  }, {
    name: 'WETH',
    walletBalance: new BigNumber(5),
    marginBalance: new BigNumber(0),
    mtAssetValueInDAI: new BigNumber(0),
  }]);
});

// ---------------- empty balances -------------------
test('balances with empty balances and mta with DAI cash', () => {
  const mta = getMTAccount({
    cash: getCashCore({
      balance: new BigNumber(4)
    }),
  });
  const cb = combineBalances(new BigNumber(0), defaultBalances, defaultAllowances, mta);
  assertTokens(cb, [{
    name: 'DAI',
    walletBalance: new BigNumber(0),
    marginBalance: new BigNumber(4),
    mtAssetValueInDAI: new BigNumber(4),
  },
  ]);
});

// ---------------- nonempty balances and mta -------------------
test('balances with DAI and WETH and mta with DAI cash', () => {
  const balance = {
    ...defaultBalances,
    DAI: new BigNumber(2),
    WETH: new BigNumber(5),
  } as Balances;
  const mta = getMTAccount({
    cash: getCashCore({
      balance: new BigNumber(4)
    }),
  });

  const cb = combineBalances(new BigNumber(0), balance, defaultAllowances, mta);
  assertTokens(cb, [{
    name: 'DAI',
    walletBalance: new BigNumber(2),
    marginBalance: new BigNumber(4),
    mtAssetValueInDAI: new BigNumber(4),
  }, {
    name: 'WETH',
    walletBalance: new BigNumber(5),
    marginBalance: new BigNumber(0),
    mtAssetValueInDAI: new BigNumber(0),
  }]);
});

test('balances with DAI and WETH and mta with WETH marginable asset', () => {
  const balance = {
    ...defaultBalances,
    DAI: new BigNumber(2),
    WETH: new BigNumber(5),
  } as Balances;
  const mta = getMTAccount({
    cash: defaultCash,
    marginableAssets: [getMarginableCore({
      name: 'WETH',
      balance: new BigNumber(3),
      referencePrice: new BigNumber(10),
    })]
  });
  const cb = combineBalances(new BigNumber(0), balance, defaultAllowances, mta);
  assertTokens(cb, [{
    name: 'DAI',
    walletBalance: new BigNumber(2),
    marginBalance: new BigNumber(0),
    mtAssetValueInDAI: new BigNumber(0),
  }, {
    name: 'WETH',
    walletBalance: new BigNumber(5),
    marginBalance: new BigNumber(3),
    mtAssetValueInDAI: new BigNumber(30),
  }]);
});

test('balances with DAI and WETH and mta with DAI cash and ETH marginable asset', () => {
  const balance = {
    ...defaultBalances,
    DAI: new BigNumber(2),
    WETH: new BigNumber(5),
  } as Balances;
  const mta = getMTAccount({
    cash: getCashCore({
      balance: new BigNumber(4),
    }),
    marginableAssets: [
      getMarginableCore({
        name: 'ETH',
        balance: new BigNumber(1),
        referencePrice: new BigNumber(10),
      }),
    ]
  });

  const cb = combineBalances(new BigNumber(0), balance, defaultAllowances, mta);
  assertTokens(cb, [{
    name: 'ETH',
    walletBalance: new BigNumber(0),
    marginBalance: new BigNumber(1),
    mtAssetValueInDAI: new BigNumber(10),
  }, {
    name: 'DAI',
    walletBalance: new BigNumber(2),
    marginBalance: new BigNumber(4),
    mtAssetValueInDAI: new BigNumber(4),
  }, {
    name: 'WETH',
    walletBalance: new BigNumber(5),
    marginBalance: new BigNumber(0),
    mtAssetValueInDAI: new BigNumber(0),
  }]);
});

test('balances with WETH and ETH and mta with DAI cash', () => {
  const balance = {
    ...defaultBalances,
    WETH: new BigNumber(12),
  } as Balances;
  const mta = getMTAccount({
    cash: getCashCore({
      balance: new BigNumber(71),
    }),
  });

  const cb = combineBalances(new BigNumber(421), balance, defaultAllowances, mta);
  assertTokens(cb, [{
    name: 'DAI',
    walletBalance: new BigNumber(0),
    marginBalance: new BigNumber(71),
    mtAssetValueInDAI: new BigNumber(71),
  }, {
    name: 'WETH',
    walletBalance: new BigNumber(12),
    marginBalance: new BigNumber(0),
    mtAssetValueInDAI: new BigNumber(0),
  }, {
    name: 'ETH',
    walletBalance: new BigNumber(421),
    marginBalance: new BigNumber(0),
    mtAssetValueInDAI: new BigNumber(0),
  }]);
});
