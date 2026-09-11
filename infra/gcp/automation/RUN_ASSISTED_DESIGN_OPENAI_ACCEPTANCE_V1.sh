#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
cd "$REPO_ROOT"

source infra/gcp/cloud-shell/CURRENT_BASELINE.sh
assert_aione_current_baseline

[[ "$(git branch --show-current)" == "main" ]] || { echo '[AIONE][STOP] OpenAI image acceptance must run from main.' >&2; exit 20; }
[[ -z "$(git status --porcelain)" ]] || { echo '[AIONE][STOP] Repo must be clean before acceptance.' >&2; exit 21; }
git pull --ff-only origin main >/dev/null

resolve_gcloud_control_account() {
  local requested_email active_account
  local -a authenticated_accounts=()

  requested_email="$(printf '%s' "${AIONE_GCLOUD_CONTROL_EMAIL:-}" | tr '[:upper:]' '[:lower:]' | xargs)"
  active_account="$(gcloud config get-value account 2>/dev/null || true)"
  active_account="$(printf '%s' "$active_account" | tr '[:upper:]' '[:lower:]' | xargs)"
  [[ "$active_account" != "(unset)" ]] || active_account=""

  mapfile -t authenticated_accounts < <(
    gcloud auth list --format='value(account)' 2>/dev/null \
      | tr '[:upper:]' '[:lower:]' \
      | sed '/^[[:space:]]*$/d' \
      | sort -u
  )

  if [[ -n "$requested_email" ]]; then
    if ! printf '%s\n' "${authenticated_accounts[@]:-}" | grep -Fxq "$requested_email"; then
      echo "[AIONE][STOP] Requested Cloud control account is not authenticated in gcloud: $requested_email" >&2
      exit 24
    fi
    if [[ "$active_account" != "$requested_email" ]]; then
      gcloud config set account "$requested_email" >/dev/null
      active_account="$requested_email"
      echo "[AIONE] Selected requested gcloud control account: $active_account"
    fi
  elif [[ -z "$active_account" ]]; then
    if [[ "${#authenticated_accounts[@]}" -eq 1 ]]; then
      active_account="${authenticated_accounts[0]}"
      gcloud config set account "$active_account" >/dev/null
      echo "[AIONE] Auto-selected sole authenticated gcloud control account: $active_account"
    elif [[ "${#authenticated_accounts[@]}" -eq 0 ]]; then
      echo '[AIONE][STOP] No authenticated gcloud account is available. Run gcloud auth login once, then rerun this CURRENT entry.' >&2
      exit 24
    else
      echo '[AIONE][STOP] Multiple gcloud accounts are authenticated but none is active. Set AIONE_GCLOUD_CONTROL_EMAIL to the intended account and rerun.' >&2
      printf '[AIONE] Authenticated accounts: %s\n' "${authenticated_accounts[*]}" >&2
      exit 24
    fi
  fi

  [[ -n "$active_account" && "$active_account" == *@* ]] || { echo '[AIONE][STOP] Active Google Cloud control account email could not be resolved.' >&2; exit 24; }
  CLOUD_CONTROL_EMAIL="$active_account"
}

resolve_gcloud_control_account

PROJECT_ID="$AIONE_PROJECT_ID"
REGION="$AIONE_REGION"
RUNTIME_SA="${AIONE_RUNTIME_SERVICE_ACCOUNT_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"
SHORT_SHA="$(git rev-parse --short=7 HEAD)"
IMAGE="${REGION}-docker.pkg.dev/${PROJECT_ID}/${AIONE_ARTIFACT_REPO}/${AIONE_IMAGE_NAME}:main-${SHORT_SHA}"
CONNECTION="$(gcloud sql instances describe "$AIONE_SQL_INSTANCE" --project="$PROJECT_ID" --format='value(connectionName)')"
JOB="aione-assisted-design-openai-acceptance-current"
BUCKET="$AIONE_PRODUCT_ASSET_BUCKET"
PRODUCT_CODE="${AIONE_ACCEPT_IMAGE_PRODUCT_CODE:-MH0000002}"

cleanup() {
  gcloud run jobs delete "$JOB" --region="$REGION" --project="$PROJECT_ID" --quiet >/dev/null 2>&1 || true
}
trap cleanup EXIT

printf '\n[AIONE] Assisted Design OpenAI Live Technical Acceptance V1\n'
printf 'Main SHA              : %s\n' "$SHORT_SHA"
printf 'Product               : %s\n' "$PRODUCT_CODE"
printf 'Canvas                : 1000x1500\n'
printf 'Image Model           : %s\n' "$AIONE_AI_IMAGE_MODEL"
printf 'Image Quality         : %s\n' "$AIONE_AI_IMAGE_QUALITY"
printf 'Cloud Control Account : %s\n' "$CLOUD_CONTROL_EMAIL"
printf 'AIONE Actor           : system (technical acceptance only)\n'
printf 'Visual Review         : pending explicit human review after generation\n'
printf 'GCS Bucket            : %s\n\n' "$BUCKET"

wait_for_image() {
  for i in $(seq 1 90); do
    if gcloud artifacts docker images describe "$IMAGE" --project="$PROJECT_ID" >/dev/null 2>&1; then
      echo "[AIONE] Target image ready: $IMAGE"
      return 0
    fi
    if (( i % 6 == 0 )); then
      echo "[AIONE] Waiting for immutable image... $((i * 10))s"
    fi
    sleep 10
  done
  echo '[AIONE][STOP] CURRENT immutable image build timed out.' >&2
  return 22
}

wait_for_service_alignment() {
  for i in $(seq 1 90); do
    SERVICE_IMAGE="$(gcloud run services describe "$AIONE_RUN_SERVICE" --region="$REGION" --project="$PROJECT_ID" --format='value(spec.template.spec.containers[0].image)' 2>/dev/null || true)"
    if [[ "$SERVICE_IMAGE" == "$IMAGE" ]]; then
      echo "[AIONE] CURRENT service aligned: $SERVICE_IMAGE"
      return 0
    fi
    if (( i % 6 == 0 )); then
      echo "[AIONE] Waiting for service alignment... current=${SERVICE_IMAGE:-unknown} target=$IMAGE elapsed=$((i * 10))s"
    fi
    sleep 10
  done
  echo '[AIONE][STOP] CURRENT immutable image/service alignment timed out.' >&2
  return 23
}

echo '[AIONE] 1/4 Confirm CURRENT immutable image and deployed service alignment'
if ! gcloud artifacts docker images describe "$IMAGE" --project="$PROJECT_ID" >/dev/null 2>&1; then
  echo '[AIONE] Target image is missing; trigger CURRENT main build.'
  gcloud builds triggers run "$AIONE_DEPLOY_TRIGGER_NAME" --region=global --branch=main --project="$PROJECT_ID" --quiet >/dev/null
fi
wait_for_image
wait_for_service_alignment

echo '[AIONE] 2/4 Confirm canonical Product asset bucket exists'
gcloud storage buckets describe "gs://${BUCKET}" --project="$PROJECT_ID" >/dev/null

echo '[AIONE] 3/4 Deploy one ephemeral CURRENT OpenAI technical acceptance job'
gcloud run jobs deploy "$JOB" \
  --image="$IMAGE" \
  --region="$REGION" \
  --project="$PROJECT_ID" \
  --service-account="$RUNTIME_SA" \
  --set-cloudsql-instances="$CONNECTION" \
  --set-env-vars="DB_USER=${AIONE_DB_USER},DB_NAME=${AIONE_DB_NAME},INSTANCE_UNIX_SOCKET=/cloudsql/${CONNECTION},NODE_ENV=production,AIONE_PRODUCT_ASSET_BUCKET=${BUCKET},AIONE_ACCEPT_IMAGE_PRODUCT_CODE=${PRODUCT_CODE},AIONE_AI_IMAGE_MODEL=${AIONE_AI_IMAGE_MODEL},AIONE_AI_IMAGE_QUALITY=${AIONE_AI_IMAGE_QUALITY}" \
  --set-secrets="DB_PASS=${AIONE_DB_PASSWORD_SECRET}:latest,OPENAI_API_KEY=${AIONE_OPENAI_API_KEY_SECRET}:latest" \
  --command=npm \
  --args=run,design:openai:accept:current \
  --tasks=1 \
  --max-retries=0 \
  --task-timeout=20m \
  --memory=2Gi \
  --quiet >/dev/null

echo '[AIONE] 4/4 Execute real OpenAI generation and read authoritative logs'
set +e
OUTPUT="$(gcloud run jobs execute "$JOB" --region="$REGION" --project="$PROJECT_ID" --wait --format='value(metadata.name)' 2>&1)"
CODE=$?
set -e
printf '%s\n' "$OUTPUT"
EXECUTION="$(printf '%s\n' "$OUTPUT" | grep -Eo 'aione-assisted-design-openai-acceptance-current-[a-z0-9]+' | tail -n1 || true)"
if [[ -z "$EXECUTION" ]]; then
  EXECUTION="$(gcloud run jobs executions list --job="$JOB" --region="$REGION" --project="$PROJECT_ID" --sort-by='~metadata.creationTimestamp' --limit=1 --format='value(metadata.name)' 2>/dev/null || true)"
fi
[[ -n "$EXECUTION" ]] || { echo '[AIONE][STOP] OpenAI technical acceptance execution id missing.' >&2; exit 26; }

LOGS=""
for i in $(seq 1 24); do
  LOGS="$(gcloud beta run jobs executions logs read "$EXECUTION" --region="$REGION" --project="$PROJECT_ID" --limit=1000 2>&1 || true)"
  if grep -q 'ASSISTED DESIGN OPENAI LIVE ACCEPTANCE V1 PASS' <<<"$LOGS" || grep -q '"ok": false' <<<"$LOGS"; then
    break
  fi
  sleep 5
done
printf '\n[AIONE] authoritative logs\n%s\n' "$LOGS"
[[ "$CODE" -eq 0 ]] || { echo '[AIONE][STOP] OpenAI image technical acceptance failed. Root-cause logs are printed above.' >&2; exit 27; }
grep -q '"ok": true' <<<"$LOGS" || { echo '[AIONE][STOP] Acceptance did not return ok=true.' >&2; exit 28; }
grep -q "\"productCode\": \"${PRODUCT_CODE}\"" <<<"$LOGS" || { echo '[AIONE][STOP] Acceptance used the wrong Product.' >&2; exit 29; }
grep -q '"actorKind": "system"' <<<"$LOGS" || { echo '[AIONE][STOP] Technical acceptance must be attributed to system actor.' >&2; exit 30; }
grep -q '"executionMode": "technical_acceptance"' <<<"$LOGS" || { echo '[AIONE][STOP] Technical acceptance execution mode evidence missing.' >&2; exit 31; }
grep -q '"provider": "openai"' <<<"$LOGS" || { echo '[AIONE][STOP] OpenAI provider evidence missing.' >&2; exit 32; }
grep -q '"canvas": "1000x1500"' <<<"$LOGS" || { echo '[AIONE][STOP] 1000x1500 output evidence missing.' >&2; exit 33; }
grep -q '"reviewStatus": "pending"' <<<"$LOGS" || { echo '[AIONE][STOP] Output must remain pending explicit human visual review.' >&2; exit 34; }
grep -q '"gcsObject":' <<<"$LOGS" || { echo '[AIONE][STOP] DERIVED GCS provenance missing.' >&2; exit 35; }
grep -q 'ASSISTED DESIGN OPENAI LIVE ACCEPTANCE V1 PASS' <<<"$LOGS" || { echo '[AIONE][STOP] PASS marker missing.' >&2; exit 36; }

printf '\n[AIONE] ASSISTED DESIGN OPENAI LIVE ACCEPTANCE V1 PASS\n'
printf 'Verified: canonical SOURCE -> system technical acceptance -> OpenAI -> 1000x1500 DERIVED GCS ProductAsset -> pending explicit human visual review. Production human DesignTask approval remains unchanged.\n'
