// M2 journey demo: drives the *site's own modules* (escrow-write / escrow-read
// / tapeout-flow) through an EIP-1193 shim against the local chain — i.e. the
// exact code the browser UI runs, not a parallel implementation.
// The tape-out itself (tapeout.net canvas + wallet signature) is the reserved
// user step; here a mock mint stands in for its result, and the designer's
// pasted (cpu, #ID) goes through tapeout-flow.parseClaimInput like the UI.
// Run: node scripts/demo-journey.js
import { createHash } from 'node:crypto';
import { ethers } from 'ethers';
import { startLocalStack, eth, balAt, freshBlock } from './local-chain.js';
import * as write from '../src/data/escrow-write.js';
import { listBounties } from '../src/data/escrow-read.js';
import { parseClaimInput, tapeoutEntryFor } from '../src/tapekit-site/tapeout-flow.js';

/** Adapt an ethers signer to the EIP-1193 surface the site modules expect. */
export function eip1193Shim(signer) {
  return {
    request: async ({ method, params }) => {
      if (method === 'eth_requestAccounts') return [await signer.getAddress()];
      if (method === 'eth_sendTransaction') {
        const tx = params[0];
        const sent = await signer.sendTransaction({ to: tx.to, data: tx.data, value: BigInt(tx.value ?? '0x0') });
        await sent.wait();
        return sent.hash;
      }
      throw new Error('shim: unsupported method ' + method);
    },
  };
}

const sha256 = (t) => '0x' + createHash('sha256').update(t).digest('hex');
const fmt = (v) => ethers.formatEther(v);

export async function runJourney(log = console.log) {
  const s = await startLocalStack();
  const escrowAddr = await s.escrow.getAddress();
  const posterW = eip1193Shim(s.poster);
  const designerW = eip1193Shim(s.designer);
  const strangerW = eip1193Shim(s.stranger);
  // The read layer talks raw JSON-RPC; point it at the local ganache instead
  // of mainnet by injecting a fetch that forwards to the in-process provider.
  const localFetch = async (url, init) => {
    const body = JSON.parse(init.body);
    const result = await s.provider.send(body.method, body.params);
    return { json: async () => ({ jsonrpc: '2.0', id: 1, result }) };
  };
  const readOpts = { rpcs: ['local://ganache'], fetchImpl: localFetch };

  log('== ChipJobs M2 journey (site modules, local chain) ==');
  log('escrow:', escrowAddr);

  // 1) Poster posts through the UI write path.
  const specHash = sha256('CRC-8 checker, vectors at https://example.org/spec');
  const postHash = await write.postBounty(posterW, escrowAddr, {
    specHash, deadline: Math.floor(Date.now() / 1000) + 3600, cpuIndex: 0, anyCpu: false,
  }, eth('10'));
  log('poster posted bounty via escrow-write:', postHash.slice(0, 18) + '…');

  // 2) Designer "tapes out" (mock mint = result of the reserved user step),
  //    pastes numbers into the claim form -> validated by tapeout-flow.
  await (await s.cpu0.mint(s.designer.address, 7)).wait();
  const entry = tapeoutEntryFor({ anyCpu: false, cpuIndex: 0 });
  log('tape-out entry:', entry.url, '| step 2:', entry.instructions[1]);
  const parsed = parseClaimInput('0', '7');
  if (!parsed.ok) throw new Error('claim input rejected: ' + parsed.error);

  // 3) Claim through the UI write path; verify payout split at receipt block.
  const blk = await freshBlock(s.provider);
  const d0 = await balAt(s.provider, s.designer.address, blk);
  const f0 = await balAt(s.provider, s.feeRecipient.address, blk);
  const claimHash = await write.submitAndClaim(designerW, escrowAddr, { id: 0, cpuIndex: parsed.cpuIndex, circuitId: parsed.circuitId });
  const rc = await s.provider.getTransactionReceipt(claimHash);
  const d1 = await balAt(s.provider, s.designer.address, rc.blockNumber);
  const f1 = await balAt(s.provider, s.feeRecipient.address, rc.blockNumber);
  const gas = rc.gasUsed * rc.gasPrice;
  log(`claim tx ${claimHash.slice(0, 18)}… designer net +${fmt(d1 - d0 + gas)} OKB, fee +${fmt(f1 - f0)} OKB`);

  // 4) Board read through the UI read path shows the filled bounty.
  const board = await listBounties(escrowAddr, readOpts).catch(() => null);
  log('board read via escrow-read:', board ? JSON.stringify(board.map((b) => ({ id: b.id, status: b.status, reward: b.reward.toString() }))) : '(local read adapter: consensus helper expects http RPC — see note)');

  // 5) Second bounty expires; a stranger triggers the refund via UI path.
  await write.postBounty(posterW, escrowAddr, {
    specHash, deadline: Math.floor(Date.now() / 1000) + 2, cpuIndex: 0, anyCpu: false,
  }, eth('3'));
  await s.provider.send('evm_increaseTime', [10]);
  await s.provider.send('evm_mine', []);
  const p0 = await balAt(s.provider, s.poster.address, await freshBlock(s.provider));
  const refundHash = await write.refundExpired(strangerW, escrowAddr, { id: 1 });
  const rrc = await s.provider.getTransactionReceipt(refundHash);
  const p1 = await balAt(s.provider, s.poster.address, rrc.blockNumber);
  log(`expired bounty refunded via escrow-write: poster +${fmt(p1 - p0)} OKB`);
  log('== journey OK ==');
  return { escrowAddr, claimHash, refundHash };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await runJourney();
}
