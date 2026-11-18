// Shared helper: spin up an in-process Ganache chain and deploy the full
// ChipJobs stack (MockFactory + MockCPU x2 + ChipJobsEscrow) for demos/tests.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ethers } from 'ethers';
import ganache from 'ganache';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const artifact = (name) => JSON.parse(readFileSync(join(root, 'artifacts', `${name}.json`), 'utf8'));

export async function startLocalStack() {
  const provider = new ethers.BrowserProvider(ganache.provider({ logging: { quiet: true } }));
  const signers = await provider.listAccounts();
  const [deployer, poster, designer, stranger, feeRecipient] = signers;

  const deploy = async (name, signer, args = []) => {
    const a = artifact(name);
    const c = await new ethers.ContractFactory(a.abi, a.bytecode, signer).deploy(...args);
    await c.waitForDeployment();
    return c;
  };

  const factory = await deploy('MockFactory', deployer);
  const cpu0 = await deploy('MockCPU', deployer, ['DemoCPU-8bit']);
  const cpu1 = await deploy('MockCPU', deployer, ['DemoCPU-4bit']);
  await (await factory.addCPU(await cpu0.getAddress())).wait();
  await (await factory.addCPU(await cpu1.getAddress())).wait();

  const escrow = await deploy('ChipJobsEscrow', deployer, [await factory.getAddress(), feeRecipient.address]);

  return { provider, deployer, poster, designer, stranger, feeRecipient, factory, cpu0, cpu1, escrow };
}

export const eth = (v) => ethers.parseEther(v);
/** Balance at an explicit block number. NOTE: ethers' BrowserProvider caches
 *  'latest', which can return a stale pre-transaction balance right after a
 *  mined tx — always read money assertions at a receipt block number. */
export async function balAt(provider, addr, blockNumber) {
  return provider.getBalance(addr, blockNumber);
}
export async function freshBlock(provider) {
  return Number(await provider.send('eth_blockNumber', []));
}
