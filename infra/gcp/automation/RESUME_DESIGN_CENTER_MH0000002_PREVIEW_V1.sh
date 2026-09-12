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
TRUTH_JOB="aione-design-center-truth-fix-preview"
BOOTSTRAP_JOB="aione-design-center-bootstrap-preview"
PROXY_SESSION="aione-design-center-proxy"
PROXY_LOG="$HOME/aione_design_center_proxy.log"

[[ "$(git branch --show-current)" == "$BRANCH" ]] || { echo "[AIONE][STOP] Resume must run from $BRANCH" >&2; exit 20; }
[[ -z "$(git status --porcelain)" ]] || { echo '[AIONE][STOP] Repo must be clean before resume.' >&2; exit 21; }
git pull --ff-only origin "$BRANCH" >/dev/null

gcloud config set project "$AIONE_PROJECT_ID" >/dev/null
PROJECT_ID="$AIONE_PROJECT_ID"
REGION="$AIONE_REGION"
RUNTIME_SA="${AIONE_RUNTIME_SERVICE_ACCOUNT_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"
CONNECTION="$(gcloud sql instances describe "$AIONE_SQL_INSTANCE" --project="$PROJECT_ID" --format='value(connectionName)')"
SHORT_SHA="$(git rev-parse --short=7 HEAD)"
IMAGE="${REGION}-docker.pkg.dev/${PROJECT_ID}/${AIONE_ARTIFACT_REPO}/${AIONE_IMAGE_NAME}:design-center-preview-${SHORT_SHA}"

run_job_with_logs() {
  local job="$1"
  local label="$2"
  local expected_marker="$3"
  local exec_out code execution logs

  set +e
  exec_out="$(gcloud run jobs execute "$job" --region="$REGION" --project="$PROJECT_ID" --wait 2>&1)"
  code=$?
  set -e

  execution="$(gcloud run jobs executions list \
    --job="$job" \
    --region="$REGION" \
    --project="$PROJECT_ID" \
    --limit=1 \
    --format='value(metadata.name)' 2>/dev/null | head -n 1 || true)"

  logs=""
  if [[ -n "$execution" ]]; then
    logs="$(gcloud beta run jobs executions logs read "$execution" --region="$REGION" --project="$PROJECT_ID" --limit=3000 2>&1 || true)"
  fi

  printf '\n[AIONE] %s execution output\n%s\n' "$label" "$exec_out"
  printf '\n[AIONE] %s logs\n%s\n' "$label" "$logs"

  if [[ "$code" -ne 0 ]]; then
    echo "[AIONE][STOP] $label failed. The failure logs above are preserved; do not rerun earlier successful steps." >&2
    exit 30
  fi
  grep -Fq "$expected_marker" <<<"$logs" || {
    echo "[AIONE][STOP] $label completed without expected PASS marker: $expected_marker" >&2
    exit 31
  }
}

printf '\n[AIONE] Resume Design Center MH0000002 Preview V1\n'
printf 'Branch         : %s\n' "$BRANCH"
printf 'SHA            : %s\n' "$SHORT_SHA"
printf 'Product        : %s\n' "$PRODUCT_CODE"
printf 'CURRENT DB     : %s / %s\n' "$AIONE_SQL_INSTANCE" "$AIONE_DB_NAME"
printf 'Migration      : SKIP - 0100 already applied and previously PASS\n'
printf 'Main traffic   : UNCHANGED\n'
printf 'Image generate : NO\n\n'

echo '[AIONE] 1/5 Build latest isolated branch image only'
gcloud builds submit . --project="$PROJECT_ID" --tag="$IMAGE" --quiet >/dev/null

echo '[AIONE] 2/5 Correct MH0000002 Product Truth size to confirmed Japanese sock size'
gcloud run jobs deploy "$TRUTH_JOB" \
  --image="$IMAGE" --region="$REGION" --project="$PROJECT_ID" --service-account="$RUNTIME_SA" \
  --set-cloudsql-instances="$CONNECTION" \
  --set-env-vars="DB_USER=${AIONE_DB_USER},DB_NAME=${AIONE_DB_NAME},INSTANCE_UNIX_SOCKET=/cloudsql/${CONNECTION},NODE_ENV=production,AIONE_DESIGN_PRODUCT_CODE=${PRODUCT_CODE},AIONE_ALLOW_MH0000002_TRUTH_RECONCILE=YES" \
  --set-secrets="DB_PASS=${AIONE_DB_PASSWORD_SECRET}:latest" \
  --command=node --args=scripts/reconcile-mh0000002-product-truth-v1.js --tasks=1 --max-retries=0 --task-timeout=5m --quiet >/dev/null
run_job_with_logs "$TRUTH_JOB" 'Product Truth correction' 'MH0000002 PRODUCT TRUTH RECONCILE PASS - CONFIRMED FACTS ONLY'

echo '[AIONE] 3/5 Bootstrap MH0000002 SOCKONE tag card + Hero Spec'
gcloud run jobs deploy "$BOOTSTRAP_JOB" \
  --image="$IMAGE" --region="$REGION" --project="$PROJECT_ID" --service-account="$RUNTIME_SA" \
  --set-cloudsql-instances="$CONNECTION" \
  --set-env-vars="DB_USER=${AIONE_DB_USER},DB_NAME=${AIONE_DB_NAME},INSTANCE_UNIX_SOCKET=/cloudsql/${CONNECTION},NODE_ENV=production,AIONE_DESIGN_PRODUCT_CODE=${PRODUCT_CODE}" \
  --set-secrets="DB_PASS=${AIONE_DB_PASSWORD_SECRET}:latest" \
  --command=node --args=scripts/bootstrap-mh0000002-design-center-v1.js --tasks=1 --max-retries=0 --task-timeout=5m --quiet >/dev/null
run_job_with_logs "$BOOTSTRAP_JOB" 'Design Center bootstrap' 'MH0000002 DESIGN CENTER BOOTSTRAP PASS - NO IMAGE GENERATED'

echo '[AIONE] 4/5 Deploy isolated private Preview service and verify real workbench'
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
printf '%s' "$HEALTH" | python3 -c 'import json,sys; p=json.load(sys.stdin); assert p.get("ok") is True and p.get("database")=="connected"'

WORKBENCH="$(curl -fsS -H "Authorization: Bearer $IAM_TOKEN" "$SERVICE_URL/api/v1/design-center/workbench?product=${PRODUCT_CODE}")"
printf '%s' "$WORKBENCH" | python3 -c 'import json,sys; p=json.load(sys.stdin)["workbench"]; assert p["product"]["productCode"]=="MH0000002"; assert p["product"]["productData"]["supportedSize"]=="24–27cm"; assert p["designProfile"]["profileCode"]=="SOCKONE-SOCKS-DESIGN-V1"; assert p["tagCard"]["brand_name_en"]=="SOCKONE"; assert p["heroSpec"]["id"]; assert p["materials"]["counts"]["sku"]>=1; assert p["materials"]["counts"]["whiteBackgroundCandidates"]>=1; print("[AIONE] Real workbench PASS: SOCKONE + SIZE 24–27cm + Hero Spec + CURRENT materials")'

echo '[AIONE] 5/5 Start persistent authenticated Cloud Run proxy on port 8080'
if command -v tmux >/dev/null 2>&1; then
  tmux kill-session -t "$PROXY_SESSION" 2>/dev/null || true
  tmux new-session -d -s "$PROXY_SESSION" "gcloud run services proxy '$PREVIEW_SERVICE' --region='$REGION' --project='$PROJECT_ID' --port=8080 > '$PROXY_LOG' 2>&1"
else
  nohup gcloud run services proxy "$PREVIEW_SERVICE" --region="$REGION" --project="$PROJECT_ID" --port=8080 > "$PROXY_LOG" 2>&1 &
fi
sleep 4
curl -fsS http://127.0.0.1:8080/health >/dev/null
curl -fsS 'http://127.0.0.1:8080/design-center-v1.html?product=MH0000002' | grep -Fq '设计中心 V1'

# Clean temporary jobs only after the full resumed path passes.
gcloud run jobs delete "$TRUTH_JOB" --region="$REGION" --project="$PROJECT_ID" --quiet >/dev/null 2>&1 || true
gcloud run jobs delete "$BOOTSTRAP_JOB" --region="$REGION" --project="$PROJECT_ID" --quiet >/dev/null 2>&1 || true

printf '\n[AIONE] DESIGN CENTER MH0000002 RESUME PREVIEW READY\n'
printf 'Cloud Shell Web Preview port: 8080\n'
printf 'Page path                  : /design-center-v1.html?product=MH0000002\n'
printf 'Preview service            : %s\n' "$PREVIEW_SERVICE"
printf 'Supported size             : 24–27cm\n'
printf 'CURRENT main traffic       : UNCHANGED\n'
printf 'Migration repeated         : NO\n'
printf 'Image generated            : NO\n'
printf 'Proxy log                  : %s\n' "$PROXY_LOG"
