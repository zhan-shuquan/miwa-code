#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
cd "$REPO_ROOT"

source infra/gcp/cloud-shell/CURRENT_BASELINE.sh
assert_aione_current_baseline

BRANCH="feat/deterministic-copy-overlay-v1"
CURRENT_BRANCH="$(git branch --show-current)"
[[ "$CURRENT_BRANCH" == "$BRANCH" ]] || { echo "[AIONE][STOP] Overlay Gate C must run from $BRANCH, current=$CURRENT_BRANCH" >&2; exit 20; }
[[ -z "$(git status --porcelain)" ]] || { echo '[AIONE][STOP] Repo must be clean before Overlay Gate C.' >&2; exit 21; }
git pull --ff-only origin "$BRANCH" >/dev/null

PRODUCT_CODE="$(printf '%s' "${AIONE_ACCEPT_COPY_PRODUCT_CODE:-}" | xargs)"
SOURCE_ASSET_ID="$(printf '%s' "${AIONE_ACCEPT_COPY_SOURCE_ASSET_ID:-}" | xargs)"
COPY_JSON="${AIONE_ACCEPT_COPY_JSON-}"
if [[ -z "$COPY_JSON" ]]; then
  COPY_JSON='{"eyebrow":"DETAIL","headline":"毎日の足元に","body":"シンプルに、使いやすく。"}'
fi

[[ -n "$PRODUCT_CODE" ]] || { echo '[AIONE][STOP] AIONE_ACCEPT_COPY_PRODUCT_CODE is required.' >&2; exit 22; }
[[ -n "$SOURCE_ASSET_ID" ]] || { echo '[AIONE][STOP] AIONE_ACCEPT_COPY_SOURCE_ASSET_ID is required.' >&2; exit 23; }
node -e 'JSON.parse(process.argv[1])' "$COPY_JSON" >/dev/null 2>&1 || { echo '[AIONE][STOP] AIONE_ACCEPT_COPY_JSON must be valid JSON.' >&2; exit 24; }
COPY_B64="$(printf '%s' "$COPY_JSON" | base64 | tr -d '\n')"

PROJECT_ID="$AIONE_PROJECT_ID"
REGION="$AIONE_REGION"
RUNTIME_SA="${AIONE_RUNTIME_SERVICE_ACCOUNT_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"
CONNECTION="$(gcloud sql instances describe "$AIONE_SQL_INSTANCE" --project="$PROJECT_ID" --format='value(connectionName)')"
SHORT_SHA="$(git rev-parse --short=7 HEAD)"
IMAGE="${REGION}-docker.pkg.dev/${PROJECT_ID}/${AIONE_ARTIFACT_REPO}/${AIONE_IMAGE_NAME}:copy-gate-c-${SHORT_SHA}"
JOB="aione-design-copy-overlay-gate-c"

cleanup() {
  gcloud run jobs delete "$JOB" --region="$REGION" --project="$PROJECT_ID" --quiet >/dev/null 2>&1 || true
}
trap cleanup EXIT

printf '\n[AIONE] Deterministic Copy Overlay Gate C V1\n'
printf 'Branch         : %s\n' "$BRANCH"
printf 'Branch SHA     : %s\n' "$SHORT_SHA"
printf 'Product        : %s\n' "$PRODUCT_CODE"
printf 'Source Asset   : %s\n' "$SOURCE_ASSET_ID"
printf 'Copy payload   : %s\n' "$COPY_JSON"
printf 'AI generation  : NO\n'
printf 'Main traffic   : unchanged\n\n'

echo '[AIONE] 1/4 Build isolated branch image'
gcloud builds submit . --project="$PROJECT_ID" --tag="$IMAGE" --quiet >/dev/null

echo '[AIONE] 2/4 Execute deterministic overlay against the explicit approved DERIVED source'
gcloud run jobs deploy "$JOB" \
  --image="$IMAGE" \
  --region="$REGION" \
  --project="$PROJECT_ID" \
  --service-account="$RUNTIME_SA" \
  --set-cloudsql-instances="$CONNECTION" \
  --set-env-vars="DB_USER=${AIONE_DB_USER},DB_NAME=${AIONE_DB_NAME},INSTANCE_UNIX_SOCKET=/cloudsql/${CONNECTION},NODE_ENV=production,AIONE_ACCEPT_COPY_PRODUCT_CODE=${PRODUCT_CODE},AIONE_ACCEPT_COPY_SOURCE_ASSET_ID=${SOURCE_ASSET_ID},AIONE_ACCEPT_COPY_JSON_B64=${COPY_B64}" \
  --set-secrets="DB_PASS=${AIONE_DB_PASSWORD_SECRET}:latest" \
  --command=node \
  --args=scripts/accept-design-copy-overlay-gate-c.js \
  --tasks=1 \
  --max-retries=0 \
  --task-timeout=15m \
  --memory=2Gi \
  --quiet >/dev/null

set +e
OUTPUT="$(gcloud run jobs execute "$JOB" --region="$REGION" --project="$PROJECT_ID" --wait --format='value(metadata.name)' 2>&1)"
CODE=$?
set -e
printf '%s\n' "$OUTPUT"
EXECUTION="$(printf '%s\n' "$OUTPUT" | grep -Eo 'aione-design-copy-overlay-gate-c-[a-z0-9]+' | tail -n1 || true)"
[[ -n "$EXECUTION" ]] || EXECUTION="$(gcloud run jobs executions list --job="$JOB" --region="$REGION" --project="$PROJECT_ID" --sort-by='~metadata.creationTimestamp' --limit=1 --format='value(metadata.name)' 2>/dev/null || true)"
[[ -n "$EXECUTION" ]] || { echo '[AIONE][STOP] Overlay Gate C execution id missing.' >&2; exit 25; }

LOGS=""
for i in $(seq 1 24); do
  LOGS="$(gcloud beta run jobs executions logs read "$EXECUTION" --region="$REGION" --project="$PROJECT_ID" --limit=1200 2>&1 || true)"
  if grep -q 'DETERMINISTIC COPY OVERLAY GATE C PASS' <<<"$LOGS" || grep -q '"ok": false' <<<"$LOGS"; then
    break
  fi
  sleep 5
done
printf '\n[AIONE] Overlay Gate C authoritative logs\n%s\n' "$LOGS"
[[ "$CODE" -eq 0 ]] || { echo '[AIONE][STOP] Overlay Gate C execution failed.' >&2; exit 26; }
grep -q '"ok": true' <<<"$LOGS" || { echo '[AIONE][STOP] Overlay Gate C did not return ok=true.' >&2; exit 27; }
grep -q "\"productCode\": \"${PRODUCT_CODE}\"" <<<"$LOGS" || { echo '[AIONE][STOP] Overlay Gate C used the wrong Product.' >&2; exit 28; }
grep -q "\"sourceAssetId\": \"${SOURCE_ASSET_ID}\"" <<<"$LOGS" || { echo '[AIONE][STOP] Overlay Gate C used the wrong source asset.' >&2; exit 29; }
grep -q '"sourceReviewStatus": "approved"' <<<"$LOGS" || { echo '[AIONE][STOP] Overlay source was not explicitly approved.' >&2; exit 30; }
grep -q '"aiGeneration": false' <<<"$LOGS" || { echo '[AIONE][STOP] Overlay Gate C must prove AI generation is disabled.' >&2; exit 31; }
grep -q '"reviewStatus": "pending"' <<<"$LOGS" || { echo '[AIONE][STOP] Overlay result must remain pending human final review.' >&2; exit 32; }
grep -q 'DETERMINISTIC COPY OVERLAY GATE C PASS' <<<"$LOGS" || { echo '[AIONE][STOP] Overlay Gate C PASS marker missing.' >&2; exit 33; }

echo '[AIONE] 3/4 Resolve generated review asset'
OUTPUT_ASSET_ID="$(printf '%s\n' "$LOGS" | sed -n 's/.*"outputAssetId": "\([^"]*\)".*/\1/p' | tail -n1)"
GCS_BUCKET="$(printf '%s\n' "$LOGS" | sed -n 's/.*"gcsBucket": "\([^"]*\)".*/\1/p' | tail -n1)"
GCS_OBJECT="$(printf '%s\n' "$LOGS" | sed -n 's/.*"gcsObject": "\([^"]*\)".*/\1/p' | tail -n1)"
[[ -n "$OUTPUT_ASSET_ID" && -n "$GCS_BUCKET" && -n "$GCS_OBJECT" ]] || { echo '[AIONE][STOP] Overlay Gate C output evidence is incomplete.' >&2; exit 34; }

REVIEW_DIR="$HOME/aione-review/copy-overlay/${PRODUCT_CODE}"
mkdir -p "$REVIEW_DIR"
LOCAL_FILE="$REVIEW_DIR/$(basename "$GCS_OBJECT")"
gcloud storage cp "gs://${GCS_BUCKET}/${GCS_OBJECT}" "$LOCAL_FILE" --project="$PROJECT_ID" >/dev/null

echo '[AIONE] 4/4 STOP for explicit human visual review'
printf '\n[AIONE] DETERMINISTIC COPY OVERLAY REVIEW IMAGE READY\n'
printf 'Product        : %s\n' "$PRODUCT_CODE"
printf 'Source Asset   : %s\n' "$SOURCE_ASSET_ID"
printf 'Output Asset   : %s\n' "$OUTPUT_ASSET_ID"
printf 'Review Status  : pending\n'
printf 'GCS Object     : gs://%s/%s\n' "$GCS_BUCKET" "$GCS_OBJECT"
printf 'Local File     : %s\n' "$LOCAL_FILE"
printf 'AI generation  : NO\n'
printf 'Main traffic   : unchanged\n'
printf '\n[AIONE] OVERLAY GATE C TECHNICAL PASS - HUMAN VISUAL REVIEW REQUIRED BEFORE MERGE\n'
