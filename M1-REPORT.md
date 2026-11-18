# M1 阶段报告 — 数据与骨架（ChipJobs）

完成时间：2026-11-18。执行口径：闸 1 已由用户拍板取消、闸 2 解除；M1 完成后未停，
直接续推 M2–M4（各见其阶段报告）。硬限制全程遵守：未注册账号、未提交、未付款、
**未做任何主网写操作**（主网仅只读 eth_call）。

## M1 交付物（对 GO-NOGO 里程碑表「M1 数据与骨架」逐项对账）

| 里程碑表要求 | 状态 | 证据 |
|---|---|---|
| 处理器/电路链上数据读取层 | ✅ 完成并实测 | `src/data/tapeout-data.js`：零依赖 JSON-RPC 客户端，双节点（OKX + dRPC）共识读 `cpuCount/cpuAt/isCPU/ownerOf/name`，含 `verifyCircuit` 谓词（与合约内校验 1:1 对应）。主网实测：`cpuCount=427`、`cpuAt(0)=0x839bdd6fa7a66416a609a735e11de5411b98574e`（与 GO-NOGO 的截断值 0x0839…8574e 一致）、处理器 0 名 "OnlyTestXLayer"、越界校验正确返回 no-such-cpu。`npm run demo:mainnet-read` |
| 悬赏板前端骨架 | ✅ 完成（M2 已升级为完整旅程） | `src/tapekit-site/`：看板（实时处理器列表 + 悬赏列表读取）、环境检测（https / tape://）、TapeKit 适配层（kernel/钱包接缝）。本地静态服务实测四路径 HTTP 200 |
| 托管合约初版 | ✅ 代码完成 + 本地部署验证 | `contracts/ChipJobsEscrow.sol`（发单/校验认领/到期退款/取消，95/5 分账）+ `ITapeOut.sol` 接口 + 本地 Mock（TapeOut 无测试网，Mock 与真接口逐项对应）。本地链全流程演示通过：10→9.5+0.5、到期全额退 3.0、取消、托管残额 0 |
| 托管合约**部署 X Layer 主网** | ⏸ 未做（用户步骤） | 属主网写操作 + 需用户钱包/OKB，与本轮硬限制冲突，顺延为提交包清单第 2 步；合约字节码已就绪（shanghai 目标，5,414 B），部署参数已写明（factory + feeRecipient） |

## 测试与复检（M1 轮）

- 编译：solc 0.8.28，3 合约全过（初版曾因 Cancun 默认目标在 Ganache 报 invalid
  opcode，已钉 `evmVersion: shanghai` 修复——与 Aevum 项目同类坑）。
- 合约测试 8/8：95/5 精确分账、他人电路认领被拒、不存在 #ID 被拒、错处理器被拒、
  anyCpu 放行、到期全额退款 + 退款后不可再认领、仅发单人可取消、向不存在处理器发单被拒。
- 复检发现并修复的真实问题：①ethers BrowserProvider 的 `latest` 余额缓存会读到
  交易前旧值（退款断言假失败），改按回执块号读余额后断言精确到 wei；
  ②Ganache 在 estimateGas 路径不回传 revert 原因，原因断言改走 staticCall。
- README（中英）与代码一致：README 中命令逐个实跑验证（见 M4 总复检）。

## 遗留（全部为用户钱包/账号类，已汇入 SUBMISSION-PACKAGE.md 清单）

主网部署托管合约、tapeout.net 流片演示电路、DeWEB 上链发布、公开仓托管、
视频录制、表单提交——共 7 项，见提交包 §7。
