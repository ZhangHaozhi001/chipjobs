/**
 * ChipJobs data layer — read-only access to TapeOut on X Layer mainnet.
 *
 * Dependency-free minimal JSON-RPC client (works in Node and in the browser,
 * including inside the TapeKit/DeWEB context where bundling ethers is not an
 * option). Reads that matter (processor count / addresses / circuit owners)
 * are cross-checked across two independent RPC operators (OKX + dRPC) and
 * must agree — the same dual-node rule the validation report used.
 *
 * TapeOut is NOT deployed on any testnet, so this layer only ever reads
 * mainnet. It cannot send transactions.
 */

export const XLAYER = Object.freeze({
  chainId: 196,
  factory: '0x1f09daefa827f02cbb40967cc91b259763760761',
  rpcs: Object.freeze([
    'https://rpc.xlayer.tech',   // OKX
    'https://xlayer.drpc.org',   // dRPC
  ]),
});

// Function selectors (keccak256(signature)[0:4]) — identical to TapeKit kernel SEL.
export const SEL = Object.freeze({
  cpuCount: '0xa94da8a7',
  cpuAt: '0x4bc7cbbd',
  isCPU: '0x5f5a364f',
  ownerOf: '0x6352211e',
  name: '0x06fdde03',
});

const pad32 = (hex) => hex.replace(/^0x/, '').padStart(64, '0');
export const encUint = (v) => pad32(BigInt(v).toString(16));
export const encAddr = (a) => pad32(a.toLowerCase());
export const decUint = (hex) => BigInt(hex);
export const decAddr = (hex) => '0x' + hex.slice(-40);
export function decString(hex) {
  const h = hex.replace(/^0x/, '');
  const len = Number(BigInt('0x' + h.slice(64, 128)));
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = parseInt(h.slice(128 + i * 2, 130 + i * 2), 16);
  return new TextDecoder().decode(bytes);
}

async function rpcCall(url, to, data, fetchImpl = fetch) {
  const res = await fetchImpl(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'eth_call', params: [{ to, data }, 'latest'] }),
  });
  const j = await res.json();
  if (j.error) throw new Error(`rpc ${url}: ${j.error.message || JSON.stringify(j.error)}`);
  return j.result;
}

/** Call the same eth_call on every configured RPC and require identical results. */
export async function callConsensus(to, data, { rpcs = XLAYER.rpcs, fetchImpl } = {}) {
  const results = await Promise.all(rpcs.map((u) => rpcCall(u, to, data, fetchImpl)));
  const first = results[0].toLowerCase();
  if (!results.every((r) => r.toLowerCase() === first)) {
    throw new Error(`RPC disagreement for call to ${to}: ${results.join(' vs ')}`);
  }
  return results[0];
}

export async function getCpuCount(opts) {
  return Number(decUint(await callConsensus(XLAYER.factory, SEL.cpuCount, opts)));
}

export async function getCpuAt(index, opts) {
  return decAddr(await callConsensus(XLAYER.factory, SEL.cpuAt + encUint(index), opts));
}

export async function isCPU(address, opts) {
  const r = await callConsensus(XLAYER.factory, SEL.isCPU + encAddr(address), opts);
  return decUint(r) !== 0n;
}

export async function getProcessorName(cpuAddress, opts) {
  return decString(await callConsensus(cpuAddress, SEL.name, opts));
}

/** Owner of circuit #circuitId on processor contract cpuAddress; null when the #ID does not exist. */
export async function getCircuitOwner(cpuAddress, circuitId, opts) {
  try {
    return decAddr(await callConsensus(cpuAddress, SEL.ownerOf + encUint(circuitId), opts));
  } catch {
    return null; // ownerOf reverts for a missing #ID (on at least one node the call errors)
  }
}

/**
 * The ChipJobs verification predicate, mirrored 1:1 in ChipJobsEscrow.verifyCircuit:
 * processor index in range -> processor is a real TapeOut CPU -> circuit exists
 * and is held by `expectedOwner`.
 */
export async function verifyCircuit(cpuIndex, circuitId, expectedOwner, opts) {
  const count = await getCpuCount(opts);
  if (cpuIndex >= count) return { ok: false, reason: 'no-such-cpu', count };
  const cpu = await getCpuAt(cpuIndex, opts);
  if (!(await isCPU(cpu, opts))) return { ok: false, reason: 'not-tapeout', cpu };
  const owner = await getCircuitOwner(cpu, circuitId, opts);
  if (owner === null) return { ok: false, reason: 'no-such-circuit', cpu };
  if (owner.toLowerCase() !== expectedOwner.toLowerCase()) return { ok: false, reason: 'not-owner', cpu, owner };
  return { ok: true, cpu, owner };
}

/** List processors [from, to) with names — used by the bounty board UI. */
export async function listProcessors(from = 0, to, opts) {
  const count = await getCpuCount(opts);
  const end = Math.min(to ?? count, count);
  const out = [];
  for (let i = from; i < end; i++) {
    const address = await getCpuAt(i, opts);
    let name = '';
    try { name = await getProcessorName(address, opts); } catch { /* name is display-only */ }
    out.push({ index: i, address, name });
  }
  return { count, processors: out };
}
