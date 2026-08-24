# AI秘书本地验证指南 V1.0

## 目标

先在**不调用真实模型**的Preview模式下验证：

`会长兼董事长AI办公室 → 右侧AI秘书 → 当前上下文 → 工作/日程/通知 → 判断结果 → Proposal → 人类确认`

Preview结果明确标记“未调用模型”，只验证系统链路，不冒充真实AI判断。

## 最简单的Windows验证方式

1. 解压V1.8候选包到短路径，例如：`D:\AIONE180`。
2. 双击根目录：`START_AI_SECRETARY_PREVIEW.cmd`。
3. 首次运行会执行`npm install`；完成后Backend启动在`http://127.0.0.1:8080`。
4. 用现有Live Server方式打开AIONE前端（通常`http://127.0.0.1:5500/...`）。
5. 右侧AI秘书状态应显示Preview链路可用。
6. 点击快捷指令：`今天最重要的三件事`。
7. 检查回答是否明确写“预演/未调用模型”，并是否根据当前工作、通知、日程给出依据。
8. 输入类似：`创建工作：继续验证AI办公室`，AI秘书只应提出待确认动作；点击“确认执行”后才允许产生工作事项。

## 真实OpenAI模式（第二步再做）

不要把API Key写进任何代码文件。通过Windows环境变量或正式Secret注入：

```text
AIONE_AI_MODE=openai
AIONE_AI_MODEL=gpt-5.6-sol
OPENAI_API_KEY=你的环境变量秘密
```

然后重启Backend。

右侧状态显示已连接模型后，再验证：

`帮我判断今天最重要的三件事，并说明依据。`

真实模型模式会通过AIONE Tool Layer读取上下文；写入仍然必须先Proposal、再由人确认。

## 当前预期限制

- Cloud SQL尚未执行V1.7/V1.8正式Migration时，数据库类Tool可能显示不可用。
- Preview模式的确认动作可以回退到本地工作事项，以验证交互链路。
- 正式Cloud SQL迁移和真实身份接入后，再验证数据库写入与AI执行证据。
