# AIONE V1.3.0｜唯一二级空母版与组件基础架构｜验证记录

**状态：** 候选验证通过（代码/结构层）；浏览器视觉与交互人工验收待用户确认。  
**日期：** 2026-08-22

## 1. 主动测试

### 1.1 V1.3空母版专项

命令：

`node tests/verify-level2-empty-base-v1.3.mjs`

结果：

`V1.3 Level-2 Empty Base validation passed.`

覆盖：

- 唯一Level-2 Empty Base存在；
- 空母版不含具体业务；
- page-header/main/nine-elements/portal挂载位完整；
- 工作证据/时间统计未来挂载接口存在；
- 当前Recipe只有standard-business/content；
- business/content入口保持薄入口；
- 两类页面调用共享PageHeader/Workspace/ObjectPresenter/MIWA9Elements；
- 搜索/筛选/排序/导入/导出/视图/3-4-6列存在；
- loading/empty/no-results/error/forbidden标准状态存在；
- View Registry扩展接口存在；
- 美和9要素固定顺序正确；
- 9要素内部知识精准路由存在；
- 通知中心桌面入口唯一并位于今日工作左侧；
- 顶部信息带包含今日印象/日程/通知且不显示“节气/星座”名称；
- 重要日程运行时接口存在；
- V1.3候选缓存标识存在。

### 1.2 路由与Global Shell

命令：

`node tests/verify-route-integrity-v1.3.mjs`

结果：

`V1.3 route integrity passed: 103 internal route references checked; Global Shell single-source verified.`

覆盖：

- Route Registry中声明的页面文件均存在；
- 103个静态内部路由引用均能对应已注册路由；
- Header唯一来源；
- Sidebar唯一来源；
- Aside唯一来源；
- Footer唯一来源。

### 1.3 测样历史回归

命令：

`node tests/verify-sampling-dashboard.mjs`

结果：

`Sampling dashboard validation passed.`

## 2. JS语法与依赖

所有 `apps/systems/aione/js/**/*.js` 使用 `node --check` 检查：

`ALL_JS_SYNTAX_OK 48 files`

相对ES Module导入路径检查：

`IMPORT_GRAPH_OK 82 relative imports`

## 3. 旧测试处理

V1.1/V1.2测试中部分断言要求业务/内容页面HTML静态包含完整组件结构；V1.3已改为：

`薄页面入口 → Empty Base → Recipe → 运行时组件挂载`

因此旧断言与新架构天然冲突，并不代表当前实现失败。

旧测试没有删除，统一移动到：

`tests/legacy/`

当前主动测试清单见：

`tests/README.md`

## 4. 浏览器运行时验证限制

已启动本地HTTP服务并尝试使用容器内Chromium Headless加载：

`#/company`

当前容器Chromium在D-Bus/zygote环境中超时，未能生成可靠DOM dump。因此本记录不把浏览器视觉运行结果冒充为“已通过”。

这也是为什么V1.3仍标记为**候选基线**。

## 5. 首个真实人工验收目标：美和之家

用户打开V1.3候选后，只需先确认高层行为，不需要再替工程层找基础遗漏：

1. 美和之家能够正常打开，不出现大块无意义空白；
2. 页面底部能够看到完整“美和9要素”；
3. 美和9要素固定顺序为：目标｜人｜物｜事｜平台｜时间｜钱｜信息｜结果；
4. 内容对象区域可正常在卡片/列表间切换；
5. 卡片支持3列/4列/6列，默认3列；
6. 搜索、筛选、排序入口存在；
7. “美和方法论”与9要素点击后进入知识之家内部路由；
8. Header通知入口只有一个，位于今日工作左侧；
9. 顶部信息带为今日印象｜日程｜通知。

如果美和之家这条调用链通过，再进入知识之家和标准业务页面验证，不继续盲目扩页面。

## 6. 当前结论

**代码与结构层：通过。**  
**真实浏览器人工验收：待确认。**  
**正式锁定：尚未执行。**
