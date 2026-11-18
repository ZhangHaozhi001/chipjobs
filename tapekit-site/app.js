import { listProcessors } from '../data/tapeout-data.js';
import { listBounties } from '../data/escrow-read.js';
import * as write from '../data/escrow-write.js';
import { detectEnvironment, getWallet } from './tapekit-adapter.js';
import { tapeoutEntryFor, parseClaimInput } from './tapeout-flow.js';

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const log = (m) => { $('log').textContent = ($('log').textContent === '—' ? '' : $('log').textContent + '\n') + m; };

const env = detectEnvironment();
$('env-pill').textContent = `environment: ${env.mode}${env.underKernel ? ' (TapeKit kernel)' : ''}`;

const escrowAddr = new URLSearchParams(location.search).get('escrow');
let account = null;

async function refreshBoard() {
  if (!escrowAddr) {
    $('board').innerHTML = 'Escrow contract is compiled and locally verified; mainnet deployment is a pending user-wallet step. ' +
      'Open this page with <span class="mono">?escrow=0x…</span> after deployment to read the live board.';
    return;
  }
  const bounties = await listBounties(escrowAddr);
  $('board').innerHTML = bounties.length === 0
    ? 'No bounties yet — post the first one.'
    : '<table><tr><th>#</th><th>Reward (wei)</th><th>Processor</th><th>Deadline</th><th>Status</th><th></th></tr>' +
      bounties.map((b) => `<tr><td>${b.id}</td><td>${b.reward}</td><td>${b.anyCpu ? 'any' : b.cpuIndex}</td>` +
        `<td>${new Date(b.deadline * 1000).toISOString()}</td><td>${b.status}</td>` +
        `<td>${b.status === 'Open' && Date.now() / 1000 >= b.deadline ? `<button data-refund="${b.id}">Refund</button>` : ''}</td></tr>`).join('') +
      '</table>';
  for (const btn of document.querySelectorAll('[data-refund]')) {
    btn.onclick = async () => {
      try {
        const hash = await write.refundExpired(getWallet(), escrowAddr, { from: account, id: Number(btn.dataset.refund) });
        log(`refund tx: ${hash}`);
      } catch (e) { log('refund failed: ' + e.message); }
    };
  }
}

try {
  const { count, processors } = await listProcessors(0, 10);
  $('processors').innerHTML =
    `<p>${count} processors on TapeOut today. First ${processors.length}:</p>` +
    '<table><tr><th>#</th><th>Name</th><th>Contract</th></tr>' +
    processors.map((p) => `<tr><td>${p.index}</td><td>${esc(p.name || '—')}</td><td class="mono">${p.address}</td></tr>`).join('') +
    '</table>';
} catch (e) {
  $('processors').textContent = 'Could not load processors (RPC consensus unavailable): ' + e.message;
}
try { await refreshBoard(); } catch (e) { $('board').textContent = 'Could not read the board: ' + e.message; }

$('btn-connect').onclick = async () => {
  const wallet = getWallet();
  if (!wallet) { log('No wallet found — this is a read-only session. Open ChipJobs in a wallet browser (or under TapeKit) to post and claim.'); return; }
  try {
    account = await write.requestAccount(wallet);
    $('acct').textContent = account;
    $('btn-post').disabled = !escrowAddr;
    $('btn-claim').disabled = !escrowAddr;
    log('wallet connected: ' + account + (escrowAddr ? '' : ' (escrow not deployed yet — writes stay disabled)'));
  } catch (e) { log('connect failed: ' + e.message); }
};

async function sha256Hex(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return '0x' + [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

$('btn-post').onclick = async () => {
  try {
    const specHash = await sha256Hex($('f-spec').value || '');
    const deadline = Math.floor(Date.now() / 1000) + Number($('f-hours').value || 72) * 3600;
    const rewardWei = BigInt(Math.round(Number($('f-reward').value || 0) * 1e18));
    const hash = await write.postBounty(getWallet(), escrowAddr, {
      from: account, specHash, deadline,
      cpuIndex: Number($('f-cpu').value || 0), anyCpu: $('f-any').checked,
    }, rewardWei);
    log(`post tx: ${hash} (spec ${specHash.slice(0, 18)}…)`);
    await refreshBoard();
  } catch (e) { log('post failed: ' + e.message); }
};

$('c-id').onchange = () => {
  const id = Number($('c-id').value);
  $('claim-help').textContent = Number.isInteger(id)
    ? tapeoutEntryFor({ anyCpu: false, cpuIndex: Number($('c-cpu').value || 0) }).instructions.join(' ')
    : '';
};

$('btn-claim').onclick = async () => {
  const parsed = parseClaimInput($('c-cpu').value, $('c-circuit').value);
  if (!parsed.ok) { log('claim input: ' + parsed.error); return; }
  try {
    const hash = await write.submitAndClaim(getWallet(), escrowAddr, {
      from: account, id: Number($('c-id').value), cpuIndex: parsed.cpuIndex, circuitId: parsed.circuitId,
    });
    log(`claim tx: ${hash} — if the circuit is yours, the payout is already on its way.`);
    await refreshBoard();
  } catch (e) { log('claim failed: ' + e.message); }
};
