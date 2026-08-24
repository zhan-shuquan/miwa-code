# V1.9.13｜美和AI Model Provider Layer Candidate

## 状态
候选基线。目标是让美和AI从“已打通执行链”进入“可接真实模型，但不被单一模型厂商锁死”的阶段。

## 本轮锁定

1. 新增Backend唯一 `Model Provider Layer`：业务编排不再直接依赖OpenAI实现。
2. `AIONE_AI_MODE=preview` 继续保留确定性预演；`AIONE_AI_MODE=live` 时由 `AIONE_AI_PROVIDER` 选择真实模型Provider。
3. 第一阶段真实Provider为 `openai`，继续使用OpenAI Responses API；后续Gemini等Provider只需新增适配器，不修改AIONE业务编排。
4. `OPENAI_API_KEY` 仅存在于Backend运行环境。前端、HTML、JS、ZIP、Git仓库均不得保存真实Key。
5. 新增Windows `START_MIWA_AI_REAL_MODEL.cmd`：本地验证时隐藏输入Key，仅注入当前Backend进程，不写入AIONE文件。
6. 保留 `/status → /execute → /confirm` 与“AI提出写入建议 → 人类确认 → 执行”的安全边界。
7. 新增 `get_current_page_business_context` Tool。当前选品工作台会把正在使用的UI数据源中的指标、类型、阶段和商品机会摘要作为上下文提供给美和AI；模型回答当前页面问题时应优先读取该证据，不得只凭页面标题猜测。

## 运行方式

### Preview
继续使用：

`START_MIWA_AI_RUNTIME_AND_VERIFY.cmd`

### 真实模型
1. 先关闭现有Preview Backend窗口，释放8080端口。
2. 双击 `START_MIWA_AI_REAL_MODEL.cmd`。
3. 在PowerShell隐藏输入框中输入OpenAI API Key。Key不写入仓库文件。
4. 保持Backend窗口打开。
5. 可运行 `VERIFY_MIWA_AI_REAL_MODEL.cmd` 检查Provider状态。
6. 回到AIONE，用同一条真实业务问题验证模型效果。

## 云端原则
本地隐藏输入只用于内测。进入Cloud Run后，API Key必须改由Secret Manager注入，不得保存在代码、镜像、前端或普通环境文件中。
