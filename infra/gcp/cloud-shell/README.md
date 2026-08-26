# AIONE V1.9｜Google Cloud真实数据运行阶段

目标：把已经在本地验证成功的AIONE后端/AI秘书链路，安全推进到正式Cloud SQL和私有Cloud Run运行环境。

## 为什么先保持Cloud Run私有

当前AIONE最终用户认证尚未正式接入Cloud Run。把数据库API直接设为公网匿名访问会让“美和内部默认共享”错误地变成“互联网公开”。因此V1.9默认：

- Cloud Run目标服务`aione-backend-v190`：私有；不覆盖现有`aione-backend`
- Cloud SQL：通过Cloud Run/Job的Cloud SQL连接
- DB密码：Secret Manager注入
- AI模式：先保持`preview`
- 写入：Preview Actor和System Writes在云端全部关闭

## 在Cloud Shell中的执行顺序

把`AIONE190`上传/解压到Cloud Shell后：

```bash
cd AIONE190/infra/gcp/cloud-shell
chmod +x *.sh
./00_DISCOVER.sh
./01_PREPARE_RUNTIME.sh
./02_BUILD_IMAGE.sh
./03_DB_PREFLIGHT.sh
# 人工确认Preflight输出正确后：
./04_DB_MIGRATE.sh
./05_DEPLOY_BACKEND_PRIVATE.sh
./06_SMOKE_TEST.sh
```

`04_DB_MIGRATE.sh`需要人工输入`MIGRATE AIONE`，避免误迁移错误项目/实例。


## V1.9.21｜生产子域名 API Bridge 快速路径

如果数据库迁移已经完成、当前目标只是修复 `aione.miwa-happyhouse.com/api/*` 在 Vercel 返回 404，使用：

```bash
cd <repo>/infra/gcp/cloud-shell
chmod +x *.sh
./RUN_C_SUBDOMAIN_BRIDGE.sh
```

`RUN_C_SUBDOMAIN_BRIDGE.sh` **不会执行数据库迁移**。它只会：

1. 构建 V1.9.21 Backend 镜像；
2. 继续以 `--no-allow-unauthenticated` 部署私有 Cloud Run；
3. 配置 Vercel OIDC → Google Workload Identity Federation → 专用 Cloud Run Invoker；
4. 执行双层认证 smoke test；
5. 输出需要填入 Vercel Production 的 5 个非秘密环境变量。

填入 Vercel 环境变量并重新部署 `main` 后，浏览器需要重新进行一次 Google 登录，然后再验证 `/api/v1/ai-secretary/status`。

## 自动发现

脚本优先从现有`aione-backend` Cloud Run服务读取：

- Cloud SQL connection name
- `DB_USER`
- `DB_NAME`
- `DB_PASS`的Secret Manager名称

如果现有服务无法提供某个值，复制`cloud-config.sh.example`为`cloud-config.sh`，只填写名称/ID，不要写密码或API Key。

## 迁移策略

迁移通过Cloud Run Job执行，因此：

- 与正式Cloud Run使用相同镜像
- 使用相同Cloud SQL连接方式
- 使用Secret Manager，不把密码暴露在命令历史
- Cloud Logging保留执行日志
- `max-retries=0`避免DDL失败后被自动重复重试
- 迁移前创建一次on-demand Cloud SQL backup

迁移文件按顺序执行：

1. `0001_schema_migrations.sql`
2. `0010_core_business_model.sql`
3. `0020_work_time_money_result.sql`
4. `0030_events_knowledge_ai.sql`
5. `0040_legacy_bridge_notes.sql`
6. `0050_ai_office_orchestration.sql`

这些迁移当前设计为增量，不故意`DROP`、`TRUNCATE`或重命名原有`people / external_identities / product_opportunities / activity_logs`。

## V1.9完成标准

只有以下都通过，才可以把“云端数据运行基础”标记为验证通过：

1. Preflight确认现有4张主表正确；
2. 迁移Job成功；
3. `schema_migrations`记录完整；
4. Cloud Run `/health`显示database connected；
5. AI秘书status接口可以从私有Cloud Run读取；
6. Cloud Logging无新的关键错误；
7. 原选品数据没有被覆盖。

真实OpenAI模型不是本阶段前置条件。先把真实数据/后端运行稳，再接模型。

## V1.9.26 | Shared Drive secure download

After installing V1.9.26, the secure file-download runtime can be deployed without re-running database migrations:

```bash
cd ~/miwa-code/infra/gcp/cloud-shell
./RUN_D_DRIVE_SECURE_DOWNLOAD.sh
```

The script prints the Cloud Run runtime service-account email. Add that account once to Shared Drive `美和集团（全球）` as **Viewer**. Then AIONE `下载原件` is delivered by the authenticated backend instead of a browser-direct Google download URL.
