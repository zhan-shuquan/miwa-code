#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
cd "$REPO_ROOT"

source infra/gcp/cloud-shell/CURRENT_BASELINE.sh
assert_aione_current_baseline

BRANCH="main"
CURRENT_BRANCH="$(git branch --show-current)"
[[ "$CURRENT_BRANCH" == "$BRANCH" ]] || { echo "[AIONE][STOP] Discovery must run from $BRANCH, current=$CURRENT_BRANCH" >&2; exit 20; }
[[ -z "$(git status --porcelain)" ]] || { echo '[AIONE][STOP] Repo must be clean before discovery.' >&2; exit 21; }
git pull --ff-only origin "$BRANCH" >/dev/null

PROJECT_ID="$AIONE_PROJECT_ID"
REGION="$AIONE_REGION"
RUNTIME_SA="${AIONE_RUNTIME_SERVICE_ACCOUNT_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"
CONNECTION="$(gcloud sql instances describe "$AIONE_SQL_INSTANCE" --project="$PROJECT_ID" --format='value(connectionName)')"
SHORT_SHA="$(git rev-parse --short=7 HEAD)"
IMAGE="${REGION}-docker.pkg.dev/${PROJECT_ID}/${AIONE_ARTIFACT_REPO}/${AIONE_IMAGE_NAME}:mens-socks-discovery-${SHORT_SHA}"
JOB="aione-mens-socks-product-discovery"

cleanup() {
  gcloud run jobs delete "$JOB" --region="$REGION" --project="$PROJECT_ID" --quiet >/dev/null 2>&1 || true
}
trap cleanup EXIT

printf '\n[AIONE] Mens Socks Real Product Discovery V1\n'
printf 'Branch             : %s\n' "$BRANCH"
printf 'Branch SHA         : %s\n' "$SHORT_SHA"
printf 'Database           : %s\n' "$AIONE_SQL_INSTANCE"
printf 'Mode               : read-only discovery\n'
printf 'AI generation      : NO\n'
printf 'Main traffic change: NO\n\n'

echo '[AIONE] 1/3 Build isolated main image for read-only discovery'
gcloud builds submit . --project="$PROJECT_ID" --tag="$IMAGE" --quiet >/dev/null

echo '[AIONE] 2/3 Run read-only discovery against CURRENT database'
gcloud run jobs deploy "$JOB" \
  --image="$IMAGE" \
  --region="$REGION" \
  --project="$PROJECT_ID" \
  --service-account="$RUNTIME_SA" \
  --set-cloudsql-instances="$CONNECTION" \
  --set-env-vars="DB_USER=${AIONE_DB_USER},DB_NAME=${AIONE_DB_NAME},INSTANCE_UNIX_SOCKET=/cloudsql/${CONNECTION},NODE_ENV=production" \
  --set-secrets="DB_PASS=${AIONE_DB_PASSWORD_SECRET}:latest" \
  --command=node \
  --args=scripts/discover-mens-socks-trial-products.js \
  --tasks=1 \
  --max-retries=0 \
  --task-timeout=5m \
  --quiet >/dev/null

EXECUTION="$(gcloud run jobs execute "$JOB" --region="$REGION" --project="$PROJECT_ID" --wait --format='value(metadata.name)')"
LOGS="$(gcloud beta run jobs executions logs read "$EXECUTION" --region="$REGION" --project="$PROJECT_ID" --limit=2000 2>&1 || true)"
printf '\n[AIONE] Discovery result\n%s\n' "$LOGS"
grep -q 'MENS SOCKS REAL PRODUCT DISCOVERY PASS' <<<"$LOGS" || { echo '[AIONE][STOP] Discovery did not finish with PASS marker.' >&2; exit 22; }

echo '[AIONE] 3/3 STOP before any Gate C generation'
printf '\n[AIONE] RESULT\n'
printf 'AI generation : NO\n'
printf 'Database write: NO\n'
printf 'Main changed  : NO\n'
printf 'Traffic changed: NO\n'
printf 'Next action   : human confirms which discovered Product Code is a real men\x27s-socks Product\n'
printf '\n[AIONE] MENS SOCKS PRODUCT DISCOVERY COMPLETE - HUMAN PRODUCT IDENTITY CONFIRMATION REQUIRED\n'
