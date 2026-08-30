# AIONE Page Type清单 V1.0 RC

状态：Release Candidate / 待冻结

## 核心规则
新增页面必须先选择现有 Page Type；只有现有类型无法承载新的稳定模式时，才允许新增 Page Type。

## 核心 Page Type
1. PT-01 Overview Page：之家/事业/中心概览、入口、重点、快捷操作。
2. PT-02 Object List Page：对象列表、搜索、筛选、排序、批量管理、视图切换。
3. PT-03 Object Workspace：单个业务对象完整工作区。
4. PT-04 Workflow Page：流程、任务、阶段、状态推进、责任人、截止时间。
5. PT-05 Analytics Dashboard：KPI、图表、筛选、对比、排名、异常、AI洞察、下钻。
6. PT-06 Configuration Page：分类、属性、参数、基础数据、权限等稳定配置。
7. PT-07 Knowledge Page：制度、标准、方法、SOP、培训、帮助、项目知识、决策记录。
8. PT-08 Integration Page：API、ERP、Webhook、外部系统、映射、同步、日志与重试。

## 横向能力
Publication Layer 不单独作为业务 Page Type，统一提供 Web View / Print View / A4 / PDF / Download / Share。

Progressive Disclosure 是所有 Page Type 的横向交互规则：高频关键动作直接显示；低频动作进入 More/Context Menu；复杂配置使用 Drawer/Dialog；不得因单页需要复制新的交互模式。

## Object List 标准批量能力
- 当前页全选
- 全部选择当前筛选结果（跨页）
- 全部取消
- 反选
- 已选数量
- 批量编辑/负责人/状态/标签
- 批量上传/导入/下载/导出
- 批量归档/删除/恢复
- 批量AI处理

## Page Type开发前必答
1. 属于哪个 Page Type？
2. 对应哪个业务对象？
3. 使用哪些 Shared Components？
4. 默认有哪些 Actions？
5. 哪些仅为 Config？
6. 哪些才是真正业务特化？

## 当前结论
V1.0 RC 维持8种核心 Page Type，不新增第9种。Publication、i18n、权限、审计、回收站、AI等均作为横向平台能力处理。
