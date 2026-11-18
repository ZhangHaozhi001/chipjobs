// Read-only proof that the ChipJobs data layer works against X Layer mainnet.
// Sends eth_call only — no transactions, no gas. Run: npm run demo:mainnet-read
import { getCpuCount, getCpuAt, isCPU, getProcessorName, verifyCircuit } from '../src/data/tapeout-data.js';

console.log('== ChipJobs data layer vs X Layer mainnet (read-only, dual-RPC consensus) ==');
const count = await getCpuCount();
console.log('factory.cpuCount() =', count);
const cpu0 = await getCpuAt(0);
console.log('factory.cpuAt(0)   =', cpu0);
console.log('factory.isCPU(cpu0) =', await isCPU(cpu0));
try { console.log('processor 0 name   =', JSON.stringify(await getProcessorName(cpu0))); } catch { console.log('processor 0 name   = (unreadable, display-only)'); }
const cpuLast = await getCpuAt(count - 1);
console.log(`factory.cpuAt(${count - 1}) =`, cpuLast);
const bad = await verifyCircuit(count + 5, 1, cpu0);
console.log('verifyCircuit(out-of-range cpu) ->', bad.ok, '/', bad.reason);
console.log('== mainnet read OK ==');
