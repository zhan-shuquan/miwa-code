#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
cd "$REPO_ROOT"

source infra/gcp/cloud-shell/CURRENT_BASELINE.sh
assert_aione_current_baseline

[[ "$(git branch --show-current)" == "main" ]] || { echo '[AIONE][STOP] Activation must run from main.' >&2; exit 20; }
[[ -z "$(git status --porcelain)" ]] || { echo '[AIONE][STOP] Repo must be clean before activation.' >&2; exit 21; }
git pull --ff-only origin main >/dev/null

PROJECT_ID="$AIONE_PROJECT_ID"
REGION="$AIONE_REGION"
RUNTIME_SA="${AIONE_RUNTIME_SERVICE_ACCOUNT_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"
SHORT_SHA="$(git rev-parse --short=7 HEAD)"
IMAGE="${REGION}-docker.pkg.dev/${PROJECT_ID}/${AIONE_ARTIFACT_REPO}/${AIONE_IMAGE_NAME}:main-${SHORT_SHA}"
CONNECTION="$(gcloud sql instances describe "$AIONE_SQL_INSTANCE" --project="$PROJECT_ID" --format='value(connectionName)')"

printf '\n[AIONE] Activate 1688 Selection Drive Inbox V1\n'
printf 'Main SHA     : %s\n' "$SHORT_SHA"
printf 'Image        : %s\n' "$IMAGE"
printf 'Cloud SQL    : %s\n' "$AIONE_SQL_INSTANCE"
printf 'Drive Inbox  : %s\n' "$AIONE_1688_SELECTION_INBOX_FOLDER_ID"
printf 'Import Job   : %s\n\n' "$AIONE_SELECTION_IMPORT_JOB"

gcloud config set project "$PROJECT_ID" >/dev/null
gcloud services enable run.googleapis.com cloudbuild.googleapis.com cloudscheduler.googleapis.com sqladmin.googleapis.com --project="$PROJECT_ID" >/dev/null

echo '[AIONE] 1/7 Wait for immutable main image built by Cloud Build'
for i in $(seq 1 60); do
  if gcloud artifacts docker images describe "$IMAGE" --project="$PROJECT_ID" >/dev/null 2>&1; then
    echo '[AIONE] Immutable image ready.'
    break
  fi
  if [[ "$i" -eq 60 ]]; then
    echo '[AIONE][STOP] main image was not produced within 10 minutes.' >&2
    exit 22
  fi
  sleep 10
done

echo '[AIONE] 2/7 Deploy canonical migration job in AUDIT mode'
gcloud run jobs deploy "$AIONE_MIGRATION_JOB" \
  --image="$IMAGE" \
  --region="$REGION" \
  --project="$PROJECT_ID" \
  --service-account="$RUNTIME_SA" \
  --set-cloudsql-instances="$CONNECTION" \
  --set-env-vars="DB_USER=${AIONE_DB_USER},DB_NAME=${AIONE_DB_NAME},INSTANCE_UNIX_SOCKET=/cloudsql/${CONNECTION},NODE_ENV=production" \
  --set-secrets="DB_PASS=${AIONE_DB_PASSWORD_SECRET}:latest" \
  --command=npm \
  --args=run,selection:audit:current \
  --tasks=1 \
  --max-retries=0 \
  --task-timeout=10m \
  --quiet

gcloud run jobs execute "$AIONE_MIGRATION_JOB" --region="$REGION" --project="$PROJECT_ID" --wait >/dev/null

echo '[AIONE] Selection lifecycle audit PASS.'

echo '[AIONE] 3/7 Apply reviewed CURRENT migrations'
gcloud run jobs deploy "$AIONE_MIGRATION_JOB" \
  --image="$IMAGE" \
  --region="$REGION" \
  --project="$PROJECT_ID" \
  --service-account="$RUNTIME_SA" \
  --set-cloudsql-instances="$CONNECTION" \
  --set-env-vars="DB_USER=${AIONE_DB_USER},DB_NAME=${AIONE_DB_NAME},INSTANCE_UNIX_SOCKET=/cloudsql/${CONNECTION},NODE_ENV=production" \
  --set-secrets="DB_PASS=${AIONE_DB_PASSWORD_SECRET}:latest" \
  --command=npm \
  --args=run,db:migrate \
  --tasks=1 \
  --max-retries=0 \
  --task-timeout=10m \
  --quiet

gcloud run jobs execute "$AIONE_MIGRATION_JOB" --region="$REGION" --project="$PROJECT_ID" --wait >/dev/null

echo '[AIONE] Migration execution PASS.'

echo '[AIONE] 4/7 Re-run the single main -> CURRENT deployment trigger'
BUILD_ID="$(gcloud builds triggers run "$AIONE_DEPLOY_TRIGGER_NAME" \
  --project="$PROJECT_ID" --region=global --branch=main --format='value(metadata.build.id)')"
[[ -n "$BUILD_ID" ]] || { echo '[AIONE][STOP] Could not resolve triggered build id.' >&2; exit 23; }
printf 'Build ID      : %s\n' "$BUILD_ID"

for i in $(seq 1 120); do
  STATUS="$(gcloud builds describe "$BUILD_ID" --project="$PROJECT_ID" --region=global --format='value(status)')"
  case "$STATUS" in
    SUCCESS) echo '[AIONE] CURRENT backend deployment PASS.'; break ;;
    FAILURE|CANCELLED|EXPIRED|TIMEOUT|INTERNAL_ERROR)
      echo "[AIONE][STOP] CURRENT backend deployment failed: $STATUS" >&2
      exit 24
      ;;
  esac
  if [[ "$i" -eq 120 ]]; then
    echo '[AIONE][STOP] Deployment did not finish within 20 minutes.' >&2
    exit 25
  fi
  sleep 10
done

echo '[AIONE] 5/7 Deploy the single canonical selection import job'
gcloud run jobs deploy "$AIONE_SELECTION_IMPORT_JOB" \
  --image="$IMAGE" \
  --region="$REGION" \
  --project="$PROJECT_ID" \
  --service-account="$RUNTIME_SA" \
  --set-cloudsql-instances="$CONNECTION" \
  --set-env-vars="DB_USER=${AIONE_DB_USER},DB_NAME=${AIONE_DB_NAME},INSTANCE_UNIX_SOCKET=/cloudsql/${CONNECTION},NODE_ENV=production,AIONE_DRIVE_PROXY_ENABLED=true,AIONE_SHARED_DRIVE_ID=${AIONE_SHARED_DRIVE_ID},AIONE_1688_SELECTION_INBOX_FOLDER_ID=${AIONE_1688_SELECTION_INBOX_FOLDER_ID}" \
  --set-secrets="DB_PASS=${AIONE_DB_PASSWORD_SECRET}:latest" \
  --command=npm \
  --args=run,selection:import:1688-drive \
  --tasks=1 \
  --max-retries=0 \
  --task-timeout=10m \
  --quiet

echo '[AIONE] 6/7 Execute one real import against CURRENT Drive Inbox'
gcloud run jobs execute "$AIONE_SELECTION_IMPORT_JOB" --region="$REGION" --project="$PROJECT_ID" --wait >/dev/null

echo '[AIONE] First real Inbox import PASS.'

echo '[AIONE] 7/7 Install deterministic 10-minute scheduler'
gcloud run jobs add-iam-policy-binding "$AIONE_SELECTION_IMPORT_JOB" \
  --region="$REGION" --project="$PROJECT_ID" \
  --member="serviceAccount:${RUNTIME_SA}" --role='roles/run.invoker' --quiet >/dev/null

SCHEDULER_URI="https://run.googleapis.com/v2/projects/${PROJECT_ID}/locations/${REGION}/jobs/${AIONE_SELECTION_IMPORT_JOB}:run"
if gcloud scheduler jobs describe "$AIONE_SELECTION_IMPORT_SCHEDULER" --location="$REGION" --project="$PROJECT_ID" >/dev/null 2>&1; then
  gcloud scheduler jobs update http "$AIONE_SELECTION_IMPORT_SCHEDULER" \
    --location="$REGION" --project="$PROJECT_ID" \
    --schedule='*/10 * * * *' --time-zone='Asia/Tokyo' \
    --uri="$SCHEDULER_URI" --http-method=POST \
    --oauth-service-account-email="$RUNTIME_SA" \
    --oauth-token-scope='https://www.googleapis.com/auth/cloud-platform' \
    --quiet
else
  gcloud scheduler jobs create http "$AIONE_SELECTION_IMPORT_SCHEDULER" \
    --location="$REGION" --project="$PROJECT_ID" \
    --schedule='*/10 * * * *' --time-zone='Asia/Tokyo' \
    --uri="$SCHEDULER_URI" --http-method=POST \
    --oauth-service-account-email="$RUNTIME_SA" \
    --oauth-token-scope='https://www.googleapis.com/auth/cloud-platform' \
    --quiet
fi

echo '[AIONE] Verify CURRENT resources'
gcloud run jobs describe "$AIONE_SELECTION_IMPORT_JOB" --region="$REGION" --project="$PROJECT_ID" --format='value(metadata.name,status.conditions[0].state)'
gcloud scheduler jobs describe "$AIONE_SELECTION_IMPORT_SCHEDULER" --location="$REGION" --project="$PROJECT_ID" --format='value(name,state,schedule,timeZone)'

printf '\n[AIONE] 1688 SELECTION INBOX V1 ACTIVATED\n'
printf 'Normal employee operation:\n'
printf '  1688: tag direct when needed -> remark weight(g) -> move to name group -> export Excel + ZIP\n'
printf '  Drive: drop Excel + ZIP into 01_1688选品提交\n'
printf '  AIONE: scans every 10 minutes -> imports -> deduplicates -> numbers -> matches ZIP\n'
