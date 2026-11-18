# ChipJobs — TapeOut Accelerate Submission Package / 提交包

**Deadline: 2026-12-07 23:59 UTC (= 12-08 07:59 CST), provisional. Internal deadline: submit by 12-05.**
Everything below is copy-paste ready for the official submission form.
Fields marked ⟦USER⟧ can only be completed with the owner's wallet/session —
see the checklist at the bottom. The form itself is submitted by the owner
(this package was prepared agent-side; no account was registered, nothing was
submitted).

---

## 1. Project name

ChipJobs — Circuit-Design Bounties on TapeOut

## 2. Project description (form field, paste as-is)

**What it is.** ChipJobs is a bounty market for small digital-circuit designs,
built on the TapeOut protocol on X Layer. A poster locks a native-token (OKB)
reward in the ChipJobs escrow contract for a concrete circuit task — an 8-bit
comparator, a vending-machine controller, a CRC checker. A designer tapes the
circuit out on an existing TapeOut processor and submits the circuit's
(processor index, #ID). The escrow contract then verifies **on-chain** — via
the TapeOut factory (`cpuAt`) and the processor's ERC-721 (`ownerOf`) — that
the circuit exists and belongs to the submitter, and pays out automatically:
**95% to the designer, 5% platform fee**. If no valid circuit arrives before
the deadline, the poster is refunded in full; posters can also cancel while a
bounty is open.

**Target users & how we reach them.** (1) Hardware hobbyists, students and
small product teams who need a small, well-specified digital block but lack
in-house design time — reached through the TapeOut community, electronics
forums and university labs. (2) Circuit designers already taping out on
TapeOut, who today have no way to monetise that skill — reached in the
TapeOut/TapeKit community itself, where the bounty board lives as a tape://
site next to the tools they already use.

**Revenue model.** A 5% settlement fee on every filled bounty, taken by the
contract at payout — no subscriptions, no listing fees, refunds and cancels
are free. Later: featured bounties and team accounts for repeat posters.

**Why users pay and stay.** Posters pay for *certainty*: the deliverable is a
circuit NFT whose existence and ownership are facts on-chain, so settlement
needs no screenshots, no escrow agent and no dispute process — the proof is
the payment trigger. Designers stay because getting paid is instant and
permissionless the moment their proof verifies, and every filled bounty is a
public, on-chain track record of their skill.

**What was built during the event.** The complete ChipJobs system is new:
the escrow contract, a dual-RPC-consensus read layer for TapeOut mainnet
data, an EIP-1193 write layer, and the app in two forms (https site + tape://
DeWEB bundle for the TapeKit kernel), with a full local test/demo suite
(12 automated tests; TapeOut has no testnet, so write paths are verified
against interface-identical local mocks and all mainnet use is read-only
until deployment).

## 3. TapeOut ecosystem capabilities used (form field)

- **Existing TapeOut processors & circuits** — bounties are fulfilled by
  taping out circuits on processors created through the TapeOut factory on
  X Layer mainnet (factory `0x1f09daefa827f02cbb40967cc91b259763760761`);
  settlement reads `cpuCount` / `cpuAt` / `isCPU` and circuit `ownerOf`.
- **TapeKit / DeWEB** — the app ships as a tape:// site bundle
  (self-contained files + SHA-256 manifest) rendered by the TapeKit kernel,
  alongside the plain https form; environment detection switches read paths.
- **X Layer on-chain data & contracts** — the ChipJobs escrow contract on
  X Layer holds rewards and settles bounties against live TapeOut mainnet state.
- **tapeout.net tape-out flow** — designers produce the deliverable circuit
  in the official canvas with their own wallet (deep-link seam reserved in
  `src/tapekit-site/tapeout-flow.js`).

## 4. Links & addresses (form fields)

| Field | Value |
|---|---|
| Website / app (https) | https://zhanghaozhi001.github.io/chipjobs/tapekit-site/ (GitHub Pages, live 2026-11-18; site root https://zhanghaozhi001.github.io/chipjobs/ redirects here) |
| DeWEB (tape://) | ⟦USER: tape:// name after publishing the bundle on-chain⟧ |
| Escrow contract (X Layer mainnet) | ⟦USER: address after deployment — deploy `ChipJobsEscrow(factory=0x1f09daefa827f02cbb40967cc91b259763760761, feeRecipient=<owner wallet>)` from `artifacts/ChipJobsEscrow.json`⟧ |
| Demo circuit | ⟦USER: processor index + circuit #ID after the tape-out session⟧ |
| Code repository | https://github.com/ZhangHaozhi001/chipjobs (public, pushed 2026-11-18) |
| Demo video (≤3 min) | ⟦USER: upload URL — script below⟧ |

## 5. Demo video script (≤3:00, shoot after deployment + tape-out)

| Time | Shot | Narration (EN) |
|---|---|---|
| 0:00–0:20 | Landing page, bounty board | "Small circuit designs are outsourced every day — and settled on trust and screenshots. ChipJobs settles them with on-chain proof." |
| 0:20–0:50 | Post-a-bounty form → wallet confirm | "A poster locks OKB in the escrow with a spec hash, a processor and a deadline. The money is in the contract, not in someone's inbox." |
| 0:50–1:30 | tapeout.net canvas, existing processor, tape-out signature | "The designer builds the circuit on a real TapeOut processor and tapes it out. The circuit NFT lands in their wallet — that NFT is the deliverable." |
| 1:30–2:10 | Claim form → submit → payout lands | "Back in ChipJobs they submit the processor number and circuit ID. The contract checks the factory and the NFT owner — and pays instantly: 95% to the designer, 5% fee." |
| 2:10–2:40 | Board in tape:// form (TapeKit viewer) | "The same app runs as a DeWEB site inside TapeKit — the board lives where TapeOut users already are." |
| 2:40–3:00 | Refund shot + closing card | "No claim in time? Full automatic refund. ChipJobs: circuit as deliverable, proof as settlement." |

中文要点（给爹看懂视频讲什么）：问题（小电路外包靠截图结算）→ 发单锁钱 →
设计者在真处理器上流片、电路 NFT 即交付物 → 提交即链上验真自动放款 95/5 →
tape:// 版亮相 → 超时全额退款收尾。

## 6. Evidence appendix (already true today, no wallet needed)

- Contract suite + journey suite: **12/12 tests pass** (`npm test`).
- Local demo: post 10 → claim pays 9.5 + 0.5 fee; expired bounty refunds 3.0 in
  full; cancel works; escrow residual 0 (`npm run demo:local`,
  `node scripts/demo-journey.js`).
- Mainnet read-only proof (dual-RPC consensus): `cpuCount = 427`,
  `cpuAt(0) = 0x839bdd6fa7a66416a609a735e11de5411b98574e`, processor 0 name
  "OnlyTestXLayer" (`npm run demo:mainnet-read`) — matches the validation
  report's independent measurements.
- DeWEB bundle: 7 files, all intra-bundle imports verified, manifest with
  SHA-256 per file (`node scripts/build-deweb.js`).

## 7. Owner-only checklist / 只有用户能做的步骤（攒齐版）

1. **X Layer wallet** — prepare a wallet on X Layer (chainId 196) with a small
   amount of OKB for gas + the first demo bounty (suggested: deploy gas + 1 OKB bounty).
2. **Deploy the escrow** — deploy `ChipJobsEscrow` (artifact in repo) with
   factory `0x1f09daefa827f02cbb40967cc91b259763760761` and your wallet as
   feeRecipient; send us the address, we wire it into the site (`?escrow=` /
   config) and re-verify the live board.
3. **Tape out the demo circuit** — one session on tapeout.net: pick an existing
   processor (e.g. #0), tape out the sample bounty circuit (an 8-bit comparator),
   note (processor index, circuit #ID). May cost a small amount of components/OKB —
   check the page price first.
4. **Publish the DeWEB site** — upload the `dist-deweb/` bundle files to a
   circuit container / SiteRegistry via TapeKit (wallet-signed), note the tape:// name.
5. ~~**Host the https site**~~ ✅ **DONE 2026-11-18** — `src/` tree published
   via GitHub Pages (gh-pages branch): https://zhanghaozhi001.github.io/chipjobs/tapekit-site/
6. **Record the video** — follow §5 (≤3 min), upload (e.g. YouTube unlisted).
7. **Push the repo public + submit the form** — ✅ repo push DONE 2026-11-18
   (https://github.com/ZhangHaozhi001/chipjobs, public); remaining: paste §2–§4 into the official form and submit **by 12-05**
   (official deadline 12-07 23:59 UTC, provisional). The submit click is yours.
8. *(Only if shortlisted)* Offline Demo Day attendance — decide when announced.
