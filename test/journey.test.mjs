import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runJourney } from '../scripts/demo-journey.js';
import { parseClaimInput, tapeoutEntryFor } from '../src/tapekit-site/tapeout-flow.js';
import { encodePostBounty } from '../src/data/escrow-write.js';

test('full journey through the site modules completes', async () => {
  const logs = [];
  const r = await runJourney((m) => logs.push(m));
  assert.match(r.claimHash, /^0x[0-9a-f]{64}$/);
  assert.match(r.refundHash, /^0x[0-9a-f]{64}$/);
  assert.ok(logs.some((l) => l.includes('designer net +9.5 OKB')));
  assert.ok(logs.some((l) => l.includes('poster +3.0 OKB')));
});

test('claim input validation (the paste-back seam)', () => {
  assert.deepEqual(parseClaimInput('0', '7'), { ok: true, cpuIndex: 0, circuitId: 7 });
  assert.equal(parseClaimInput('-1', '7').ok, false);
  assert.equal(parseClaimInput('0', '0').ok, false);   // #ID starts at 1
  assert.equal(parseClaimInput('x', '7').ok, false);
});

test('tape-out entry instructions respect the pinned processor', () => {
  const pinned = tapeoutEntryFor({ anyCpu: false, cpuIndex: 3 });
  assert.ok(pinned.instructions.some((t) => t.includes('processor #3')));
  const any = tapeoutEntryFor({ anyCpu: true });
  assert.ok(any.instructions.some((t) => t.includes('any processor')));
});

test('postBounty encoding shape', () => {
  const data = encodePostBounty({ specHash: '0x' + 'ab'.repeat(32), deadline: 123, cpuIndex: 2, anyCpu: true });
  assert.equal(data.length, 2 + 8 + 64 * 4); // 0x + selector + 4 words
  assert.ok(data.startsWith('0x5b828e5e'));
});
