# AIONE Google Cloud CURRENT Runtime

This directory contains the only supported Google Cloud runtime path for AIONE.

## Single CURRENT baseline

- Git branch: `main`
- Cloud Run: `aione-backend-current`
- Cloud SQL: `aione-pg-dev`
- Database: `aione`
- Database user: `aione_app`
- DB Secret Manager secret: `aione-db-password-dev`
- Artifact Registry repository/image: `aione/aione-backend`
- Persistent Cloud Run Job: `aione-db-preflight-current`
- AI mode: `live`

`CURRENT_BASELINE.sh` is the only source of truth for these runtime target names. `lib.sh` loads it directly and does not auto-discover a target from older services or databases.

## Supported operational entrypoints

### Deploy CURRENT backend

```bash
cd ~/miwa-code
git pull --ff-only origin main
bash infra/gcp/cloud-shell/09_DEPLOY_CURRENT_BACKEND.sh
```

The deployment gate builds `main`, runs the read-only preflight against `aione-pg-dev`, deploys only `aione-backend-current`, and verifies the Cloud SQL connection, database, user, and DB secret after deployment.

### Vercel -> private Cloud Run bridge

```bash
bash infra/gcp/cloud-shell/07_SETUP_VERCEL_OIDC_BRIDGE.sh
```

### Shared Drive runtime identity check

```bash
bash infra/gcp/cloud-shell/08_DRIVE_RUNTIME_ACCESS_CHECK.sh
```

## Database migrations

There is no generic legacy migration entrypoint. When a new schema migration is required, it must be reviewed as a CURRENT-only change and must target the locked `aione-pg-dev / aione / aione_app` baseline. Do not revive old discovery, dev, v190, legacy-inventory, reset, recurring-migrate, or alternate DATABASE_URL paths.

## Governance

The GitHub workflow `aione-current-baseline-guard.yml` fails if active CURRENT files reintroduce legacy runtime names or if removed legacy runtime scripts reappear.

Cloud Run remains private. Database credentials and OpenAI credentials are supplied through Secret Manager and must never be committed to Repo, pasted into chat, or stored in shell history.
