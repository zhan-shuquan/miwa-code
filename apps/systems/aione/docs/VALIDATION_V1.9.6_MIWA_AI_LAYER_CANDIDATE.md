# V1.9.6 美和AI独立能力层验证记录

- 日期：2026-08-24
- 状态：自动验证通过后进入Windows人工体验候选

## 自动验证范围

1. Header全局工具顺序为：全局搜索 → 美和AI → 通知 → 帮助 → 设置。
2. Desktop与Mobile均存在美和AI全局入口。
3. 美和AI拥有独立Shell Host，不嵌套在Aside。
4. 独立组件支持Drawer / Workspace / AI Office升级路径。
5. AI推荐能力根据当前Route动态变化。
6. Composer固定包含上下文、技能/工具预留和发送入口。
7. 复用现有AI Backend `/api/v1/ai-secretary/*`，不重复建设第二套后端。
8. Aside继续满足V1.9.5纯上下文辅助规则。
9. V1.9.4 Header、V1.9.5 Sidebar/Aside及既有核心测试继续回归。

## 人工验收重点

Windows + Live Server重点判断：

- Header新增“美和AI”后第一行是否仍然协调、不过度拥挤。
- 美和AI专属M智核图标是否有足够的美和识别度。
- Drawer约500px是否适合快速任务。
- 展开AI工作区后是否仍能清楚感知底层AIONE业务上下文。
- 当前页面推荐是否比空白聊天框更自然。
- AI Layer打开/关闭是否干扰Sidebar、Main、Aside已有交互。
- “进入AI办公室”的升级路径是否顺手。

## 当前不宣称完成

- 不宣称AI本身能力已足够强大。
- 不宣称Skill/Agent/Connector已全部接入UI。
- 不宣称真实OpenAI模型已在正式数据环境启用。
- 不宣称浏览器视觉验收已由自动测试替代。
