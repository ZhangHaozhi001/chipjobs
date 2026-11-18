/**
 * ChipJobs escrow read layer — dependency-free eth_call reader for
 * ChipJobsEscrow, companion to tapeout-data.js. Used by the board UI in both
 * https mode and tape:// (DeWEB) mode. Writes (post/claim/…) go through the
 * wallet adapter (see src/tapekit-site/tapekit-adapter.js), never through here.
 */
import { callConsensus, encUint, decUint, decAddr } from './tapeout-data.js';

export const ESCROW_SEL = Object.freeze({
  bountyCount: '0x3e362c96',
  getBounty: '0xee8c4bbf',
  verifyCircuit: '0x01de3f1a',
});

export const STATUS = ['Open', 'Filled', 'Refunded', 'Cancelled'];

const word = (hex, i) => hex.replace(/^0x/, '').slice(i * 64, i * 64 + 64);

/** Decode the Bounty struct returned by getBounty (all-static tuple). */
export function decodeBounty(hex) {
  const w = (i) => word(hex, i);
  return {
    poster: decAddr('0x' + w(0)),
    reward: decUint('0x' + w(1)),
    deadline: Number(decUint('0x' + w(2))),
    specHash: '0x' + w(3),
    cpuIndex: Number(decUint('0x' + w(4))),
    anyCpu: decUint('0x' + w(5)) !== 0n,
    status: STATUS[Number(decUint('0x' + w(6)))] ?? 'Unknown',
    solver: decAddr('0x' + w(7)),
    solvedCpu: Number(decUint('0x' + w(8))),
    circuitId: Number(decUint('0x' + w(9))),
  };
}

export async function getBountyCount(escrow, opts) {
  return Number(decUint(await callConsensus(escrow, ESCROW_SEL.bountyCount, opts)));
}

export async function getBounty(escrow, id, opts) {
  const raw = await callConsensus(escrow, ESCROW_SEL.getBounty + encUint(id), opts);
  return { id, ...decodeBounty(raw) };
}

export async function listBounties(escrow, opts) {
  const n = await getBountyCount(escrow, opts);
  const out = [];
  for (let i = 0; i < n; i++) out.push(await getBounty(escrow, i, opts));
  return out;
}
