# AIONE V1.9.11｜美和AI执行链验证基线

状态：Candidate / 2026-08-24

## 本轮目标

在V1.9.10已经解决“美和AI独立层可稳定打开并完整渲染”的基础上，不继续调整Shell、Sidebar、Aside或Main，专门验证周六已接入的美和AI执行链是否仍然有效。

正式验证链：

`Header 美和AI → AI Layer → /status → /execute → 人类确认 → /confirm → 数据库写入或Preview Local Action`

## 本轮新增

- 根目录新增 `START_MIWA_AI_RUNTIME_AND_VERIFY.cmd`：Windows一键启动本地Preview Backend并执行端到端验证。
- 根目录新增 `VERIFY_MIWA_AI_RUNTIME.ps1`：依次验证STATUS、EXECUTE、HUMAN CONFIRM三个阶段。
- 验证命令使用测试目标“创建工作：美和AI执行链验证”，必须由`/execute`生成待确认proposal，再由`/confirm`验证人类确认写入边界。
- Preview模式下数据库未连接时，允许返回`previewLocalAction`；若数据库可用，则允许真实写入测试工作事项。两种情况都说明执行链有效。
- 美和AI前端Backend状态提示改为指向根目录一键验证脚本。
- 每次重新打开美和AI时重新检测Backend状态，避免Backend后启动但前端仍停留在“未连接”状态。

## 明确不改

- Sidebar / Aside V1.9.5锁定规则不改。
- 美和AI独立能力层V1.9.6架构不改。
- V1.9.9 Hard Entry Bridge不改。
- V1.9.10 Self-Healing Layer机制不改。
- 原AI Backend、Tool Layer、OpenAI Provider、Preview Provider和人类确认政策不重建。

## Windows真实验证方式

1. 使用Live Server打开AIONE前端。
2. 双击仓库根目录 `START_MIWA_AI_RUNTIME_AND_VERIFY.cmd`。
3. 保持弹出的AIONE Backend窗口运行。
4. 验证窗口出现：
   - `[PASS] STATUS`
   - `[PASS] EXECUTE`
   - `[PASS] CONFIRM`
5. 回到AIONE，重新打开“美和AI”。运行状态应从Backend未连接变为“预演模式”或真实OpenAI模型状态。
6. 在输入框输入真实任务，确认响应来自既有`/execute`链路；若产生写入建议，必须先显示“确认执行”。

## 锁定判断

只有“界面可用”不算AI接入完成。V1.9.11开始，必须把AI能力分成四层验证：

1. UI入口可打开；
2. Backend状态可连接；
3. `/execute`能读取上下文并返回结果；
4. 写入动作必须经过人类`/confirm`确认。
