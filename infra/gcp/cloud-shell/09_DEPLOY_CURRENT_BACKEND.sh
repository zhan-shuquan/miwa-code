#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
cd "$REPO_ROOT"

CURRENT_BRANCH="$(git branch --show-current)"
[[ "$CURRENT_BRANCH" == "main" ]] || { echo "[AIONE][ERROR] Run this only from main. Current branch: $CURRENT_BRANCH" >&2; exit 1; }
[[ -z "$(git status --porcelain)" ]] || { echo "[AIONE][ERROR] Working tree is not clean." >&2; exit 1; }

git fetch origin main
git pull --ff-only origin main

CURRENT_SHA="$(git rev-parse --short=12 HEAD)"
export AIONE_SQL_INSTANCE="aione-pg-dev"
export AIONE_DB_PASSWORD_SECRET="aione-db-password-dev"
export AIONE_RUN_SERVICE="aione-backend-current"
export AIONE_IMAGE_TAG="main-${CURRENT_SHA}"
export AIONE_AI_MODE="live"

source "$SCRIPT_DIR/lib.sh"
require_db_secret
require_ai_secret

cat <<TXT

[AIONE] CURRENT formal runtime deployment
Code branch     : main
Code commit     : $CURRENT_SHA
Cloud SQL       : $SQL_INSTANCE
Backend service : $RUN_SERVICE
Image           : $IMAGE_URI

Legacy service/database are not modified by this script.
TXT

say "Build CURRENT main backend image"
cd "$REPO_ROOT"
gcloud builds submit --tag "$IMAGE_URI" --project="$PROJECT_ID" .

say "Run read-only preflight against CURRENT database"
gcloud run jobs deploy "$PREFLIGHT_JOB" \
  --image="$IMAGE_URI" \
  --region="$REGION" \
  --project="$PROJECT_ID" \
  --service-account="$RUNTIME_SA_EMAIL" \
  --set-cloudsql-instances="$INSTANCE_CONNECTION_NAME" \
  --set-env-vars="$(job_env_flags)" \
  --set-secrets="DB_PASS=${DB_PASSWORD_SECRET}:latest" \
  --command=npm \
  --args=run,db:preflight \
  --tasks=1 \
  --max-retries=0 \
  --task-timeout=10m

gcloud run jobs execute "$PREFLIGHT_JOB" --region="$REGION" --project="$PROJECT_ID" --wait

say "Deploy CURRENT backend without touching legacy service"
SECRET_BINDINGS="DB_PASS=${DB_PASSWORD_SECRET}:latest,OPENAI_API_KEY=${OPENAI_API_KEY_SECRET}:latest"
gcloud run deploy "$RUN_SERVICE" \
  --image="$IMAGE_URI" \
  --region="$REGION" \
  --project="$PROJECT_ID" \
  --service-account="$RUNTIME_SA_EMAIL" \
  --set-cloudsql-instances="$INSTANCE_CONNECTION_NAME" \
  --update-secrets="$SECRET_BINDINGS" \
  --update-env-vars="^@^DB_USER=${DB_USER}@DB_NAME=${DB_NAME}@INSTANCE_UNIX_SOCKET=${INSTANCE_UNIX_SOCKET}@NODE_ENV=production@AIONE_ALLOW_PREVIEW_ACTOR=false@AIONE_ALLOW_SYSTEM_WRITES=false@AIONE_REQUIRE_GOOGLE_AUTH=true@AIONE_GOOGLE_CLIENT_ID=${GOOGLE_CLIENT_ID}@AIONE_AI_MODE=${AI_MODE}@AIONE_AI_PROVIDER=${AI_PROVIDER}@AIONE_AI_MODEL=${AI_MODEL}@AIONE_DRIVE_PROXY_ENABLED=true@AIONE_CORS_ORIGINS=https://aione.miwa-happyhouse.com,https://aione-test.miwa-happyhouse.com" \
  --no-allow-unauthenticated

say "Verify CURRENT backend deployment"
gcloud run services describe "$RUN_SERVICE" \
  --region="$REGION" \
  --project="$PROJECT_ID" \
  --format='yaml(metadata.name,status.url,status.latestReadyRevisionName,spec.template.spec.serviceAccountName,spec.template.spec.containers[0].image)'

echo
printf '[AIONE] CURRENT backend deployed from main commit %s\n' "$CURRENT_SHA"
printf '[AIONE] Next gate: authenticated /health and /api/v1/me smoke test, then frontend API binding.\n'
