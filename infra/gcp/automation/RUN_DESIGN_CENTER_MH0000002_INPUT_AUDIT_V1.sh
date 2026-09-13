#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
cd "$REPO_ROOT"

source infra/gcp/cloud-shell/CURRENT_BASELINE.sh
assert_aione_current_baseline

BRANCH="feat/design-center-tag-card-hero-v1"
CURRENT_BRANCH="$(git branch --show-current)"
[[ "$CURRENT_BRANCH" == "$BRANCH" ]] || { echo "[AIONE][STOP] Audit must run from $BRANCH, current=$CURRENT_BRANCH" >&2; exit 20; }
[[ -z "$(git status --porcelain)" ]] || { echo '[AIONE][STOP] Repo must be clean before audit.' >&2; exit 21; }
git pull --ff-only origin "$BRANCH" >/dev/null

PROJECT_ID="$AIONE_PROJECT_ID"
REGION="$AIONE_REGION"
RUNTIME_SA="${AIONE_RUNTIME_SERVICE_ACCOUNT_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"
CONNECTION="$(gcloud sql instances describe "$AIONE_SQL_INSTANCE" --project="$PROJECT_ID" --format='value(connectionName)')"
SHORT_SHA="$(git rev-parse --short=7 HEAD)"
IMAGE="${REGION}-docker.pkg.dev/${PROJECT_ID}/${AIONE_ARTIFACT_REPO}/${AIONE_IMAGE_NAME}:design-center-input-audit-${SHORT_SHA}"
JOB="aione-design-center-input-audit"
PRODUCT_CODE="${AIONE_DESIGN_PRODUCT_CODE:-MH0000002}"
PASS_MARKER='DESIGN CENTER CURRENT INPUT AUDIT PASS - READ ONLY - NO IMAGE GENERATED'

cleanup() {
  gcloud run jobs delete "$JOB" --region="$REGION" --project="$PROJECT_ID" --quiet >/dev/null 2>&1 || true
}
trap cleanup EXIT

printf '\n[AIONE] Design Center CURRENT Input Audit V1\n'
printf 'Branch        : %s\n' "$BRANCH"
printf 'Branch SHA    : %s\n' "$SHORT_SHA"
printf 'Product Code  : %s\n' "$PRODUCT_CODE"
printf 'Database mode : READ ONLY\n'
printf 'DB migration  : NO\n'
printf 'AI generation : NO\n'
printf 'Traffic change: NO\n\n'

echo '[AIONE] 1/3 Build isolated branch image'
gcloud builds submit . --project="$PROJECT_ID" --tag="$IMAGE" --quiet >/dev/null

echo '[AIONE] 2/3 Run read-only audit against CURRENT database'
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

set +e
EXECUTE_OUTPUT="$(gcloud run jobs execute "$JOB" --region="$REGION" --project="$PROJECT_ID" --wait --format='value(metadata.name)' 2>&1)"
EXECUTE_CODE=$?
set -e
EXECUTION="$(tail -n 1 <<<"$EXECUTE_OUTPUT" | tr -d '\r')"
if [[ -z "$EXECUTION" || "$EXECUTION" != "$JOB-"* ]]; then
  EXECUTION="$(gcloud run jobs executions list --job="$JOB" --region="$REGION" --project="$PROJECT_ID" --sort-by='~metadata.creationTimestamp' --limit=1 --format='value(metadata.name)')"
fi
LOGS="$(gcloud beta run jobs executions logs read "$EXECUTION" --region="$REGION" --project="$PROJECT_ID" --limit=3000 2>&1 || true)"
printf '\n[AIONE] Authoritative audit logs\n%s\n' "$LOGS"
[[ "$EXECUTE_CODE" -eq 0 ]] || { echo '[AIONE][STOP] Cloud Run audit job failed.' >&2; exit 22; }
grep -q '"ok": true' <<<"$LOGS" || { echo '[AIONE][STOP] Audit did not return ok=true.' >&2; exit 23; }
grep -q "\"productCode\": \"${PRODUCT_CODE}\"" <<<"$LOGS" || { echo '[AIONE][STOP] Audit used the wrong Product.' >&2; exit 24; }
grep -q "$PASS_MARKER" <<<"$LOGS" || { echo '[AIONE][STOP] Audit PASS marker missing.' >&2; exit 25; }

echo '[AIONE] 3/3 STOP before migration, mutation, or image generation'
printf '\n[AIONE] DESIGN CENTER INPUT AUDIT COMPLETE\n'
printf 'Database write : NO\n'
printf 'Migration      : NO\n'
printf 'Image generated: NO\n'
printf 'Main changed   : NO\n'
