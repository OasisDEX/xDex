// from https://github.com/livnev/cdp-balance/blob/master/balance.py
// tslint:disable:max-line-length
import { BigNumber } from 'bignumber.js';
import { sum } from 'lodash';
import * as mathjs from 'mathjs';
import { zero } from '../../utils/zero';

export function balance(
  targetDebt: BigNumber,
  assets: Array<{
    name: string,
    debt: BigNumber,
    balance: BigNumber,
    referencePrice: BigNumber,
    safeCollRatio: BigNumber,
  }>
): BigNumber[] {

  const names = assets.map(a => a.name);
  const inks = assets.map(a => a.balance.toNumber());
  const tags = assets.map(a => a.referencePrice.toNumber());
  const mats = assets.map(a => a.safeCollRatio.toNumber());
  const sigmas = [0.9, 0.1];

  const f = makeRiskParityObjective(inks, tags, mats, sigmas);

  const D = targetDebt.toNumber();
  const scale = (tabz: number[]) => tabz.map(tab => D * tab / sum(tabz));

  const [tabs, loss, iter] =
    optimiseByAnnealing(
      f,
      assets.length,
      { scale, tol: .0000001, max_iter: 100000 });

  console.log('balance', { D, names, inks, tags, mats, sigmas, tabs, loss, iter });

  const tabsRounded = tabs.map(tab => new BigNumber(tab).decimalPlaces(2));

  const tabsTotalRounded: BigNumber =
    tabsRounded.reduce((s, tab) => s.plus(tab), zero);

  const roundingCorrection = targetDebt.minus(tabsTotalRounded);

  console.log('rounding correction',
              targetDebt.toString(),
              tabsTotalRounded.toString(),
              roundingCorrection.toString());

  const deltas = tabsRounded.map((tab, i) => {
    return tab
    .minus(assets[i].debt)
    .minus(i === (tabs.length - 1) ? roundingCorrection : zero);
  });

  console.log(deltas.map(d => d.toString()));

  return deltas;
}

function cumulativeNormal(x: number, mu: number = 0, sigma: number = 1.0) {
  return 0.5 * (1 + (mathjs.erf((x - mu) / (Math.sqrt(2) * sigma)) as number));
}

function liquidationProbability(ink: number, tab: number, tag: number, mat: number, sigma: number) {
  // assumes normal distribution of returns over period
  // return to liquidation:
  const hit = mat / (ink * tag / tab) - 1;
  return cumulativeNormal(hit, 0, sigma);
}

function makeRiskParityObjective(
  inks: number[],
  tags: number[],
  mats: number[],
  sigmas: number[]
): (x: number[]) => number {
  function lp(tab: number, i: number) {
    return liquidationProbability(inks[i], tab, tags[i], mats[i], sigmas[i]);
  }
  return (tabs: number[]) =>
    sum([...tabs.keys()].map((i) =>
      sum([...tabs.keys()].map(
        j => j >= i ?
          0 :
          Math.abs(lp(tabs[i], i) - lp(tabs[j], j))
      ))
    ));
}

function randomNormal(x: number, sigma: number): number {
  function boxmuller() {
    let u = 0;
    let v = 0;
    while (u === 0) u = Math.random(); // Converting [0,1) to (0,1)
    while (v === 0) v = Math.random();
    return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  }
  return x + boxmuller() * sigma;
}

function neighbour(xs: number[], sigma: number = 0.1): number[] {
  // geometric brownian step
  return xs.map(x => x * (1 + randomNormal(0, sigma)));
}

function optimiseByAnnealing(
  f: (x: number[]) => number,
  n: number,
  {
    init = null,
    scale = (x: number[]): number[] => x,
    tol = 1,
    max_iter = 1000,
    init_temperature = 100.0,
    cool = 0.999
  } = {}
): [number[], number, number] {
  // tslint:disable:prefer-array-literal
  let xs: number[] = scale(init || new Array(n).fill(1));
  let temperature = init_temperature;
  let loss;
  let i = 0;
  for (; i < max_iter; i += 1) {
    loss = f(xs);
    if (loss < tol) break;
    const candidate = scale(neighbour(xs));
    const candidate_loss = f(candidate);
    if (candidate_loss < loss) {
      xs = candidate;
    } else {
      if (Math.random() < Math.exp(-(candidate_loss - loss) / temperature)) {
        xs = candidate;
      }
    }
    temperature *= cool;
  }
  return [xs, loss as number, i];
}

export function do_example_with_2() {
  // ETH and DGX
  const gems = ['ETH', 'DGX'];
  const tags = [420., 38.];
  const inks = [10., 100.];
  const mats = [1.5, 1.1];
  const sigmas = [0.2, 0.1];
  const f = makeRiskParityObjective(inks, tags, mats, sigmas);
  // target debt: 3000 dai
  const D = 3000;
  const [tabs, loss, iter] = optimiseByAnnealing(f, 2, {
    scale: tabz => tabz.map(tab => D * tab / sum(tabz)), tol: .0000001, max_iter: 100000
  });
  console.log({ loss, iter });
  gems.forEach((gem, i) => {
    console.log(`${gem} CDP: tab=${tabs[i]}`);
    console.log(`(collateral ratio=${inks[i] * tags[i] / tabs[i]}, liquidation probability=${liquidationProbability(inks[i], tabs[i], tags[i], mats[i], sigmas[i])})`);
  });

  // simple solution
  console.log('---');
  const om = [2.2, 1];
  const psi = sum(gems.map((_gem, i) => inks[i] * tags[i] / mats[i] / om[i])) / D;
  const tabs2 = gems.map((_gem, i) => inks[i] * tags[i] / mats[i] / om[i] / psi);
  gems.forEach((gem, i) => {
    console.log(`${gem} CDP: tab=${tabs2[i]}`);
    console.log(`(collateral ratio=${inks[i] * tags[i] / tabs2[i]}, liquidation probability=${liquidationProbability(inks[i], tabs2[i], tags[i], mats[i], sigmas[i])})`);
  });
}
//
// do_example_with_2();
