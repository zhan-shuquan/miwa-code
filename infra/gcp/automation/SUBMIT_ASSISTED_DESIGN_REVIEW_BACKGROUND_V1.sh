#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
cd "$REPO_ROOT"

source infra/gcp/cloud-shell/CURRENT_BASELINE.sh
assert_aione_current_baseline

TASK_ID="${AIONE_REVIEW_TASK_ID:-}"
OUTCOME="${AIONE_REVIEW_OUTCOME:-}"
HUMAN_EMAIL="$(printf '%s' "${AIONE_REVIEW_HUMAN_EMAIL:-}" | tr '[:upper:]' '[:lower:]' | xargs)"
DETAIL_JSON="${AIONE_REVIEW_DETAIL_JSON-}"
if [[ -z "$DETAIL_JSON" ]]; then
  DETAIL_JSON="${AIONE_REVIEW_DETAIL-}"
fi
if [[ -z "$DETAIL_JSON" ]]; then
  DETAIL_JSON='{}'
fi

[[ -n "$TASK_ID" ]] || { echo '[AIONE][STOP] AIONE_REVIEW_TASK_ID is required.' >&2; exit 50; }
[[ "$OUTCOME" == "approve" || "$OUTCOME" == "reject" || "$OUTCOME" == "regenerate" ]] || { echo '[AIONE][STOP] AIONE_REVIEW_OUTCOME must be approve, reject or regenerate.' >&2; exit 51; }
[[ -n "$HUMAN_EMAIL" && "$HUMAN_EMAIL" == *@* ]] || { echo '[AIONE][STOP] AIONE_REVIEW_HUMAN_EMAIL is required.' >&2; exit 52; }
[[ "$HUMAN_EMAIL" != "info@miwa-happyhouse.com" ]] || { echo '[AIONE][STOP] Transitional admin identity cannot be used as human review evidence.' >&2; exit 53; }
node -e 'JSON.parse(process.argv[1])' "$DETAIL_JSON" >/dev/null 2>&1 || { echo '[AIONE][STOP] Review detail must be valid JSON.' >&2; exit 57; }

TARGET_SHA="$(git rev-parse --short=7 HEAD)"
DETAIL_B64="$(printf '%s' "$DETAIL_JSON" | base64 | tr -d '\n')"
DEPLOYER_SA="${AIONE_DEPLOYER_SERVICE_ACCOUNT_NAME}@${AIONE_PROJECT_ID}.iam.gserviceaccount.com"

printf '\n[AIONE] Submit Assisted Design Background Review V1\n'
printf 'Target main SHA: %s\n' "$TARGET_SHA"
printf 'Task ID        : %s\n' "$TASK_ID"
printf 'Outcome        : %s\n' "$OUTCOME"
printf 'Human Email    : %s\n' "$HUMAN_EMAIL"
printf 'Review Detail  : %s\n\n' "$DETAIL_JSON"

BUILD_ID="$(gcloud builds submit . \
  --project="$AIONE_PROJECT_ID" \
  --region="$AIONE_REGION" \
  --config=infra/gcp/cloudbuild/assisted-design-review-background.yaml \
  --service-account="projects/${AIONE_PROJECT_ID}/serviceAccounts/${DEPLOYER_SA}" \
  --substitutions="_TARGET_SHA=${TARGET_SHA},_TASK_ID=${TASK_ID},_OUTCOME=${OUTCOME},_HUMAN_EMAIL=${HUMAN_EMAIL},_DETAIL_B64=${DETAIL_B64}" \
  --async \
  --format='value(metadata.build.id)')"

[[ -n "$BUILD_ID" ]] || { echo '[AIONE][STOP] Background Cloud Build submission returned no build id.' >&2; exit 61; }
printf '[AIONE] BACKGROUND REVIEW SUBMITTED\n'
printf 'Build ID: %s\n' "$BUILD_ID"
printf 'You may close Cloud Shell now. The review continues server-side.\n'
printf 'Check later with: gcloud builds describe %s --region=%s --project=%s --format="value(status)"\n' "$BUILD_ID" "$AIONE_REGION" "$AIONE_PROJECT_ID"
