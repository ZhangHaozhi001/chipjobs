/**
 * TapeKit / DeWEB adapter for ChipJobs.
 *
 * ChipJobs ships in two forms (see README):
 *  1. plain https site — reads go straight to X Layer RPC via src/data/*.
 *  2. tape:// DeWEB site — the same static bundle stored on-chain and rendered
 *     by the TapeKit kernel. When the kernel is present it exposes verified,
 *     multi-RPC reads; the adapter prefers it and falls back to direct RPC.
 *
 * Writes always require a user wallet. This adapter only defines the seam:
 * `getWallet()` returns an EIP-1193 provider when one is available (injected
 * in https mode; provided by the kernel/host in tape mode) or null in the
 * read-only skeleton. The tapeout (circuit mint) step on tapeout.net is a
 * user-wallet browser session by design — ChipJobs never signs for the user.
 */

export function detectEnvironment() {
  const proto = globalThis.location?.protocol ?? 'https:';
  const underKernel = proto === 'tape:' || typeof globalThis.tape !== 'undefined';
  return { mode: underKernel ? 'tape' : 'https', protocol: proto, underKernel };
}

/** Kernel handle when running under TapeKit, else null. Kernel API surface
 *  (from TapeKit kernel/src/kernel.js): cpuAt(cpu, block), cpuIndexOf(...),
 *  resolve(...), openSite(...). Reads in ChipJobs currently use the data
 *  layer directly; routing them through the kernel's consensus reader is the
 *  M3 hardening step and only requires swapping callConsensus below. */
export function getKernel() {
  return globalThis.tape ?? null;
}

export function getWallet() {
  return globalThis.ethereum ?? null; // EIP-1193 or null (read-only mode)
}

export const WALLET_REQUIRED_ACTIONS = Object.freeze([
  'deploy-escrow-mainnet',   // user wallet + OKB gas (see M1-REPORT leftover list)
  'post-bounty',             // poster signs + funds the reward
  'submit-and-claim',        // designer signs; circuit must already be theirs
  'tapeout-circuit',         // tapeout.net canvas session: draw circuit, sign, mint — user only
]);
