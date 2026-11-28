# AIONE Google Cloud CURRENT Runtime

This directory documents the only supported Google Cloud runtime path for AIONE.

## Single CURRENT baseline

- Git branch: `main`
- Cloud Run: `aione-backend-current`
- Cloud SQL: `aione-pg-dev`
- Database: `aione`
- Database user: `aione_app`
- DB Secret Manager secret: `aione-db-password-dev`
- Artifact Registry repository/image: `aione/aione-backend`
- Persistent Cloud Run Job: `aione-db-preflight-current`
- Automated deploy trigger: `aione-current-deploy`
- AI mode: `live`

`CURRENT_BASELINE.sh` is the only source of truth for runtime and deployment target names. No service/database discovery or alternate `DATABASE_URL` path is supported.

## Normal operation after automation is installed

Backend operation is no longer a daily Cloud Shell procedure.

```text
branch development
  -> GitHub checks
  -> merge main
  -> Cloud Build trigger
  -> immutable backend image
  -> CURRENT DB migration-state gate
  -> read-only DB preflight
  -> 0% traffic candidate revision
  -> authenticated candidate /health
  -> automatic 100% traffic cutover
  -> post-cutover health verification
  -> rollback traffic automatically if final health fails
```

Frontend hosting continues to deploy from `main` through the existing Vercel Git integration. Hosted AIONE uses only the same-origin `/api/*` bridge to the private CURRENT Cloud Run backend.

## One-time automation installation

After the automation branch is merged into `main`, run once from Cloud Shell:

```bash
cd ~/miwa-code
git pull --ff-only origin main
bash infra/gcp/automation/INSTALL_CURRENT_AUTOMATION.sh
```

The installer creates/updates only one trigger: `aione-current-deploy`, and uses the dedicated `aione-deployer` service account. It does not create another runtime baseline.

## Manual emergency deployment

`09_DEPLOY_CURRENT_BACKEND.sh` remains only as an emergency/manual fallback for the same locked CURRENT baseline. It is not the normal operating method.

## Database migrations

Database schema changes are intentionally not silently migrated by the automatic deployment pipeline. The pipeline compares Repo migration state with `/health.latestMigration`; if they differ, deployment stops before image cutover.

A new migration therefore requires a separately reviewed CURRENT-only migration action against:

`aione-pg-dev / aione / aione_app`

After the reviewed migration is applied, the normal automatic deployment can continue. No generic legacy migration job or alternate database target is supported.

## Other one-time/runtime integrations

### Vercel -> private Cloud Run bridge

```bash
bash infra/gcp/cloud-shell/07_SETUP_VERCEL_OIDC_BRIDGE.sh
```

### Shared Drive runtime identity check

```bash
bash infra/gcp/cloud-shell/08_DRIVE_RUNTIME_ACCESS_CHECK.sh
```

## Governance

`aione-current-baseline-guard.yml` blocks legacy runtime targets, removed deployment paths, alternate `AIONE_DATABASE_URL` workflows, and missing automated-deployment assets.

Cloud Run remains private. Database credentials and OpenAI credentials are supplied through Secret Manager and must never be committed to Repo, pasted into chat, or stored in shell history.

## Settings PR preview before merge

The existing `deploy-current.yaml` pipeline now has `_AIONE_DEPLOY_MODE=preview`.
It runs the same reviewed migration and preflight stages and stops after private
candidate health, before traffic cutover. It compares the active revision traffic
before and after deployment. Default `release` mode keeps the normal main workflow.
No second Cloud Run service or database baseline is created.

From a clean detached worktree of the reviewed PR commit:

```bash
AIONE_PREVIEW_COMMIT=<reviewed-full-commit-sha> bash infra/gcp/automation/PREVIEW_CURRENT_SETTINGS_BACKEND.sh
```

This is not a fully isolated database: reviewed migrations still apply to CURRENT
`aione-pg-dev/aione`, and authenticated preview saves use that same data. The command
itself does not seed catalogs, edit product records, grant maintenance permissions,
or publish to Rakuten. Verify the account's maintenance permission separately.

After Cloud Build returns `PREVIEW PASS`, use its exact `PREVIEW_BACKEND_URL` as the
branch-scoped Preview variable `AIONE_SETTINGS_PREVIEW_BACKEND_URL` on the existing
`miwa-aione-test` Vercel project, then rebuild the preview. The bridge accepts only
`candidate-<sha>` tags of the fixed CURRENT service on the settings branch; IAM
still uses the base CURRENT service audience. Production and other branches ignore
the override. Removing the branch variable and rebuilding returns to CURRENT.
