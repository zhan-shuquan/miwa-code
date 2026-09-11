#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
cd "$REPO_ROOT"

source infra/gcp/cloud-shell/CURRENT_BASELINE.sh
assert_aione_current_baseline

EXPECTED_BRANCH="feat/ai-design-template-set-v1"
CURRENT_BRANCH="$(git branch --show-current)"
[[ "$CURRENT_BRANCH" == "$EXPECTED_BRANCH" ]] || {
  echo "[AIONE][STOP] Gate C must run from ${EXPECTED_BRANCH}; current=${CURRENT_BRANCH}" >&2
  exit 20
}
[[ -z "$(git status --porcelain)" ]] || {
  echo '[AIONE][STOP] Repo must be clean before Gate C.' >&2
  exit 21
}
git pull --ff-only origin "$EXPECTED_BRANCH" >/dev/null

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
    printf '%s\n' "${authenticated_accounts[@]:-}" | grep -Fxq "$requested_email" || {
      echo "[AIONE][STOP] Requested Cloud control account is not authenticated: $requested_email" >&2
      exit 22
    }
    if [[ "$active_account" != "$requested_email" ]]; then
      gcloud config set account "$requested_email" >/dev/null
      active_account="$requested_email"
    fi
  elif [[ -z "$active_account" ]]; then
    if [[ "${#authenticated_accounts[@]}" -eq 1 ]]; then
      active_account="${authenticated_accounts[0]}"
      gcloud config set account "$active_account" >/dev/null
    else
      echo '[AIONE][STOP] Select exactly one authenticated gcloud control account or set AIONE_GCLOUD_CONTROL_EMAIL.' >&2
      exit 22
    fi
  fi

  [[ -n "$active_account" && "$active_account" == *@* ]] || {
    echo '[AIONE][STOP] Active Google Cloud control account email could not be resolved.' >&2
    exit 22
  }
  CLOUD_CONTROL_EMAIL="$active_account"
}

resolve_gcloud_control_account

PROJECT_ID="$AIONE_PROJECT_ID"
REGION="$AIONE_REGION"
RUNTIME_SA="${AIONE_RUNTIME_SERVICE_ACCOUNT_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"
FULL_SHA="$(git rev-parse HEAD)"
SHORT_SHA="$(git rev-parse --short=7 HEAD)"
IMAGE="${REGION}-docker.pkg.dev/${PROJECT_ID}/${AIONE_ARTIFACT_REPO}/${AIONE_IMAGE_NAME}:gate-c-${SHORT_SHA}"
CONNECTION="$(gcloud sql instances describe "$AIONE_SQL_INSTANCE" --project="$PROJECT_ID" --format='value(connectionName)')"
JOB="aione-design-template-set-gate-c"
PRODUCT_CODE="$(printf '%s' "${AIONE_ACCEPT_IMAGE_PRODUCT_CODE:-}" | xargs)"
[[ -n "$PRODUCT_CODE" ]] || {
  echo '[AIONE][STOP] Set AIONE_ACCEPT_IMAGE_PRODUCT_CODE to the exact CURRENT test Product. Gate C will not fall back to an old sample Product.' >&2
  exit 23
}

cleanup() {
  gcloud run jobs delete "$JOB" --region="$REGION" --project="$PROJECT_ID" --quiet >/dev/null 2>&1 || true
}
trap cleanup EXIT

printf '\n[AIONE] Design Template Set Gate C V1\n'
printf 'Branch                : %s\n' "$CURRENT_BRANCH"
printf 'SHA                   : %s\n' "$FULL_SHA"
printf 'Product               : %s\n' "$PRODUCT_CODE"
printf 'Template Set          : dtset_socks_rakuten_base_v1\n'
printf 'Template Page         : benefit-01\n'
printf 'Cloud Control Account : %s\n' "$CLOUD_CONTROL_EMAIL"
printf 'CURRENT Database      : %s / %s\n' "$AIONE_SQL_INSTANCE" "$AIONE_DB_NAME"
printf 'Schema 0096           : transactionally temporary if not already applied\n'
printf 'Output Review         : pending explicit human visual review\n\n'

echo '[AIONE] 1/4 Build isolated immutable Gate C image from PR branch'
gcloud builds submit \
  --project="$PROJECT_ID" \
  --region="$REGION" \
  --tag="$IMAGE" \
  --quiet \
  .

echo '[AIONE] 2/4 Deploy one ephemeral Gate C Cloud Run Job'
gcloud run jobs deploy "$JOB" \
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

echo '[AIONE] 3/4 Execute real Product -> selected Template Set/Page -> live OpenAI Gate C'
set +e
OUTPUT="$(gcloud run jobs execute "$JOB" --region="$REGION" --project="$PROJECT_ID" --wait --format='value(metadata.name)' 2>&1)"
CODE=$?
set -e
printf '%s\n' "$OUTPUT"
EXECUTION="$(printf '%s\n' "$OUTPUT" | grep -Eo 'aione-design-template-set-gate-c-[a-z0-9]+' | tail -n1 || true)"
if [[ -z "$EXECUTION" ]]; then
  EXECUTION="$(gcloud run jobs executions list --job="$JOB" --region="$REGION" --project="$PROJECT_ID" --sort-by='~metadata.creationTimestamp' --limit=1 --format='value(metadata.name)' 2>/dev/null || true)"
fi
[[ -n "$EXECUTION" ]] || {
  echo '[AIONE][STOP] Gate C execution id missing.' >&2
  exit 24
}

LOGS=""
for i in $(seq 1 36); do
  LOGS="$(gcloud beta run jobs executions logs read "$EXECUTION" --region="$REGION" --project="$PROJECT_ID" --limit=1500 2>&1 || true)"
  if grep -q 'DESIGN TEMPLATE SET GATE C LIVE OPENAI PASS' <<<"$LOGS" || grep -q '"ok": false' <<<"$LOGS"; then
    break
  fi
  sleep 5
done

printf '\n[AIONE] authoritative Gate C logs\n%s\n' "$LOGS"
[[ "$CODE" -eq 0 ]] || {
  echo '[AIONE][STOP] Gate C Cloud Run Job failed. Root-cause logs are printed above.' >&2
  exit 25
}
grep -q '"ok": true' <<<"$LOGS" || { echo '[AIONE][STOP] Gate C did not return ok=true.' >&2; exit 26; }
grep -q "\"productCode\": \"${PRODUCT_CODE}\"" <<<"$LOGS" || { echo '[AIONE][STOP] Gate C returned a different Product than requested.' >&2; exit 27; }
grep -q '"gateC": "live-openai-derived-product-asset-created"' <<<"$LOGS" || { echo '[AIONE][STOP] Gate C proof marker missing.' >&2; exit 28; }
grep -q '"reviewStatus": "pending"' <<<"$LOGS" || { echo '[AIONE][STOP] Gate C output must remain pending human review.' >&2; exit 29; }
grep -q '"mainMergeAllowed": false' <<<"$LOGS" || { echo '[AIONE][STOP] Gate C must not authorize merge before human visual review.' >&2; exit 30; }

echo '[AIONE] 4/4 Gate C technical path PASS; human visual review is now the only remaining gate'
printf '\n[AIONE] DESIGN TEMPLATE SET GATE C TECHNICAL PASS\n'
printf 'Do not merge PR #86 until the generated DERIVED image is visually reviewed for product fidelity.\n'
