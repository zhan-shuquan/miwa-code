# AIONE Cloud Data Runtime V1.0

**状态：候选｜等待在美和Google Cloud项目现场执行。**

## 1. 目标

把已经在本地验证通过的：

`AIONE前端 → AI秘书 → Backend → Tool Layer → 人类确认 → 工作之家`

推进为：

`正式Cloud SQL → Cloud Run Jobs迁移 → 私有Cloud Run Backend → 认证Smoke Test`

本阶段先保证真实数据与运行环境，不急着切换真实OpenAI模型。

## 2. 安全顺序

1. 只读发现现有Google Cloud配置；
2. 创建专用`aione-runtime`服务账号；
3. 确认Secret Manager中的DB密码映射；
4. 创建Cloud SQL按需备份；
5. Cloud Build构建V1.9镜像；
6. Cloud Run Job执行只读DB Preflight；
7. 人工确认数据库/现有四表无误；
8. Cloud Run Job执行增量Migration；
9. 部署新的私有`aione-backend-v190`，不覆盖现有`aione-backend`；
10. 用当前Google身份执行`/health`和AI秘书status Smoke Test。

## 3. 为什么使用Cloud Run Job做迁移

数据库迁移与正式Backend使用同一容器镜像、同一Cloud SQL连接和同一Secret Manager秘密来源；运行记录进入Cloud Logging。Migration Job关闭自动重试，避免DDL失败后被重复执行。

## 4. 为什么V1.9目标Backend保持私有

美和内部“默认共享”不等于“互联网匿名公开”。在AIONE最终用户身份认证尚未正式接入Cloud Run之前，真实数据库API保持IAM私有访问。

## 5. 本阶段不做

- 不把Cloud Run开放匿名访问；
- 不把OpenAI API Key写入仓库；
- 不把本地Preview身份机制带到云端；
- 不重构既有`product_opportunities`；
- 不迁移测样页面；
- 不一次建设完整ERP/HR专业Schema；
- 不把数据库迁移成功冒充成所有页面都已经切换真实API。

## 6. 完成标准

- Cloud SQL Preflight确认4张既有主表；
- Migration 0001/0010/0020/0030/0040/0050成功记录；
- 既有选品事实没有被覆盖；
- 私有Cloud Run `/health`显示`database: connected`；
- AI秘书status接口从Cloud Run返回；
- Cloud Logging没有新增关键异常；
- 现场执行记录和备份点可追溯。
