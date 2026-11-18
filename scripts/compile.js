// Compile all contracts with solc-js into artifacts/<Name>.json {abi, bytecode}.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import solc from 'solc';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const files = {
  'contracts/ITapeOut.sol': readFileSync(join(root, 'contracts/ITapeOut.sol'), 'utf8'),
  'contracts/ChipJobsEscrow.sol': readFileSync(join(root, 'contracts/ChipJobsEscrow.sol'), 'utf8'),
  'contracts/mocks/Mocks.sol': readFileSync(join(root, 'contracts/mocks/Mocks.sol'), 'utf8'),
};

const input = {
  language: 'Solidity',
  sources: Object.fromEntries(Object.entries(files).map(([k, v]) => [k, { content: v }])),
  settings: {
    evmVersion: 'shanghai', // Ganache default hardfork; Cancun MCOPY would be an invalid opcode there
    optimizer: { enabled: true, runs: 200 },
    outputSelection: { '*': { '*': ['abi', 'evm.bytecode.object'] } },
  },
};
const out = JSON.parse(solc.compile(JSON.stringify(input), {
  import: (p) => {
    const key = p.replace(/^\.\//, 'contracts/').replace(/^contracts\/contracts\//, 'contracts/');
    if (files[key]) return { contents: files[key] };
    if (files['contracts/' + p.split('/').pop()]) return { contents: files['contracts/' + p.split('/').pop()] };
    return { error: 'not found: ' + p };
  },
}));
const errors = (out.errors || []).filter((e) => e.severity === 'error');
if (errors.length) {
  for (const e of errors) console.error(e.formattedMessage);
  process.exit(1);
}
mkdirSync(join(root, 'artifacts'), { recursive: true });
let n = 0;
for (const [file, contracts] of Object.entries(out.contracts)) {
  for (const [name, c] of Object.entries(contracts)) {
    if (!c.evm.bytecode.object) continue;
    writeFileSync(join(root, 'artifacts', `${name}.json`), JSON.stringify({ abi: c.abi, bytecode: '0x' + c.evm.bytecode.object }, null, 2));
    console.log(`compiled ${name} (${file}) bytecode ${(c.evm.bytecode.object.length / 2)} bytes`);
    n++;
  }
}
console.log(`OK: ${n} contracts -> artifacts/`);
