// Local end-to-end demo of the ChipJobs core loop on an in-process chain.
// Run: npm run demo:local
import { ethers } from 'ethers';
import { createHash } from 'node:crypto';
import { startLocalStack, eth, balAt, freshBlock } from './local-chain.js';

const fmt = (v) => ethers.formatEther(v) + ' OKB(local)';
const now = () => Math.floor(Date.now() / 1000);

const s = await startLocalStack();
const { escrow, cpu0, poster, designer, feeRecipient, provider } = s;
console.log('== ChipJobs local demo ==');
console.log('escrow:', await escrow.getAddress());

// Designer tapes out circuit #7 on processor 0 (mock mint = the local stand-in
// for the tapeout.net flow; the real mint is a user-wallet step, see M1-REPORT).
await (await cpu0.mint(designer.address, 7)).wait();
console.log('designer holds circuit #7 on processor 0');

// 1) Poster posts a 10 OKB bounty for processor 0, 1h deadline.
const specHash = '0x' + createHash('sha256').update('8-bit comparator, tapeout on DemoCPU-8bit, datasheet v1').digest('hex');
const postTx = await escrow.connect(poster).postBounty(specHash, now() + 3600, 0, false, { value: eth('10') });
await postTx.wait();
console.log('bounty #0 posted: 10 OKB locked, spec', specHash.slice(0, 18) + '…');

// 2) Designer submits (cpu 0, circuit #7) -> auto-release 95/5.
const blk0 = await freshBlock(provider);
const dBefore = await balAt(provider, designer.address, blk0);
const fBefore = await balAt(provider, feeRecipient.address, blk0);
const claimRc = await (await escrow.connect(designer).submitAndClaim(0, 0, 7)).wait();
const dAfter = await balAt(provider, designer.address, claimRc.blockNumber);
const fAfter = await balAt(provider, feeRecipient.address, claimRc.blockNumber);
const b0 = await escrow.getBounty(0);
console.log(`claimed: designer +${fmt(dAfter - dBefore)} (net of gas), fee +${fmt(fAfter - fBefore)}, status=${b0.status} (1=Filled), solver=${b0.solver === designer.address}`);

// 3) Second bounty expires unclaimed -> full refund to poster.
await (await escrow.connect(poster).postBounty(specHash, now() + 2, 0, false, { value: eth('3') })).wait();
await provider.send('evm_increaseTime', [10]);
await provider.send('evm_mine', []);
const pBefore = await balAt(provider, poster.address, await freshBlock(provider));
const rrc = await (await escrow.connect(s.stranger).refundExpired(1)).wait();
const pAfter = await balAt(provider, poster.address, rrc.blockNumber);
console.log(`expired bounty #1 refunded by a third party: poster +${fmt(pAfter - pBefore)} (full 3 OKB; the trigger paid the gas)`);

// 4) Third bounty cancelled by poster while open.
await (await escrow.connect(poster).postBounty(specHash, now() + 3600, 1, false, { value: eth('1') })).wait();
await (await escrow.connect(poster).cancel(2)).wait();
console.log('bounty #2 cancelled by poster, status =', (await escrow.getBounty(2)).status.toString(), '(3=Cancelled)');

console.log('escrow residual balance:', fmt(await provider.getBalance(await escrow.getAddress())));
console.log('== demo OK ==');
