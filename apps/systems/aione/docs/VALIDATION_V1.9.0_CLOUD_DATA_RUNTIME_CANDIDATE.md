# V1.9.0 Cloud Data Runtime验证记录

**状态：本地工程验证通过；Google Cloud现场验证待执行。**

## 已完成

- V1.8.1代码作为唯一基线；
- Docker构建定义已加入；
- Backend生产依赖固定为明确版本；
- Cloud Shell脚本使用当前项目/账号自动发现；
- 现有`aione-backend`仅用于读取配置，不覆盖；
- 目标Backend使用`aione-backend-v190`；
- DB Secret优先从现有Cloud Run配置自动发现；
- Cloud SQL connection name自动发现；
- Migration通过Cloud Run Job运行；
- Migration自动重试关闭；
- 迁移前强制备份；
- 私有Cloud Run Smoke Test使用Google ID Token；
- 云端保持Preview AI模式，真实OpenAI模型留待下一关。

## 需要现场确认

执行`infra/gcp/cloud-shell/03_DB_PREFLIGHT.sh`后，必须确认：

- `people`存在；
- `external_identities`存在；
- `product_opportunities`存在；
- `activity_logs`存在；
- 数据库名称确为AIONE正式库；
- people.id类型符合预期；
- 既有选品数据行数没有异常。

只有确认后才执行`04_DB_MIGRATE.sh`。

## 回滚边界

当前迁移为增量Schema，未提供自动Down Migration。若现场发生不可接受异常，优先停止新服务，并依据迁移前Cloud SQL备份/PITR恢复到独立实例后核对数据，不在不清楚影响时继续追加DDL。
