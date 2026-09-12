#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
cd "$REPO_ROOT"

source infra/gcp/cloud-shell/CURRENT_BASELINE.sh
assert_aione_current_baseline

BRANCH="main"
CURRENT_BRANCH="$(git branch --show-current)"
[[ "$CURRENT_BRANCH" == "$BRANCH" ]] || { echo "[AIONE][STOP] Curated material reconciliation must run from main, current=$CURRENT_BRANCH" >&2; exit 20; }
[[ -z "$(git status --porcelain)" ]] || { echo '[AIONE][STOP] Repo must be clean before reconciliation.' >&2; exit 21; }
git pull --ff-only origin "$BRANCH" >/dev/null

MODE="${1:-plan}"
[[ "$MODE" == "plan" || "$MODE" == "apply" ]] || { echo '[AIONE][STOP] Usage: ... [plan|apply]' >&2; exit 22; }

PROJECT_ID="$AIONE_PROJECT_ID"
REGION="$AIONE_REGION"
RUNTIME_SA="${AIONE_RUNTIME_SERVICE_ACCOUNT_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"
CONNECTION="$(gcloud sql instances describe "$AIONE_SQL_INSTANCE" --project="$PROJECT_ID" --format='value(connectionName)')"
SHORT_SHA="$(git rev-parse --short=7 HEAD)"
IMAGE="${REGION}-docker.pkg.dev/${PROJECT_ID}/${AIONE_ARTIFACT_REPO}/${AIONE_IMAGE_NAME}:curated-material-reconcile-${SHORT_SHA}"
JOB="aione-curated-material-reconcile"

# First real acceptance Product. The reusable backend script itself is Product/folder agnostic.
PRODUCT_CODE="MH0000002"
SKU_FOLDER_ID="1weX5_2WJlRyxbjl_oY31sf5rszllRZPK"
PRODUCT_FOLDER_ID="1nro_IKn903LpgWl-gmhOciGxgLxHfbTg"
REAL_FOLDER_ID="1Q3t2iY2UqFVZLrW3qULw8MzyE7i3HYuF"
HUMAN_PERSON_ID="86000"

cleanup() {
  gcloud run jobs delete "$JOB" --region="$REGION" --project="$PROJECT_ID" --quiet >/dev/null 2>&1 || true
}
trap cleanup EXIT

printf '\n[AIONE] Current Curated Material Reconciliation V1\n'
printf 'Mode            : %s\n' "$MODE"
printf 'Product Code    : %s\n' "$PRODUCT_CODE"
printf 'Branch          : %s\n' "$BRANCH"
printf 'AI generation   : NO\n'
if [[ "$MODE" == "plan" ]]; then
  printf 'Database write  : NO\n\n'
else
  printf 'Database write  : Human Material Confirmation only\n\n'
fi

echo '[AIONE] 1/3 Build isolated main image'
gcloud builds submit . --project="$PROJECT_ID" --tag="$IMAGE" --quiet >/dev/null

echo '[AIONE] 2/3 Reconcile live curated Drive folders against CURRENT ProductAsset provenance'
gcloud run jobs deploy "$JOB" \
  --image="$IMAGE" \
  --region="$REGION" \
  --project="$PROJECT_ID" \
  --service-account="$RUNTIME_SA" \
  --set-cloudsql-instances="$CONNECTION" \
  --set-env-vars="DB_USER=${AIONE_DB_USER},DB_NAME=${AIONE_DB_NAME},INSTANCE_UNIX_SOCKET=/cloudsql/${CONNECTION},NODE_ENV=production,AIONE_DRIVE_PROXY_ENABLED=true,AIONE_PRODUCT_CODE=${PRODUCT_CODE},AIONE_CURATED_RECONCILE_MODE=${MODE},AIONE_CURATED_FOLDER_SKU_ID=${SKU_FOLDER_ID},AIONE_CURATED_FOLDER_PRODUCT_ID=${PRODUCT_FOLDER_ID},AIONE_CURATED_FOLDER_REAL_ID=${REAL_FOLDER_ID},AIONE_HUMAN_PERSON_ID=${HUMAN_PERSON_ID}" \
  --set-secrets="DB_PASS=${AIONE_DB_PASSWORD_SECRET}:latest" \
  --command=node \
  --args=scripts/reconcile-current-curated-material-v1.js \
  --tasks=1 \
  --max-retries=0 \
  --task-timeout=10m \
  --quiet >/dev/null

set +e
EXECUTION="$(gcloud run jobs execute "$JOB" --region="$REGION" --project="$PROJECT_ID" --wait --format='value(metadata.name)')"
EXECUTE_STATUS=$?
set -e

LOGS=""
if [[ -n "$EXECUTION" ]]; then
  for i in $(seq 1 24); do
    LOGS="$(gcloud beta run jobs executions logs read "$EXECUTION" --region="$REGION" --project="$PROJECT_ID" --limit=3000 2>&1 || true)"
    if grep -q 'CURATED MATERIAL RECONCILIATION' <<<"$LOGS" || grep -q '"ok": false' <<<"$LOGS"; then
      break
    fi
    sleep 5
  done
fi
printf '\n[AIONE] Curated material authoritative logs\n%s\n' "$LOGS"

if [[ "$EXECUTE_STATUS" -ne 0 ]]; then
  echo '[AIONE][STOP] Reconciliation job did not complete successfully.' >&2
  exit "$EXECUTE_STATUS"
fi

if [[ "$MODE" == "plan" ]]; then
  grep -q 'CURATED MATERIAL RECONCILIATION PLAN PASS - READY TO CONFIRM' <<<"$LOGS" || { echo '[AIONE][STOP] Reconciliation plan is not ready to confirm.' >&2; exit 23; }
else
  grep -q 'CURATED MATERIAL RECONCILIATION APPLY PASS - CURRENT CONFIRMATION UPDATED' <<<"$LOGS" || { echo '[AIONE][STOP] Reconciliation apply did not PASS.' >&2; exit 24; }
fi

echo '[AIONE] 3/3 Reconciliation completed'
printf '\n[AIONE] RESULT\n'
printf 'AI generation : NO\n'
printf 'Traffic change: NO\n'
printf 'Main changed  : NO\n'
if [[ "$MODE" == "plan" ]]; then
  printf 'Next action   : if mapping is exact, run the same command with apply\n'
else
  printf 'Next action   : rerun Trial Gate C preflight; only zero blockers may proceed\n'
fi
