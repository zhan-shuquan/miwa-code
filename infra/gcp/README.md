# AIONE Google Cloud Infrastructure

AIONE Google Cloud 运行层只支持一套 CURRENT 基线：

`main -> aione-backend-current -> aione-pg-dev -> aione / aione_app`

正常后端发布采用自动化流程：

`merge main -> Cloud Build -> migration-state gate -> read-only preflight -> 0% candidate -> authenticated health -> 100% cutover -> post-cutover health / rollback`

唯一运行与运维事实源：

- `cloud-shell/CURRENT_BASELINE.sh`
- `cloudbuild/deploy-current.yaml`
- `automation/INSTALL_CURRENT_AUTOMATION.sh`
- `cloud-shell/README.md`

数据库 migration 不自动静默执行；Repo 与 CURRENT DB migration 状态不一致时，自动发布必须停止并进入单独审查的 CURRENT migration gate。
