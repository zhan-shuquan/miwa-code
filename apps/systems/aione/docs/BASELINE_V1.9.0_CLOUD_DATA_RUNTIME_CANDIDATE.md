# AIONE V1.9.0 CANDIDATE｜Cloud SQL + Cloud Run真实数据运行基线

**日期：2026-08-23**

## 本轮定位

V1.9不继续扩页面。它把V1.7的数据模型和V1.8 AI办公室执行链路推进到正式Google Cloud运行准备阶段。

## 新增工程资产

- 根目录`Dockerfile`和`.dockerignore`；
- `infra/gcp/cloud-shell/`标准云端执行脚本；
- Cloud SQL on-demand backup步骤；
- Cloud Run DB Preflight Job；
- Cloud Run DB Migration Job；
- 新的私有`aione-backend-v190`部署流程；
- 私有Cloud Run认证Smoke Test；
- 更完整的DB Preflight报告（既有主表、行数、目标表、已应用Migration）。

## 关键安全结论

1. 不覆盖当前`aione-backend`，先新建`aione-backend-v190`验证；
2. 云端关闭`AIONE_ALLOW_PREVIEW_ACTOR`；
3. 云端关闭`AIONE_ALLOW_SYSTEM_WRITES`；
4. DB密码只从Secret Manager注入；
5. Cloud Run保持私有，直到AIONE最终用户认证正式接入；
6. Migration前必须备份并执行只读Preflight；
7. Migration需要人工输入`MIGRATE AIONE`确认。

## 当前边界

本包已完成工程构建和本地静态/语法验证，但当前ChatGPT执行环境没有美和Google Cloud登录凭据，因此：

- Cloud SQL真实Preflight尚未执行；
- Cloud SQL真实Migration尚未执行；
- Cloud Build尚未执行；
- `aione-backend-v190`尚未在Cloud Run创建；
- 云端Smoke Test尚未执行。

以上必须在用户当前已登录的Google Cloud Shell中完成，不能冒充已完成。
