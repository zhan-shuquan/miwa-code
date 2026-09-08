# AIONE Cloud SQL 实例基线 V1.0

状态：CURRENT IMPLEMENTATION FACT
日期：2026-09-08
适用项目：美和AIONE一体化工作平台

## 1. 当前正式后端

Cloud Run 服务：

```text
aione-backend-v190
```

区域：

```text
asia-northeast1
```

## 2. 当前实际连接的Cloud SQL实例

2026-09-08通过Cloud Shell读取Cloud Run服务annotation确认：

```text
run.googleapis.com/cloudsql-instances
= miwa-aione:asia-northeast1:aione-postgres
```

因此当前Implementation Truth为：

> `aione-backend-v190` 当前实际连接 `aione-postgres`。

在新的正式架构决策出现前，所有AIONE数据库Preflight、Migration、Schema审计和选品数据库实施均以`aione-postgres`为CURRENT目标实例。

## 3. 另一个实例

项目中同时存在：

```text
aione-pg-dev
```

当前尚未确认其是否仍承担有效开发用途，因此状态定义为：

```text
REVIEW_REQUIRED
```

不得在未确认用途前删除，也不得把它当作CURRENT正式数据库继续迁移。

## 4. 治理规则

- CURRENT数据库实例：`aione-postgres`
- `aione-pg-dev`：待审计，不作为当前正式技术事实源
- 后续Cloud SQL脚本应显式或可验证地指向CURRENT实例
- Migration前必须确认目标实例名称
- 不允许两个实例同时演化为两套AIONE正式Schema

## 5. 下一步

在`aione-postgres`上继续：

1. 核对`product_opportunities`唯一现有记录
2. 判断其是否为测试/历史数据
3. 根据真实数据决定Canonical迁移策略
4. 生成`0090_selection_opportunity_import_foundation.sql`
