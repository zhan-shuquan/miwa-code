#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
cd "$REPO_ROOT"

source infra/gcp/cloud-shell/CURRENT_BASELINE.sh
assert_aione_current_baseline

PROJECT_ID="$AIONE_PROJECT_ID"
REGION="$AIONE_REGION"
JOB="aione-assisted-design-deterministic-acceptance-current"
BUCKET="$AIONE_PRODUCT_ASSET_BUCKET"
REVIEW_DIR="$HOME/aione-review"

printf '\n[AIONE] Recover latest Assisted Design review artifact\n'

LOGS="$(gcloud logging read \
  "resource.type=\"cloud_run_job\" AND resource.labels.job_name=\"${JOB}\"" \
  --project="$PROJECT_ID" \
  --freshness=1d \
  --order=desc \
  --limit=1000 \
  --format='value(textPayload)' 2>/dev/null || true)"

OBJECT="$(printf '%s\n' "$LOGS" | sed -n 's/.*"gcsObject": "\([^"]*\)".*/\1/p' | head -n1)"
[[ -n "$OBJECT" ]] || { echo '[AIONE][STOP] Latest DERIVED gcsObject could not be recovered from Cloud Logging.' >&2; exit 40; }

mkdir -p "$REVIEW_DIR"
FILE="$REVIEW_DIR/$(basename "$OBJECT")"
gcloud storage cp "gs://${BUCKET}/${OBJECT}" "$FILE" >/dev/null
[[ -s "$FILE" ]] || { echo '[AIONE][STOP] Review image download is missing or empty.' >&2; exit 41; }

printf '\n[AIONE] REVIEW IMAGE READY\n'
printf 'GCS Object : %s\n' "$OBJECT"
printf 'Local File : %s\n' "$FILE"
printf '\nOpen the file from the Cloud Shell file explorer and visually inspect this exact DERIVED output before approving or rejecting it.\n'
