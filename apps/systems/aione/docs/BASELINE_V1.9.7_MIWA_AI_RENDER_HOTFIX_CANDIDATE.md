# AIONE V1.9.7 CANDIDATE｜美和AI独立层渲染修复基线

- 日期：2026-08-24
- 基线来源：V1.9.6 美和AI独立能力层 Candidate
- 状态：验证候选

## 1. 修复原因

Windows + Live Server 实际预览发现：美和AI独立层可以打开，Header与扩展/关闭按钮正常，但在部分预览状态下出现正文、当前上下文、能力推荐与Composer整块空白。

本轮不重新接AI、不改周六已经建立的AI Backend / Tool Layer / 人类确认链路，只修复美和AI独立前端层的渲染稳定性。

## 2. 结构修复

美和AI Panel外壳从四行CSS Grid调整为稳定的纵向Flex Shell：

`AI Header → Current Context → AI Body → Composer`

职责：

- Header：固定，不参与正文高度计算。
- Context：固定，始终显示当前页面/路由。
- Body：`flex:1`，独立滚动。
- Composer：固定在底部，不随Body消失。

AI工作区只改变Body内部为“能力推荐 + 工作区”双栏，不再改变Panel外壳的四段式职责。

## 3. 运行时保护

新增：

- 当前Route解析安全回退。
- Layer关键DOM完整性检查。
- AI Client初始化异常隔离：Backend/API异常不得让AI界面整体空白。
- 结构不完整时显示明确错误提示，而不是白屏。

## 4. 保持不变

以下V1.9.6结论继续有效：

- `全局搜索 → 美和AI → 通知 → 帮助 → 设置`
- 美和AI独立于Header / Sidebar / Main / Aside / Footer五区职责。
- `美和AI → AI工作区 → AI办公室`
- Aside不承载AI聊天或AI办公室。
- 复用原有 `/api/v1/ai-secretary/status`、`/execute`、`/confirm`。
- 关键写入继续要求人类确认。

## 5. 本轮验证重点

Windows + Live Server只需要重点检查：

1. 点击Header“美和AI”，当前上下文、能力推荐、欢迎语和输入框必须立即可见。
2. 点击扩展，AI工作区双栏内容必须可见，底部Composer必须保留。
3. Backend未启动时，界面仍完整显示，并明确提示Backend未连接。
4. Backend启动后，输入任务能够继续调用既有AI执行链。
5. “进入AI办公室”仍可进入 `#/ai-office`。
