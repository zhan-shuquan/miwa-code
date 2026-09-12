#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
cd "$REPO_ROOT"

source infra/gcp/cloud-shell/CURRENT_BASELINE.sh
assert_aione_current_baseline

BRANCH="feat/design-center-tag-card-hero-v1"
PRODUCT_CODE="MH0000002"
PREVIEW_SERVICE="aione-design-center-preview"
MIGRATION_JOB="aione-design-center-migrate-preview"
BOOTSTRAP_JOB="aione-design-center-bootstrap-preview"
PROXY_SESSION="aione-design-center-proxy"
PROXY_LOG="$HOME/aione_design_center_proxy.log"

[[ "$(git branch --show-current)" == "$BRANCH" ]] || { echo "[AIONE][STOP] Preview must run from $BRANCH" >&2; exit 20; }
[[ -z "$(git status --porcelain)" ]] || { echo '[AIONE][STOP] Repo must be clean before preview deployment.' >&2; exit 21; }
git pull --ff-only origin "$BRANCH" >/dev/null

gcloud config set project "$AIONE_PROJECT_ID" >/dev/null
PROJECT_ID="$AIONE_PROJECT_ID"
REGION="$AIONE_REGION"
RUNTIME_SA="${AIONE_RUNTIME_SERVICE_ACCOUNT_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"
CONNECTION="$(gcloud sql instances describe "$AIONE_SQL_INSTANCE" --project="$PROJECT_ID" --format='value(connectionName)')"
SHORT_SHA="$(git rev-parse --short=7 HEAD)"
IMAGE="${REGION}-docker.pkg.dev/${PROJECT_ID}/${AIONE_ARTIFACT_REPO}/${AIONE_IMAGE_NAME}:design-center-preview-${SHORT_SHA}"

cleanup_jobs() {
  gcloud run jobs delete "$MIGRATION_JOB" --region="$REGION" --project="$PROJECT_ID" --quiet >/dev/null 2>&1 || true
  gcloud run jobs delete "$BOOTSTRAP_JOB" --region="$REGION" --project="$PROJECT_ID" --quiet >/dev/null 2>&1 || true
}
trap cleanup_jobs EXIT

read_job_logs() {
  local job="$1"
  local execution
  execution="$(gcloud run jobs executions list --job="$job" --region="$REGION" --project="$PROJECT_ID" --sort-by='~metadata.creationTimestamp' --limit=1 --format='value(metadata.name)')"
  gcloud beta run jobs executions logs read "$execution" --region="$REGION" --project="$PROJECT_ID" --limit=3000 2>&1 || true
}

printf '\n[AIONE] Design Center MH0000002 Preview V1\n'
printf 'Branch         : %s\n' "$BRANCH"
printf 'SHA            : %s\n' "$SHORT_SHA"
printf 'Product        : %s\n' "$PRODUCT_CODE"
printf 'CURRENT DB     : %s / %s\n' "$AIONE_SQL_INSTANCE" "$AIONE_DB_NAME"
printf 'Preview service: %s\n' "$PREVIEW_SERVICE"
printf 'Main traffic   : UNCHANGED\n'
printf 'Image generate : NO\n\n'

echo '[AIONE] 1/6 Build isolated branch image'
gcloud builds submit . --project="$PROJECT_ID" --tag="$IMAGE" --quiet >/dev/null

echo '[AIONE] 2/6 Apply reviewed Design Center migration 0100 only'
gcloud run jobs deploy "$MIGRATION_JOB" \
  --image="$IMAGE" --region="$REGION" --project="$PROJECT_ID" --service-account="$RUNTIME_SA" \
  --set-cloudsql-instances="$CONNECTION" \
  --set-env-vars="DB_USER=${AIONE_DB_USER},DB_NAME=${AIONE_DB_NAME},INSTANCE_UNIX_SOCKET=/cloudsql/${CONNECTION},NODE_ENV=production,AIONE_MIGRATION_VERSION=0100,AIONE_ALLOW_TARGETED_MIGRATION=YES" \
  --set-secrets="DB_PASS=${AIONE_DB_PASSWORD_SECRET}:latest" \
  --command=node --args=scripts/apply-target-migration.js --tasks=1 --max-retries=0 --task-timeout=10m --quiet >/dev/null

gcloud run jobs execute "$MIGRATION_JOB" --region="$REGION" --project="$PROJECT_ID" --wait >/dev/null
MIGRATION_LOGS="$(read_job_logs "$MIGRATION_JOB")"
printf '%s\n' "$MIGRATION_LOGS"
grep -q 'DESIGN CENTER TARGET MIGRATION 0100 PASS' <<<"$MIGRATION_LOGS" || { echo '[AIONE][STOP] Migration PASS marker missing.' >&2; exit 22; }

echo '[AIONE] 3/6 Bootstrap real MH0000002 SOCKONE tag card + Hero Spec'
gcloud run jobs deploy "$BOOTSTRAP_JOB" \
  --image="$IMAGE" --region="$REGION" --project="$PROJECT_ID" --service-account="$RUNTIME_SA" \
  --set-cloudsql-instances="$CONNECTION" \
  --set-env-vars="DB_USER=${AIONE_DB_USER},DB_NAME=${AIONE_DB_NAME},INSTANCE_UNIX_SOCKET=/cloudsql/${CONNECTION},NODE_ENV=production,AIONE_DESIGN_PRODUCT_CODE=${PRODUCT_CODE}" \
  --set-secrets="DB_PASS=${AIONE_DB_PASSWORD_SECRET}:latest" \
  --command=node --args=scripts/bootstrap-mh0000002-design-center-v1.js --tasks=1 --max-retries=0 --task-timeout=5m --quiet >/dev/null

gcloud run jobs execute "$BOOTSTRAP_JOB" --region="$REGION" --project="$PROJECT_ID" --wait >/dev/null
BOOTSTRAP_LOGS="$(read_job_logs "$BOOTSTRAP_JOB")"
printf '%s\n' "$BOOTSTRAP_LOGS"
grep -q 'MH0000002 DESIGN CENTER BOOTSTRAP PASS - NO IMAGE GENERATED' <<<"$BOOTSTRAP_LOGS" || { echo '[AIONE][STOP] Bootstrap PASS marker missing.' >&2; exit 23; }

echo '[AIONE] 4/6 Deploy private branch Preview service'
gcloud run deploy "$PREVIEW_SERVICE" \
  --image="$IMAGE" --region="$REGION" --project="$PROJECT_ID" --service-account="$RUNTIME_SA" \
  --set-cloudsql-instances="$CONNECTION" \
  --set-secrets="DB_PASS=${AIONE_DB_PASSWORD_SECRET}:latest" \
  --set-env-vars="DB_USER=${AIONE_DB_USER},DB_NAME=${AIONE_DB_NAME},INSTANCE_UNIX_SOCKET=/cloudsql/${CONNECTION},NODE_ENV=production,AIONE_ENABLE_DESIGN_CENTER_PREVIEW=true,AIONE_DESIGN_CENTER_PREVIEW_ROOT=/app/design-center-preview,AIONE_REQUIRE_GOOGLE_AUTH=false,AIONE_ALLOW_PREVIEW_ACTOR=true,AIONE_ALLOW_SYSTEM_WRITES=true" \
  --no-allow-unauthenticated --quiet >/dev/null

SERVICE_URL="$(gcloud run services describe "$PREVIEW_SERVICE" --region="$REGION" --project="$PROJECT_ID" --format='value(status.url)')"
IAM_TOKEN="$(gcloud auth print-identity-token --audiences="$SERVICE_URL")"
HEALTH="$(curl -fsS -H "Authorization: Bearer $IAM_TOKEN" "$SERVICE_URL/health")"
printf '%s\n' "$HEALTH"
printf '%s' "$HEALTH" | python3 -c 'import json,sys; p=json.load(sys.stdin); assert p.get("ok") is True and p.get("database")=="connected" and str((p.get("latestMigration") or {}).get("version"))=="0100"'

echo '[AIONE] 5/6 Verify real Design Center workbench'
WORKBENCH="$(curl -fsS -H "Authorization: Bearer $IAM_TOKEN" "$SERVICE_URL/api/v1/design-center/workbench?product=${PRODUCT_CODE}")"
printf '%s' "$WORKBENCH" | python3 -c 'import json,sys; p=json.load(sys.stdin)["workbench"]; assert p["product"]["productCode"]=="MH0000002"; assert p["designProfile"]["profileCode"]=="SOCKONE-SOCKS-DESIGN-V1"; assert p["tagCard"]["brand_name_en"]=="SOCKONE"; assert p["heroSpec"]["id"]; assert p["materials"]["counts"]["sku"]>=1; assert p["materials"]["counts"]["whiteBackgroundCandidates"]>=1; print("[AIONE] Real workbench PASS: SOCKONE + Hero Spec + CURRENT materials")'

echo '[AIONE] 6/6 Start persistent authenticated Cloud Run proxy on port 8080'
if command -v tmux >/dev/null 2>&1; then
  tmux kill-session -t "$PROXY_SESSION" 2>/dev/null || true
  tmux new-session -d -s "$PROXY_SESSION" "gcloud run services proxy '$PREVIEW_SERVICE' --region='$REGION' --project='$PROJECT_ID' --port=8080 > '$PROXY_LOG' 2>&1"
else
  nohup gcloud run services proxy "$PREVIEW_SERVICE" --region="$REGION" --project="$PROJECT_ID" --port=8080 > "$PROXY_LOG" 2>&1 &
fi
sleep 4
curl -fsS http://127.0.0.1:8080/health >/dev/null
curl -fsS 'http://127.0.0.1:8080/design-center-v1.html?product=MH0000002' | grep -Fq '设计中心 V1'

printf '\n[AIONE] DESIGN CENTER MH0000002 PREVIEW READY\n'
printf 'Cloud Shell Web Preview port: 8080\n'
printf 'Page path                  : /design-center-v1.html?product=MH0000002\n'
printf 'Preview service            : %s\n' "$PREVIEW_SERVICE"
printf 'CURRENT main traffic       : UNCHANGED\n'
printf 'Image generated            : NO\n'
printf 'Proxy log                  : %s\n' "$PROXY_LOG"
