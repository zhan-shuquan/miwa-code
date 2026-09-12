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
  echo "[AIONE][STOP] Product material Human Gate must run from ${EXPECTED_BRANCH}; current=${CURRENT_BRANCH}" >&2
  exit 20
}
[[ -z "$(git status --porcelain)" ]] || {
  echo '[AIONE][STOP] Repo must be clean before Product material Human Gate.' >&2
  exit 21
}
git pull --ff-only origin "$EXPECTED_BRANCH" >/dev/null

MODE="$(printf '%s' "${AIONE_MATERIAL_MODE:-inspect}" | tr '[:upper:]' '[:lower:]' | xargs)"
PRODUCT_CODE="$(printf '%s' "${AIONE_MATERIAL_PRODUCT_CODE:-}" | xargs)"
HUMAN_EMAIL="$(printf '%s' "${AIONE_MATERIAL_HUMAN_EMAIL:-}" | tr '[:upper:]' '[:lower:]' | xargs)"

[[ "$MODE" == "inspect" || "$MODE" == "confirm" ]] || {
  echo '[AIONE][STOP] AIONE_MATERIAL_MODE must be inspect or confirm.' >&2
  exit 22
}
[[ -n "$PRODUCT_CODE" ]] || {
  echo '[AIONE][STOP] AIONE_MATERIAL_PRODUCT_CODE is required.' >&2
  exit 23
}
if [[ "$MODE" == "confirm" && -z "$HUMAN_EMAIL" ]]; then
  echo '[AIONE][STOP] AIONE_MATERIAL_HUMAN_EMAIL is required for confirm mode.' >&2
  exit 24
fi

PROJECT_ID="$AIONE_PROJECT_ID"
REGION="$AIONE_REGION"
RUNTIME_SA="${AIONE_RUNTIME_SERVICE_ACCOUNT_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"
SHORT_SHA="$(git rev-parse --short=7 HEAD)"
IMAGE="${REGION}-docker.pkg.dev/${PROJECT_ID}/${AIONE_ARTIFACT_REPO}/${AIONE_IMAGE_NAME}:material-gate-${SHORT_SHA}"
CONNECTION="$(gcloud sql instances describe "$AIONE_SQL_INSTANCE" --project="$PROJECT_ID" --format='value(connectionName)')"
JOB="aione-product-material-human-gate"

cleanup() {
  gcloud run jobs delete "$JOB" --region="$REGION" --project="$PROJECT_ID" --quiet >/dev/null 2>&1 || true
}
trap cleanup EXIT

printf '\n[AIONE] Product Material Human Gate V1\n'
printf 'Mode            : %s\n' "$MODE"
printf 'Product         : %s\n' "$PRODUCT_CODE"
printf 'Human Email     : %s\n' "${HUMAN_EMAIL:-not-required-for-inspect}"
printf 'Folder Contract : 01_SKU图 / 02_产品图 / 03_实拍图\n\n'

echo '[AIONE] 1/3 Build isolated Human Gate image from PR branch'
gcloud builds submit \
  --project="$PROJECT_ID" \
  --region="$REGION" \
  --tag="$IMAGE" \
  --quiet \
  .

echo '[AIONE] 2/3 Deploy one ephemeral Product material Human Gate job'
ENV_VARS="DB_USER=${AIONE_DB_USER},DB_NAME=${AIONE_DB_NAME},INSTANCE_UNIX_SOCKET=/cloudsql/${CONNECTION},NODE_ENV=production,AIONE_MATERIAL_MODE=${MODE},AIONE_MATERIAL_PRODUCT_CODE=${PRODUCT_CODE}"
if [[ "$MODE" == "confirm" ]]; then
  ENV_VARS="${ENV_VARS},AIONE_MATERIAL_HUMAN_EMAIL=${HUMAN_EMAIL}"
fi

gcloud run jobs deploy "$JOB" \
  --image="$IMAGE" \
  --region="$REGION" \
  --project="$PROJECT_ID" \
  --service-account="$RUNTIME_SA" \
  --set-cloudsql-instances="$CONNECTION" \
  --set-env-vars="$ENV_VARS" \
  --set-secrets="DB_PASS=${AIONE_DB_PASSWORD_SECRET}:latest" \
  --command=npm \
  --args=run,product:material:confirm:current \
  --tasks=1 \
  --max-retries=0 \
  --task-timeout=10m \
  --memory=1Gi \
  --quiet >/dev/null

echo '[AIONE] 3/3 Execute and print authoritative material evidence'
set +e
OUTPUT="$(gcloud run jobs execute "$JOB" --region="$REGION" --project="$PROJECT_ID" --wait --format='value(metadata.name)' 2>&1)"
CODE=$?
set -e
printf '%s\n' "$OUTPUT"
EXECUTION="$(printf '%s\n' "$OUTPUT" | grep -Eo 'aione-product-material-human-gate-[a-z0-9]+' | tail -n1 || true)"
if [[ -z "$EXECUTION" ]]; then
  EXECUTION="$(gcloud run jobs executions list --job="$JOB" --region="$REGION" --project="$PROJECT_ID" --sort-by='~metadata.creationTimestamp' --limit=1 --format='value(metadata.name)' 2>/dev/null || true)"
fi
[[ -n "$EXECUTION" ]] || {
  echo '[AIONE][STOP] Product material Human Gate execution id missing.' >&2
  exit 25
}

LOGS=""
for i in $(seq 1 24); do
  LOGS="$(gcloud beta run jobs executions logs read "$EXECUTION" --region="$REGION" --project="$PROJECT_ID" --limit=1500 2>&1 || true)"
  if grep -q 'PRODUCT MATERIAL INSPECTION PASS' <<<"$LOGS" || grep -q 'PRODUCT MATERIAL HUMAN CONFIRMATION PASS' <<<"$LOGS" || grep -q '"ok": false' <<<"$LOGS"; then
    break
  fi
  sleep 5
done
printf '\n[AIONE] authoritative material logs\n%s\n' "$LOGS"
[[ "$CODE" -eq 0 ]] || {
  echo '[AIONE][STOP] Product material Human Gate failed. Root-cause logs are printed above.' >&2
  exit 26
}

grep -q "\"productCode\": \"${PRODUCT_CODE}\"" <<<"$LOGS" || {
  echo '[AIONE][STOP] Material Human Gate returned a different Product.' >&2
  exit 27
}

if [[ "$MODE" == "inspect" ]]; then
  grep -q 'PRODUCT MATERIAL INSPECTION PASS - HUMAN CONFIRMATION REQUIRED' <<<"$LOGS" || {
    echo '[AIONE][STOP] Material inspection PASS marker missing.' >&2
    exit 28
  }
  printf '\n[AIONE] INSPECTION COMPLETE\n'
  printf 'Review the printed SKU/Product/Real-photo asset list. If it is the exact curated material for %s, rerun with AIONE_MATERIAL_MODE=confirm and an explicit canonical human email.\n' "$PRODUCT_CODE"
else
  grep -q '"confirmationStatus": "confirmed"' <<<"$LOGS" || {
    echo '[AIONE][STOP] Material confirmation did not persist status=confirmed.' >&2
    exit 29
  }
  grep -q 'PRODUCT MATERIAL HUMAN CONFIRMATION PASS' <<<"$LOGS" || {
    echo '[AIONE][STOP] Material human-confirmation PASS marker missing.' >&2
    exit 30
  }
  printf '\n[AIONE] HUMAN MATERIAL CONFIRMATION COMPLETE\n'
  printf 'Gate C can now be rerun for %s.\n' "$PRODUCT_CODE"
fi
