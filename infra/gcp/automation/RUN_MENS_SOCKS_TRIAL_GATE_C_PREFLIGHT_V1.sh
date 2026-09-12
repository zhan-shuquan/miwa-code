#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
cd "$REPO_ROOT"

source infra/gcp/cloud-shell/CURRENT_BASELINE.sh
assert_aione_current_baseline

BRANCH="main"
CURRENT_BRANCH="$(git branch --show-current)"
[[ "$CURRENT_BRANCH" == "$BRANCH" ]] || { echo "[AIONE][STOP] Preflight must run from $BRANCH, current=$CURRENT_BRANCH" >&2; exit 20; }
[[ -z "$(git status --porcelain)" ]] || { echo '[AIONE][STOP] Repo must be clean before preflight.' >&2; exit 21; }
git pull --ff-only origin "$BRANCH" >/dev/null

PROJECT_ID="$AIONE_PROJECT_ID"
REGION="$AIONE_REGION"
RUNTIME_SA="${AIONE_RUNTIME_SERVICE_ACCOUNT_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"
CONNECTION="$(gcloud sql instances describe "$AIONE_SQL_INSTANCE" --project="$PROJECT_ID" --format='value(connectionName)')"
SHORT_SHA="$(git rev-parse --short=7 HEAD)"
IMAGE="${REGION}-docker.pkg.dev/${PROJECT_ID}/${AIONE_ARTIFACT_REPO}/${AIONE_IMAGE_NAME}:mens-socks-trial-preflight-${SHORT_SHA}"
JOB="aione-mens-socks-trial-preflight"
PRODUCT_CODE="${AIONE_ACCEPT_IMAGE_PRODUCT_CODE:-MH0000002}"
PASS_MARKER='MENS SOCKS TRIAL GATE C PREFLIGHT PASS - NO IMAGE GENERATED'

cleanup() {
  gcloud run jobs delete "$JOB" --region="$REGION" --project="$PROJECT_ID" --quiet >/dev/null 2>&1 || true
}
trap cleanup EXIT

printf '\n[AIONE] Mens Socks Trial Gate C Preflight V1\n'
printf 'Branch          : %s\n' "$BRANCH"
printf 'Branch SHA      : %s\n' "$SHORT_SHA"
printf 'Product Code    : %s\n' "$PRODUCT_CODE"
printf 'Database mode   : READ ONLY\n'
printf 'AI generation   : NO\n'
printf 'Template active : NO\n'
printf 'Traffic change  : NO\n\n'

echo '[AIONE] 1/3 Build isolated main image'
gcloud builds submit . --project="$PROJECT_ID" --tag="$IMAGE" --quiet >/dev/null

echo '[AIONE] 2/3 Run read-only trial preflight against CURRENT database'
gcloud run jobs deploy "$JOB" \
  --image="$IMAGE" \
  --region="$REGION" \
  --project="$PROJECT_ID" \
  --service-account="$RUNTIME_SA" \
  --set-cloudsql-instances="$CONNECTION" \
  --set-env-vars="DB_USER=${AIONE_DB_USER},DB_NAME=${AIONE_DB_NAME},INSTANCE_UNIX_SOCKET=/cloudsql/${CONNECTION},NODE_ENV=production,AIONE_ACCEPT_IMAGE_PRODUCT_CODE=${PRODUCT_CODE}" \
  --set-secrets="DB_PASS=${AIONE_DB_PASSWORD_SECRET}:latest" \
  --command=node \
  --args=scripts/preflight-mens-socks-trial-gate-c.js \
  --tasks=1 \
  --max-retries=0 \
  --task-timeout=5m \
  --quiet >/dev/null

EXECUTION="$(gcloud run jobs execute "$JOB" --region="$REGION" --project="$PROJECT_ID" --wait --format='value(metadata.name)')"
LOGS=""
for i in $(seq 1 24); do
  LOGS="$(gcloud beta run jobs executions logs read "$EXECUTION" --region="$REGION" --project="$PROJECT_ID" --limit=3000 2>&1 || true)"
  if grep -q "$PASS_MARKER" <<<"$LOGS" || grep -q '"ok": false' <<<"$LOGS"; then
    break
  fi
  sleep 5
done
printf '\n[AIONE] Trial preflight authoritative logs\n%s\n' "$LOGS"
grep -q '"ok": true' <<<"$LOGS" || { echo '[AIONE][STOP] Trial preflight did not return ok=true.' >&2; exit 22; }
grep -q "\"productCode\": \"${PRODUCT_CODE}\"" <<<"$LOGS" || { echo '[AIONE][STOP] Trial preflight used the wrong Product.' >&2; exit 23; }
grep -q "$PASS_MARKER" <<<"$LOGS" || { echo '[AIONE][STOP] Trial preflight PASS marker missing.' >&2; exit 24; }

echo '[AIONE] 3/3 STOP before any image generation'
printf '\n[AIONE] RESULT\n'
printf 'AI generation : NO\n'
printf 'Database write: NO\n'
printf 'Main changed  : NO\n'
printf 'Traffic changed: NO\n'
printf 'Next action   : review facts/assets/blockers for pages 01/04/12 before Gate C generation\n'
printf '\n[AIONE] MENS SOCKS TRIAL PREFLIGHT COMPLETE - NO IMAGE GENERATED\n'
