#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
cd "$REPO_ROOT"

source infra/gcp/cloud-shell/CURRENT_BASELINE.sh
assert_aione_current_baseline

BRANCH="feat/design-center-tag-card-hero-v1"
CURRENT_BRANCH="$(git branch --show-current)"
[[ "$CURRENT_BRANCH" == "$BRANCH" ]] || { echo "[AIONE][STOP] Reconcile must run from $BRANCH, current=$CURRENT_BRANCH" >&2; exit 30; }
[[ -z "$(git status --porcelain)" ]] || { echo '[AIONE][STOP] Repo must be clean before reconcile.' >&2; exit 31; }
git pull --ff-only origin "$BRANCH" >/dev/null

PROJECT_ID="$AIONE_PROJECT_ID"
REGION="$AIONE_REGION"
RUNTIME_SA="${AIONE_RUNTIME_SERVICE_ACCOUNT_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"
CONNECTION="$(gcloud sql instances describe "$AIONE_SQL_INSTANCE" --project="$PROJECT_ID" --format='value(connectionName)')"
SHORT_SHA="$(git rev-parse --short=7 HEAD)"
IMAGE="${REGION}-docker.pkg.dev/${PROJECT_ID}/${AIONE_ARTIFACT_REPO}/${AIONE_IMAGE_NAME}:mh0000002-truth-${SHORT_SHA}"
JOB="aione-mh0000002-truth-reconcile"
PRODUCT_CODE="MH0000002"
RECONCILE_PASS='MH0000002 PRODUCT TRUTH RECONCILE PASS - CONFIRMED FACTS ONLY'
AUDIT_PASS='DESIGN CENTER CURRENT INPUT AUDIT PASS - READ ONLY - NO IMAGE GENERATED'

cleanup() {
  gcloud run jobs delete "$JOB" --region="$REGION" --project="$PROJECT_ID" --quiet >/dev/null 2>&1 || true
}
trap cleanup EXIT

run_job_and_logs() {
  local label="$1"
  local output code execution logs
  set +e
  output="$(gcloud run jobs execute "$JOB" --region="$REGION" --project="$PROJECT_ID" --wait --format='value(metadata.name)' 2>&1)"
  code=$?
  set -e
  execution="$(tail -n 1 <<<"$output" | tr -d '\r')"
  if [[ -z "$execution" || "$execution" != "$JOB-"* ]]; then
    execution="$(gcloud run jobs executions list --job="$JOB" --region="$REGION" --project="$PROJECT_ID" --sort-by='~metadata.creationTimestamp' --limit=1 --format='value(metadata.name)')"
  fi
  logs="$(gcloud beta run jobs executions logs read "$execution" --region="$REGION" --project="$PROJECT_ID" --limit=3000 2>&1 || true)"
  printf '\n[AIONE] %s logs\n%s\n' "$label" "$logs"
  [[ "$code" -eq 0 ]] || { echo "[AIONE][STOP] $label failed." >&2; exit 32; }
  LAST_LOGS="$logs"
}

printf '\n[AIONE] MH0000002 Product Truth Reconcile V1\n'
printf 'Branch        : %s\n' "$BRANCH"
printf 'Branch SHA    : %s\n' "$SHORT_SHA"
printf 'Product Code  : %s\n' "$PRODUCT_CODE"
printf 'Write scope   : five confirmed Product Truth keys only\n'
printf 'DB migration  : NO\n'
printf 'AI generation : NO\n'
printf 'Main change   : NO\n\n'

echo '[AIONE] 1/4 Build isolated branch image'
gcloud builds submit . --project="$PROJECT_ID" --tag="$IMAGE" --quiet >/dev/null

echo '[AIONE] 2/4 Reconcile missing confirmed Product Truth only'
gcloud run jobs deploy "$JOB" \
  --image="$IMAGE" \
  --region="$REGION" \
  --project="$PROJECT_ID" \
  --service-account="$RUNTIME_SA" \
  --set-cloudsql-instances="$CONNECTION" \
  --set-env-vars="DB_USER=${AIONE_DB_USER},DB_NAME=${AIONE_DB_NAME},INSTANCE_UNIX_SOCKET=/cloudsql/${CONNECTION},NODE_ENV=production,AIONE_DESIGN_PRODUCT_CODE=${PRODUCT_CODE},AIONE_ALLOW_MH0000002_TRUTH_RECONCILE=YES" \
  --set-secrets="DB_PASS=${AIONE_DB_PASSWORD_SECRET}:latest" \
  --command=node \
  --args=scripts/reconcile-mh0000002-product-truth-v1.js \
  --tasks=1 \
  --max-retries=0 \
  --task-timeout=5m \
  --quiet >/dev/null
run_job_and_logs 'Product Truth reconcile'
grep -q '"ok": true' <<<"$LAST_LOGS" || { echo '[AIONE][STOP] Reconcile did not return ok=true.' >&2; exit 33; }
grep -q "$RECONCILE_PASS" <<<"$LAST_LOGS" || { echo '[AIONE][STOP] Reconcile PASS marker missing.' >&2; exit 34; }

echo '[AIONE] 3/4 Re-run real Design Center audit using the same image'
gcloud run jobs deploy "$JOB" \
  --image="$IMAGE" \
  --region="$REGION" \
  --project="$PROJECT_ID" \
  --service-account="$RUNTIME_SA" \
  --set-cloudsql-instances="$CONNECTION" \
  --set-env-vars="DB_USER=${AIONE_DB_USER},DB_NAME=${AIONE_DB_NAME},INSTANCE_UNIX_SOCKET=/cloudsql/${CONNECTION},NODE_ENV=production,AIONE_DESIGN_PRODUCT_CODE=${PRODUCT_CODE}" \
  --set-secrets="DB_PASS=${AIONE_DB_PASSWORD_SECRET}:latest" \
  --command=node \
  --args=scripts/audit-design-center-current-inputs.js \
  --tasks=1 \
  --max-retries=0 \
  --task-timeout=5m \
  --quiet >/dev/null
run_job_and_logs 'Post-write read-only audit'
grep -q "$AUDIT_PASS" <<<"$LAST_LOGS" || { echo '[AIONE][STOP] Post-write audit PASS marker missing.' >&2; exit 35; }
grep -q '"setCount": 6' <<<"$LAST_LOGS" || { echo '[AIONE][STOP] setCount postcondition missing.' >&2; exit 36; }
grep -q '"supportedSize": "39–45"' <<<"$LAST_LOGS" || { echo '[AIONE][STOP] supportedSize postcondition missing.' >&2; exit 37; }
grep -q '"approvedPrimaryValue": "秋冬男士中筒条纹6双套装"' <<<"$LAST_LOGS" || { echo '[AIONE][STOP] approvedPrimaryValue postcondition missing.' >&2; exit 38; }

echo '[AIONE] 4/4 COMPLETE - continue Design Center real-product flow'
printf '\n[AIONE] MH0000002 PRODUCT TRUTH READY FOR DESIGN CENTER\n'
printf 'Database write : YES - only missing confirmed truth keys; conflicting non-null values abort\n'
printf 'Migration      : NO\n'
printf 'Image generated: NO\n'
printf 'Main changed   : NO\n'
