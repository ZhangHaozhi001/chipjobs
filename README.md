# ChipJobs — Circuit-Design Bounties on TapeOut / X Layer

**EN** · ChipJobs is a bounty market for small digital-circuit designs, built on the
TapeOut protocol (X Layer). A poster locks OKB in an escrow contract for a circuit
task (e.g. an 8-bit comparator, a vending-machine controller, a CRC checker).
A designer tapes the circuit out on an existing TapeOut processor, submits the
circuit's (processor index, #ID), and the contract **verifies on-chain** that the
circuit exists and belongs to the submitter — then pays automatically:
**95% to the designer, 5% platform fee**. Unclaimed bounties refund in full after
the deadline. Circuit-as-deliverable, proof-as-settlement: no screenshots, no disputes.

**中文** · ChipJobs 是建在 TapeOut 协议（X Layer）上的小型数字电路设计悬赏市场。
需求方把 OKB 赏金锁进托管合约（任务如 8 位比较器、售货机控制器、CRC 校验器）；
设计者在 TapeOut 现有处理器上流片，提交（处理器编号，电路 #ID）后，合约**在链上校验**
电路存在且归提交者所有，通过即自动放款：**设计者 95%，平台抽成 5%**；
超时无人达标则全额退款。电路即交付物、链上验真即结算。

## Why / 为什么做这个

- **Real demand** — small-circuit design is routinely outsourced; today it settles on trust and screenshots. / 小电路设计外包是真实需求，如今靠信任与截图结算。
- **Native to TapeOut** — the deliverable *is* a TapeOut circuit NFT; verification uses only the protocol's own factory + ERC-721 ownership. / 交付物本身就是 TapeOut 电路 NFT，校验只用协议自家的工厂合约与 ERC-721 归属。
- **Revenue model** — 5% settlement fee on every filled bounty; posters pay for certainty, designers get paid the second their proof checks out. / 收入模型：每笔成交抽 5%；需求方买的是确定性，设计者证明一过即到账。

## Architecture / 架构

```
contracts/
  ITapeOut.sol          Factory + processor (ERC-721) interfaces (SPEC App. B)
  ChipJobsEscrow.sol    Bounty escrow: post / submitAndClaim / refund / cancel
  mocks/                Local stand-ins for tests (TapeOut has NO testnet)
src/
  data/tapeout-data.js  Read layer: dual-RPC-consensus eth_call client (no deps)
  data/escrow-read.js   Bounty board reads + struct decoding
  data/escrow-write.js  EIP-1193 write layer (post / claim / refund / cancel)
  tapekit-site/         The app: one bundle, two forms —
                          https site  ·  tape:// DeWEB site (TapeKit)
    tapekit-adapter.js  Environment detection + wallet/kernel seams
    tapeout-flow.js     Tape-out (user-wallet) step: entry + paste-back validation
scripts/                compile / local demo / journey demo / mainnet read / serve
test/                   Contract suite (8) + journey & unit suite (4)
```

Key facts: X Layer chainId **196** · TapeOut factory
`0x1f09daefa827f02cbb40967cc91b259763760761` · specHash = SHA-256 of the
off-chain spec document · TapeOut is **not deployed on any testnet**, so all
write-side verification is local (Ganache + interface-identical mocks) and all
mainnet interaction so far is **read-only**.

## Run it / 跑起来

```bash
npm install --ignore-scripts
npm run compile            # solc -> artifacts/
npm test                   # 12 tests: escrow suite + journey/unit suite
npm run demo:local         # full loop on an in-process chain (post→claim→refund→cancel)
node scripts/demo-journey.js   # same loop driven by the site's own modules
npm run demo:mainnet-read  # live read-only proof vs X Layer mainnet (dual-RPC)
npm run demo:site          # serve the app at http://127.0.0.1:8077/tapekit-site/
node scripts/build-deweb.js    # M3: self-contained DeWEB bundle -> dist-deweb/
```

## Status / 状态

M1–M3 complete locally (see M1-REPORT.md / M2-REPORT.md / M3-REPORT.md).
Remaining steps need the project owner's wallet and are listed in
SUBMISSION-PACKAGE.md: deploy the escrow to X Layer mainnet (OKB gas), tape out
one original demo circuit on tapeout.net, publish the DeWEB bundle on-chain,
then submit the TapeOut Accelerate form before **2026-12-07 23:59 UTC**.

## License

MIT
