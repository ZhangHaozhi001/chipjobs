# ChipJobs User Guide / 用户指南

## For posters / 需求方

1. **Connect** a wallet on X Layer (chainId 196) with some OKB. / 连接 X Layer 钱包，备少量 OKB。
2. **Write the spec** — full task description, truth table / test vectors, acceptance
   criteria — and host it anywhere public (its SHA-256 is what goes on-chain).
   / 写清任务规格（真值表/测试向量/验收标准），公开托管，链上只存其 SHA-256。
3. **Post the bounty** — reward, deadline, and either a required processor index
   or "any processor". The reward is locked in the escrow immediately.
   / 发单：赏金、截止时间、指定处理器或不限处理器；赏金即刻锁入托管合约。
4. **Wait** — the first designer whose taped-out circuit verifies on-chain is
   paid automatically (95% / 5% fee). Nothing for you to approve.
   / 等待即可：第一个电路被链上验真的设计者自动收款，你无需审批。
5. **No claim in time?** After the deadline anyone can trigger your full refund;
   you can also cancel any time while the bounty is open.
   / 超时无人达标：到期后任何人可触发全额退款；悬赏开放期间你也可随时取消。

## For designers / 设计者

1. **Pick a bounty** on the board; note its processor requirement and deadline.
   / 在悬赏板挑单，记下处理器要求与截止时间。
2. **Tape out** — open tapeout.net with the *same wallet you will claim with*,
   build the circuit on the required processor (samples in the canvas can be a
   starting point), and sign the tape-out. The circuit NFT (#ID) lands in your wallet.
   / 流片：在 tapeout.net 用**将来认领用的同一钱包**，在指定处理器上搭电路并签名流片，电路 NFT（#ID）进你的钱包。
3. **Claim** — back in ChipJobs, enter bounty #, processor index and circuit #ID.
   The contract checks `ownerOf(#ID) == your address` and pays you instantly.
   / 认领：回 ChipJobs 填悬赏号、处理器编号、电路 #ID；合约校验归属后立即付款。
4. **One shot per circuit state** — if you transfer the circuit NFT away before
   claiming, the check fails; claim first, then do what you like with it.
   / 注意：认领前转走电路 NFT 会导致校验失败；先认领，再处置。

## Fees & safety / 费用与安全

- Settlement fee: **5%**, taken only on a successful claim. Refunds and cancels are fee-free.
  / 抽成 5%，仅成交时收取；退款与取消不收费。
- ChipJobs never holds your keys and never signs for you; every write is a
  transaction you approve in your own wallet. / ChipJobs 不碰你的私钥、不代签；每笔写操作都由你在自己钱包里确认。
- TapeOut has no testnet: try the local demo in the repo before using real OKB.
  / TapeOut 没有测试网：动真 OKB 前先跑仓库里的本地演示。
