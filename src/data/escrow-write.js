/**
 * ChipJobs escrow write layer — builds and sends the three user transactions
 * (post / claim / refund / cancel) through any EIP-1193 provider: an injected
 * browser wallet in https mode, the TapeKit host wallet in tape mode, or an
 * ethers-backed shim in the local journey demo. ChipJobs itself never holds
 * keys and never signs.
 *
 * Encoding is done with the same dependency-free helpers as the read layer
 * (selectors are compile-time constants of ChipJobsEscrow).
 */
import { encUint, encAddr } from './tapeout-data.js';

export const WRITE_SEL = Object.freeze({
  postBounty: '0x5b828e5e',      // postBounty(bytes32,uint64,uint256,bool)
  submitAndClaim: '0x4d5e822e',  // submitAndClaim(uint256,uint256,uint256)
  refundExpired: '0x1402b17a',   // refundExpired(uint256)
  cancel: '0x40e58ee5',          // cancel(uint256)
});

const hex = (v) => '0x' + BigInt(v).toString(16);

async function send(eip1193, { from, to, data, value = 0n }) {
  const txHash = await eip1193.request({
    method: 'eth_sendTransaction',
    params: [{ from, to, data, value: hex(value) }],
  });
  return txHash;
}

export async function requestAccount(eip1193) {
  const [acct] = await eip1193.request({ method: 'eth_requestAccounts' });
  return acct;
}

/** specHash: 0x + 64 hex chars (hash of the off-chain spec document). */
export function encodePostBounty({ specHash, deadline, cpuIndex, anyCpu }) {
  const spec = specHash.replace(/^0x/, '').padStart(64, '0');
  return WRITE_SEL.postBounty + spec + encUint(deadline) + encUint(cpuIndex) + encUint(anyCpu ? 1 : 0);
}

export async function postBounty(eip1193, escrow, args, rewardWei) {
  const from = args.from ?? (await requestAccount(eip1193));
  return send(eip1193, { from, to: escrow, data: encodePostBounty(args), value: rewardWei });
}

export async function submitAndClaim(eip1193, escrow, { from, id, cpuIndex, circuitId }) {
  const acct = from ?? (await requestAccount(eip1193));
  const data = WRITE_SEL.submitAndClaim + encUint(id) + encUint(cpuIndex) + encUint(circuitId);
  return send(eip1193, { from: acct, to: escrow, data });
}

export async function refundExpired(eip1193, escrow, { from, id }) {
  const acct = from ?? (await requestAccount(eip1193));
  return send(eip1193, { from: acct, to: escrow, data: WRITE_SEL.refundExpired + encUint(id) });
}

export async function cancel(eip1193, escrow, { from, id }) {
  const acct = from ?? (await requestAccount(eip1193));
  return send(eip1193, { from: acct, to: escrow, data: WRITE_SEL.cancel + encUint(id) });
}

export { encAddr };
