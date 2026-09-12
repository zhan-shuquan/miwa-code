#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
cd "$REPO_ROOT"

source infra/gcp/cloud-shell/CURRENT_BASELINE.sh
assert_aione_current_baseline

BRANCH="feat/ai-design-template-set-v1"
CURRENT_BRANCH="$(git branch --show-current)"
[[ "$CURRENT_BRANCH" == "$BRANCH" ]] || {
  echo "[AIONE][STOP] Gate C review recovery must run from ${BRANCH}; current=${CURRENT_BRANCH}" >&2
  exit 20
}

git pull --ff-only origin "$BRANCH" >/dev/null

PRODUCT_CODE="$(printf '%s' "${AIONE_ACCEPT_IMAGE_PRODUCT_CODE:-}" | xargs)"
[[ -n "$PRODUCT_CODE" ]] || {
  echo '[AIONE][STOP] AIONE_ACCEPT_IMAGE_PRODUCT_CODE is required so review recovery never guesses the Product.' >&2
  exit 21
}

PROJECT_ID="$AIONE_PROJECT_ID"
JOB="aione-design-template-set-gate-c"
REVIEW_DIR="$HOME/aione-review/gate-c/${PRODUCT_CODE}"

printf '\n[AIONE] Recover latest Gate C DERIVED review image\n'
printf 'Product : %s\n' "$PRODUCT_CODE"
printf 'Action  : download existing DERIVED output only; NO AI generation\n\n'

LOGS="$(gcloud logging read \
  "resource.type=\"cloud_run_job\" AND resource.labels.job_name=\"${JOB}\"" \
  --project="$PROJECT_ID" \
  --freshness=2d \
  --order=desc \
  --limit=4000 \
  --format='value(textPayload)' 2>/dev/null || true)"

[[ -n "$LOGS" ]] || {
  echo '[AIONE][STOP] No recent Gate C logs were found.' >&2
  exit 22
}

LATEST_PRODUCT="$(printf '%s\n' "$LOGS" | sed -n 's/.*"productCode": "\([^"]*\)".*/\1/p' | head -n1)"
[[ -n "$LATEST_PRODUCT" ]] || {
  echo '[AIONE][STOP] Could not recover productCode from recent Gate C logs.' >&2
  exit 23
}
[[ "$LATEST_PRODUCT" == "$PRODUCT_CODE" ]] || {
  echo "[AIONE][STOP] Latest Gate C output belongs to ${LATEST_PRODUCT}, not ${PRODUCT_CODE}. Refusing to guess." >&2
  exit 24
}

OBJECT="$(printf '%s\n' "$LOGS" | sed -n 's/.*"gcsObject": "\([^"]*\)".*/\1/p' | head -n1)"
BUCKET="$(printf '%s\n' "$LOGS" | sed -n 's/.*"gcsBucket": "\([^"]*\)".*/\1/p' | head -n1)"
OUTPUT_ASSET_ID="$(printf '%s\n' "$LOGS" | sed -n 's/.*"outputAssetId": "\([^"]*\)".*/\1/p' | head -n1)"
REVIEW_STATUS="$(printf '%s\n' "$LOGS" | sed -n 's/.*"reviewStatus": "\([^"]*\)".*/\1/p' | head -n1)"

[[ -n "$OBJECT" ]] || { echo '[AIONE][STOP] Latest Gate C gcsObject could not be recovered.' >&2; exit 25; }
[[ -n "$BUCKET" ]] || BUCKET="$AIONE_PRODUCT_ASSET_BUCKET"
[[ "$REVIEW_STATUS" == "pending" ]] || {
  echo "[AIONE][STOP] Latest Gate C reviewStatus is '${REVIEW_STATUS:-missing}', expected pending." >&2
  exit 26
}

mkdir -p "$REVIEW_DIR"
FILE="$REVIEW_DIR/$(basename "$OBJECT")"
gcloud storage cp "gs://${BUCKET}/${OBJECT}" "$FILE" >/dev/null
[[ -s "$FILE" ]] || { echo '[AIONE][STOP] Gate C review image download is missing or empty.' >&2; exit 27; }

printf '\n[AIONE] GATE C REVIEW IMAGE READY\n'
printf 'Product        : %s\n' "$PRODUCT_CODE"
printf 'Output Asset   : %s\n' "${OUTPUT_ASSET_ID:-unknown}"
printf 'Review Status  : %s\n' "$REVIEW_STATUS"
printf 'GCS Object     : gs://%s/%s\n' "$BUCKET" "$OBJECT"
printf 'Local File     : %s\n' "$FILE"
printf 'AI generation  : NO (existing DERIVED output only)\n'
printf '\nOpen the Local File from the Cloud Shell file explorer and visually inspect this exact Gate C output.\n'
