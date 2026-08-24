# V1.8.0 AI办公室与AI秘书验证记录

**验证状态：** 代码/契约级通过；真实模型与线上数据库联调待现场环境验证。

## 已通过

- V1.4二级页面基础回归
- V1.5选品成熟业务迁移回归
- V1.6字段标准化回归
- V1.7数据库/后端基础回归
- V1.8 AI办公室/AI秘书专项测试
- 109个内部路由引用检查
- Global Shell单一来源检查
- 测样历史回归检查
- Backend全部V1.8新增JS语法检查
- 活动JS语法检查
- JSON解析检查
- OpenAPI YAML解析检查
- Migration版本唯一性检查
- 6个Migration无`DROP`/`TRUNCATE`破坏性DDL检查
- Preview Provider独立样例验证，明确输出“未调用模型”

## V1.8专项验证内容

- 7个岗位AI办公室注册完整
- 会长兼董事长AI办公室为第一验证办公室
- 当前Preview身份可解析到该办公室
- AI办公室使用标准业务母版
- AI秘书Aside有真实命令输入与发送行为
- 客户端调用`/api/v1/ai-secretary/execute`与`/confirm`
- 美和9要素固定顺序未变
- Backend AI Office Registry / Tool Registry / Provider / Service / Route存在
- 模型Tool集合不包含直接数据库写入工作Tool
- OpenAI Provider采用Responses API Function Tool循环结构
- 写入通过Proposal + 人类确认
- `0050_ai_office_orchestration.sql`建立AI人才、AI办公室、AI任职三表并预设7办公室
- Core Resources、Object Contract、Field-to-DB Mapping、OpenAPI同步更新

## 环境限制 / 未执行

### 1. 真实OpenAI模型

当前执行环境没有用户的`OPENAI_API_KEY`，因此未调用真实OpenAI模型。代码已保留OpenAI模式；正式验证时必须通过环境变量注入Key，禁止写入仓库。

### 2. Express运行时集成

尝试安装Backend npm依赖时网络超时，因此本环境没有完成真实Express Server端到端HTTP启动测试。已经完成静态语法、路由、契约和纯Preview Provider测试。

### 3. Cloud SQL

未获得正式Cloud SQL连接凭据，因此V1.7和V1.8迁移仍未在生产/正式Cloud SQL执行；数据库Tool会在数据库未迁移时明确返回不可用或Preview回退，不伪造正式数据。

## 现场验收建议

1. 本地启动Backend，保持`AIONE_AI_MODE=preview`，验证右侧AI秘书状态和“今天最重要的三件事”。
2. 开启本地Preview Actor后，验证AI提出“创建工作事项”并由人确认后的本地/数据库链路。
3. Cloud SQL Migration完成后，重新验证数据库工作汇总、知识路由和AI执行记录。
4. 配置`OPENAI_API_KEY`并切换`AIONE_AI_MODE=openai`，验证真实模型工具调用。
5. 任何新增写Tool继续保持Proposal/确认，除非未来正式锁定更细的自动执行风险等级。
