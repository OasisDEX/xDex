/*
 * Copyright (C) 2020 Maker Ecosystem Growth Holdings, INC.
 */

function padBytes(web3: any, calldata: string) {
  return web3.utils.padRight(calldata, Math.ceil(calldata.length / 32) * 32);
}

/**
 * We need to align build string so web3 will convert it to bytes later.
 * This might be avoided if we build whole calldata manually but since we want to avoid it this
 * is the only way.
 * Also, this forced us to add additional check in tx-manager to skip ill formatted calldata
 */
export function buildCalls(web3: any, calls: Array<{ address: string; calldata: any }>) {
  let finalCalldata = '';
  for (const call of calls) {
    const calldata = call.calldata.encodeABI().slice(2);

    /* tslint:disable */
    finalCalldata +=
      call.address.slice(2) + web3.eth.abi.encodeParameter('uint256', calldata.length / 2).slice(2) + calldata;
  }

  return '0x' + padBytes(web3, finalCalldata);
  /* tslint:enable */
}
