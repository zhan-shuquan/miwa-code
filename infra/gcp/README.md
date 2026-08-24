# AIONE Google Cloud Infrastructure

当前V1.9采用“先真实数据运行、再开放最终用户访问”的安全顺序：

`Cloud SQL backup → Cloud Build → Cloud Run Preflight Job → Cloud Run Migration Job → private Cloud Run Backend → authenticated smoke test`

正式Google Cloud执行入口：`cloud-shell/README.md`。
