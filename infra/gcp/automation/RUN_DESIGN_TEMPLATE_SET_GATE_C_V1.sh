#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
cd "$REPO_ROOT"

source infra/gcp/cloud-shell/CURRENT_BASELINE.sh
assert_aione_current_baseline

BRANCH="feat/ai-design-template-set-v1"
CURRENT_BRANCH="$(git branch --show-current)"
[[ "$CURRENT_BRANCH" == "$BRANCH" ]] || { echo "[AIONE][STOP] Gate C must run from $BRANCH, current=$CURRENT_BRANCH" >&2; exit 20; }
[[ -z "$(git status --porcelain)" ]] || { echo '[AIONE][STOP] Repo must be clean before Gate C.' >&2; exit 21; }
git pull --ff-only origin "$BRANCH" >/dev/null

resolve_gcloud_control_account() {
  local requested_email active_account
  local -a authenticated_accounts=()
  requested_email="$(printf '%s' "${AIONE_GCLOUD_CONTROL_EMAIL:-}" | tr '[:upper:]' '[:lower:]' | xargs)"
  active_account="$(gcloud config get-value account 2>/dev/null || true)"
  active_account="$(printf '%s' "$active_account" | tr '[:upper:]' '[:lower:]' | xargs)"
  [[ "$active_account" != "(unset)" ]] || active_account=""
  mapfile -t authenticated_accounts < <(gcloud auth list --format='value(account)' 2>/dev/null | tr '[:upper:]' '[:lower:]' | sed '/^[[:space:]]*$/d' | sort -u)
  if [[ -n "$requested_email" ]]; then
    printf '%s\n' "${authenticated_accounts[@]:-}" | grep -Fxq "$requested_email" || { echo "[AIONE][STOP] Requested gcloud account not authenticated: $requested_email" >&2; exit 22; }
    if [[ "$active_account" != "$requested_email" ]]; then
      gcloud config set account "$requested_email" >/dev/null
      active_account="$requested_email"
    fi
  elif [[ -z "$active_account" ]]; then
    if [[ "${#authenticated_accounts[@]}" -eq 1 ]]; then
      active_account="${authenticated_accounts[0]}"
      gcloud config set account "$active_account" >/dev/null
    else
      echo '[AIONE][STOP] Resolve the active gcloud account first.' >&2
      printf '[AIONE] Authenticated accounts: %s\n' "${authenticated_accounts[*]:-none}" >&2
      exit 22
    fi
  fi
  CLOUD_CONTROL_EMAIL="$active_account"
}
resolve_gcloud_control_account

PROJECT_ID="$AIONE_PROJECT_ID"
REGION="$AIONE_REGION"
RUNTIME_SA="${AIONE_RUNTIME_SERVICE_ACCOUNT_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"
CONNECTION="$(gcloud sql instances describe "$AIONE_SQL_INSTANCE" --project="$PROJECT_ID" --format='value(connectionName)')"
SHORT_SHA="$(git rev-parse --short=7 HEAD)"
IMAGE="${REGION}-docker.pkg.dev/${PROJECT_ID}/${AIONE_ARTIFACT_REPO}/${AIONE_IMAGE_NAME}:gate-c-${SHORT_SHA}"
DISCOVERY_JOB="aione-design-gate-c-discovery"
GATE_C_JOB="aione-design-template-set-gate-c"
PRODUCT_CODE="${AIONE_ACCEPT_IMAGE_PRODUCT_CODE:-}"
PASS_MARKER='DESIGN TEMPLATE SET GATE C LIVE OPENAI PASS - VISUAL-ONLY HUMAN REVIEW REQUIRED'

cleanup() {
  gcloud run jobs delete "$DISCOVERY_JOB" --region="$REGION" --project="$PROJECT_ID" --quiet >/dev/null 2>&1 || true
  gcloud run jobs delete "$GATE_C_JOB" --region="$REGION" --project="$PROJECT_ID" --quiet >/dev/null 2>&1 || true
}
trap cleanup EXIT

printf '\n[AIONE] Design Template Set Gate C V1\n'
printf 'Branch                : %s\n' "$BRANCH"
printf 'Branch SHA            : %s\n' "$SHORT_SHA"
printf 'Cloud Control Account : %s\n' "$CLOUD_CONTROL_EMAIL"
printf 'AI stage              : visual-only (no copy)\n'
printf 'Copy stage            : deterministic overlay after AI\n'
printf 'Production traffic    : unchanged\n'
printf 'Main merge            : forbidden until human visual review\n\n'

echo '[AIONE] 1/5 Build isolated branch image (no deployment, no traffic change)'
gcloud builds submit . --project="$PROJECT_ID" --tag="$IMAGE" --quiet >/dev/null

echo '[AIONE] 2/5 Discover real Products eligible for Gate C'
gcloud run jobs deploy "$DISCOVERY_JOB" \
  --image="$IMAGE" \
  --region="$REGION" \
  --project="$PROJECT_ID" \
  --service-account="$RUNTIME_SA" \
  --set-cloudsql-instances="$CONNECTION" \
  --set-env-vars="DB_USER=${AIONE_DB_USER},DB_NAME=${AIONE_DB_NAME},INSTANCE_UNIX_SOCKET=/cloudsql/${CONNECTION},NODE_ENV=production" \
  --set-secrets="DB_PASS=${AIONE_DB_PASSWORD_SECRET}:latest" \
  --command=node \
  --args=scripts/discover-design-gate-c-products.js \
  --tasks=1 \
  --max-retries=0 \
  --task-timeout=5m \
  --quiet >/dev/null

DISCOVERY_EXEC="$(gcloud run jobs execute "$DISCOVERY_JOB" --region="$REGION" --project="$PROJECT_ID" --wait --format='value(metadata.name)')"
DISCOVERY_LOGS="$(gcloud beta run jobs executions logs read "$DISCOVERY_EXEC" --region="$REGION" --project="$PROJECT_ID" --limit=1000 2>&1 || true)"
printf '\n[AIONE] Eligible Gate C Products\n%s\n' "$DISCOVERY_LOGS"
grep -q 'GATE C PRODUCT DISCOVERY PASS' <<<"$DISCOVERY_LOGS" || { echo '[AIONE][STOP] Product discovery failed.' >&2; exit 23; }

if [[ -z "$PRODUCT_CODE" ]]; then
  mapfile -t CANDIDATES < <(printf '%s\n' "$DISCOVERY_LOGS" | sed -n 's/^.*\[AIONE_GATE_C_CANDIDATE\] \([^ |]*\).*/\1/p' | awk 'NF' | sort -u)
  if [[ "${#CANDIDATES[@]}" -eq 1 ]]; then
    PRODUCT_CODE="${CANDIDATES[0]}"
    echo "[AIONE] Auto-selected the only eligible Product: $PRODUCT_CODE"
  elif [[ "${#CANDIDATES[@]}" -eq 0 ]]; then
    echo '[AIONE][STOP] No real Product currently satisfies Gate C prerequisites.' >&2
    exit 24
  else
    echo '[AIONE][STOP] Multiple eligible Products exist. To protect product truth, Gate C will not guess.' >&2
    printf '[AIONE] Candidates: %s\n' "${CANDIDATES[*]}" >&2
    echo '[AIONE] Rerun the same entry with AIONE_ACCEPT_IMAGE_PRODUCT_CODE=<correct ProductCode>.' >&2
    exit 25
  fi
fi

echo "[AIONE] 3/5 Selected real Product: $PRODUCT_CODE"

echo '[AIONE] 4/5 Run live visual-only Gate C in an ephemeral Cloud Run Job'
gcloud run jobs deploy "$GATE_C_JOB" \
  --image="$IMAGE" \
  --region="$REGION" \
  --project="$PROJECT_ID" \
  --service-account="$RUNTIME_SA" \
  --set-cloudsql-instances="$CONNECTION" \
  --set-env-vars="DB_USER=${AIONE_DB_USER},DB_NAME=${AIONE_DB_NAME},INSTANCE_UNIX_SOCKET=/cloudsql/${CONNECTION},NODE_ENV=production,AIONE_PRODUCT_ASSET_BUCKET=${AIONE_PRODUCT_ASSET_BUCKET},AIONE_ACCEPT_IMAGE_PRODUCT_CODE=${PRODUCT_CODE},AIONE_AI_IMAGE_MODEL=${AIONE_AI_IMAGE_MODEL},AIONE_AI_IMAGE_QUALITY=${AIONE_AI_IMAGE_QUALITY}" \
  --set-secrets="DB_PASS=${AIONE_DB_PASSWORD_SECRET}:latest,OPENAI_API_KEY=${AIONE_OPENAI_API_KEY_SECRET}:latest" \
  --command=npm \
  --args=run,design:template-set:gate-c \
  --tasks=1 \
  --max-retries=0 \
  --task-timeout=20m \
  --memory=2Gi \
  --quiet >/dev/null

set +e
OUTPUT="$(gcloud run jobs execute "$GATE_C_JOB" --region="$REGION" --project="$PROJECT_ID" --wait --format='value(metadata.name)' 2>&1)"
CODE=$?
set -e
printf '%s\n' "$OUTPUT"
EXECUTION="$(printf '%s\n' "$OUTPUT" | grep -Eo 'aione-design-template-set-gate-c-[a-z0-9]+' | tail -n1 || true)"
[[ -n "$EXECUTION" ]] || EXECUTION="$(gcloud run jobs executions list --job="$GATE_C_JOB" --region="$REGION" --project="$PROJECT_ID" --sort-by='~metadata.creationTimestamp' --limit=1 --format='value(metadata.name)' 2>/dev/null || true)"
[[ -n "$EXECUTION" ]] || { echo '[AIONE][STOP] Gate C execution id missing.' >&2; exit 26; }

LOGS=""
for i in $(seq 1 24); do
  LOGS="$(gcloud beta run jobs executions logs read "$EXECUTION" --region="$REGION" --project="$PROJECT_ID" --limit=1500 2>&1 || true)"
  if grep -q "$PASS_MARKER" <<<"$LOGS" || grep -q '"ok": false' <<<"$LOGS"; then
    break
  fi
  sleep 5
done
printf '\n[AIONE] Gate C authoritative logs\n%s\n' "$LOGS"
[[ "$CODE" -eq 0 ]] || { echo '[AIONE][STOP] Gate C execution failed. See logs above.' >&2; exit 27; }
grep -q '"ok": true' <<<"$LOGS" || { echo '[AIONE][STOP] Gate C did not return ok=true.' >&2; exit 28; }
grep -q "\"productCode\": \"${PRODUCT_CODE}\"" <<<"$LOGS" || { echo '[AIONE][STOP] Gate C used the wrong Product.' >&2; exit 29; }
grep -q '"textPolicy": "visual_only"' <<<"$LOGS" || { echo '[AIONE][STOP] Gate C did not prove visual_only text policy.' >&2; exit 30; }
grep -q '"copyLayerMode": "deterministic_overlay"' <<<"$LOGS" || { echo '[AIONE][STOP] Gate C did not prove deterministic copy-layer mode.' >&2; exit 31; }
grep -q '"reviewStatus": "pending"' <<<"$LOGS" || { echo '[AIONE][STOP] Gate C output must remain pending human visual review.' >&2; exit 32; }
grep -q "$PASS_MARKER" <<<"$LOGS" || { echo '[AIONE][STOP] Visual-only Gate C PASS marker missing.' >&2; exit 33; }

echo '[AIONE] 5/5 Technical visual-only Gate C passed. STOP before merge.'
printf '\n[AIONE] RESULT\n'
printf 'Product        : %s\n' "$PRODUCT_CODE"
printf 'Branch SHA     : %s\n' "$SHORT_SHA"
printf 'AI text policy : visual_only\n'
printf 'Copy layer     : deterministic_overlay\n'
printf 'Main changed   : NO\n'
printf 'Traffic changed: NO\n'
printf 'Next action    : human visual review of the generated visual-only DERIVED image\n'
printf '\n[AIONE] GATE C TECHNICAL PASS - VISUAL-ONLY HUMAN REVIEW REQUIRED BEFORE MERGE\n'
