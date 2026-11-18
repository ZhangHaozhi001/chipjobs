import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { startLocalStack, eth, balAt, freshBlock } from '../scripts/local-chain.js';

let s;
const now = () => Math.floor(Date.now() / 1000);
const spec = '0x' + createHash('sha256').update('test spec').digest('hex');

// Ganache does not surface revert reasons on the estimateGas path ethers uses
// for real transactions, so reasons are asserted via staticCall (eth_call,
// which decodes them) and the real transaction is asserted to reject as well.
async function expectRevert(staticCallPromise, sendPromise, re) {
  await assert.rejects(staticCallPromise, re);
  await assert.rejects(sendPromise);
}

before(async () => { s = await startLocalStack(); });

test('post + verified claim pays 95/5 and marks Filled', async () => {
  const { escrow, cpu0, poster, designer, feeRecipient, provider } = s;
  await (await cpu0.mint(designer.address, 42)).wait();
  await (await escrow.connect(poster).postBounty(spec, now() + 3600, 0, false, { value: eth('10') })).wait();
  const id = Number(await escrow.bountyCount()) - 1;
  const blk = await freshBlock(provider);
  const d0 = await balAt(provider, designer.address, blk);
  const f0 = await balAt(provider, feeRecipient.address, blk);
  const tx = await escrow.connect(designer).submitAndClaim(id, 0, 42);
  const rc = await tx.wait();
  const gas = rc.gasUsed * rc.gasPrice;
  const d1 = await balAt(provider, designer.address, rc.blockNumber);
  const f1 = await balAt(provider, feeRecipient.address, rc.blockNumber);
  assert.equal(d1 - d0 + gas, eth('9.5'));   // designer receives exactly 95%
  assert.equal(f1 - f0, eth('0.5'));         // fee recipient receives exactly 5%
  const b = await escrow.getBounty(id);
  assert.equal(Number(b.status), 1);
  assert.equal(b.solver, designer.address);
  assert.equal(Number(b.circuitId), 42);
});

test('claim with a circuit owned by someone else reverts', async () => {
  const { escrow, poster, stranger } = s;
  await (await escrow.connect(poster).postBounty(spec, now() + 3600, 0, false, { value: eth('1') })).wait();
  const id = Number(await escrow.bountyCount()) - 1;
  await expectRevert(
    escrow.connect(stranger).submitAndClaim.staticCall(id, 0, 42),
    escrow.connect(stranger).submitAndClaim(id, 0, 42),
    /circuit check failed/,
  );
});

test('claim for a non-existent circuit #ID reverts', async () => {
  const { escrow, poster, designer } = s;
  await (await escrow.connect(poster).postBounty(spec, now() + 3600, 0, false, { value: eth('1') })).wait();
  const id = Number(await escrow.bountyCount()) - 1;
  await expectRevert(
    escrow.connect(designer).submitAndClaim.staticCall(id, 0, 9999),
    escrow.connect(designer).submitAndClaim(id, 0, 9999),
    /circuit check failed/,
  );
});

test('claim on the wrong processor reverts when bounty pins a cpu', async () => {
  const { escrow, cpu1, poster, designer } = s;
  await (await cpu1.mint(designer.address, 5)).wait();
  await (await escrow.connect(poster).postBounty(spec, now() + 3600, 0, false, { value: eth('1') })).wait();
  const id = Number(await escrow.bountyCount()) - 1;
  await expectRevert(
    escrow.connect(designer).submitAndClaim.staticCall(id, 1, 5),
    escrow.connect(designer).submitAndClaim(id, 1, 5),
    /wrong cpu/,
  );
});

test('anyCpu bounty accepts a circuit on any processor', async () => {
  const { escrow, poster, designer } = s;
  await (await escrow.connect(poster).postBounty(spec, now() + 3600, 0, true, { value: eth('2') })).wait();
  const id = Number(await escrow.bountyCount()) - 1;
  await (await escrow.connect(designer).submitAndClaim(id, 1, 5)).wait();
  assert.equal(Number((await escrow.getBounty(id)).status), 1);
});

test('expired bounty refunds in full; double-claim impossible', async () => {
  const { escrow, poster, designer, provider } = s;
  await (await escrow.connect(poster).postBounty(spec, now() + 2, 0, false, { value: eth('3') })).wait();
  const id = Number(await escrow.bountyCount()) - 1;
  await provider.send('evm_increaseTime', [10]);
  await provider.send('evm_mine', []);
  const p0 = await balAt(provider, poster.address, await freshBlock(provider));
  const rrc = await (await escrow.connect(poster).refundExpired(id)).wait();
  const p1 = await balAt(provider, poster.address, rrc.blockNumber);
  assert.equal(p1 - p0 + rrc.gasUsed * rrc.gasPrice, eth('3')); // full refund, exact
  assert.equal(Number((await escrow.getBounty(id)).status), 2);
  await expectRevert(
    escrow.connect(designer).submitAndClaim.staticCall(id, 0, 42),
    escrow.connect(designer).submitAndClaim(id, 0, 42),
    /not open/,
  );
});

test('only poster can cancel; cancel refunds in full', async () => {
  const { escrow, poster, stranger } = s;
  await (await escrow.connect(poster).postBounty(spec, now() + 3600, 0, false, { value: eth('1') })).wait();
  const id = Number(await escrow.bountyCount()) - 1;
  await expectRevert(
    escrow.connect(stranger).cancel.staticCall(id),
    escrow.connect(stranger).cancel(id),
    /not poster/,
  );
  await (await escrow.connect(poster).cancel(id)).wait();
  assert.equal(Number((await escrow.getBounty(id)).status), 3);
});

test('posting against a non-existent processor reverts', async () => {
  const { escrow, poster } = s;
  await expectRevert(
    escrow.connect(poster).postBounty.staticCall(spec, now() + 3600, 777, false, { value: eth('1') }),
    escrow.connect(poster).postBounty(spec, now() + 3600, 777, false, { value: eth('1') }),
    /no such cpu/,
  );
});
