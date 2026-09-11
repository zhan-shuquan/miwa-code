#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
cd "$REPO_ROOT"

source infra/gcp/cloud-shell/CURRENT_BASELINE.sh
assert_aione_current_baseline

PROJECT_ID="$AIONE_PROJECT_ID"
REGION="$AIONE_REGION"
RUNTIME_SA="${AIONE_RUNTIME_SERVICE_ACCOUNT_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"
SHORT_SHA="$(git rev-parse --short=7 HEAD)"
IMAGE="${REGION}-docker.pkg.dev/${PROJECT_ID}/${AIONE_ARTIFACT_REPO}/${AIONE_IMAGE_NAME}:main-${SHORT_SHA}"
CONNECTION="$(gcloud sql instances describe "$AIONE_SQL_INSTANCE" --project="$PROJECT_ID" --format='value(connectionName)')"
JOB="aione-assisted-design-review-current"
TASK_ID="${AIONE_REVIEW_TASK_ID:-}"
OUTCOME="${AIONE_REVIEW_OUTCOME:-}"
HUMAN_EMAIL="$(printf '%s' "${AIONE_REVIEW_HUMAN_EMAIL:-}" | tr '[:upper:]' '[:lower:]' | xargs)"
DETAIL_JSON="${AIONE_REVIEW_DETAIL_JSON:-${AIONE_REVIEW_DETAIL:-{}}}"

[[ -n "$TASK_ID" ]] || { echo '[AIONE][STOP] AIONE_REVIEW_TASK_ID is required.' >&2; exit 50; }
[[ "$OUTCOME" == "approve" || "$OUTCOME" == "reject" || "$OUTCOME" == "regenerate" ]] || { echo '[AIONE][STOP] AIONE_REVIEW_OUTCOME must be approve, reject or regenerate.' >&2; exit 51; }
[[ -n "$HUMAN_EMAIL" && "$HUMAN_EMAIL" == *@* ]] || { echo '[AIONE][STOP] AIONE_REVIEW_HUMAN_EMAIL is required.' >&2; exit 52; }
[[ "$HUMAN_EMAIL" != "info@miwa-happyhouse.com" ]] || { echo '[AIONE][STOP] Transitional admin identity cannot be used as human review evidence.' >&2; exit 53; }

node -e 'JSON.parse(process.argv[1])' "$DETAIL_JSON" >/dev/null 2>&1 || { echo '[AIONE][STOP] Review detail must be valid JSON.' >&2; exit 57; }

cleanup() {
  gcloud run jobs delete "$JOB" --region="$REGION" --project="$PROJECT_ID" --quiet >/dev/null 2>&1 || true
}
trap cleanup EXIT

printf '\n[AIONE] Assisted Design Explicit Human Review V1\n'
printf 'Task ID      : %s\n' "$TASK_ID"
printf 'Outcome      : %s\n' "$OUTCOME"
printf 'Human Email  : %s\n' "$HUMAN_EMAIL"
printf 'Review Detail: %s\n\n' "$DETAIL_JSON"

gcloud run jobs deploy "$JOB" \
  --image="$IMAGE" \
  --region="$REGION" \
  --project="$PROJECT_ID" \
  --service-account="$RUNTIME_SA" \
  --set-cloudsql-instances="$CONNECTION" \
  --set-env-vars="DB_USER=${AIONE_DB_USER},DB_NAME=${AIONE_DB_NAME},INSTANCE_UNIX_SOCKET=/cloudsql/${CONNECTION},NODE_ENV=production,AIONE_REVIEW_TASK_ID=${TASK_ID},AIONE_REVIEW_OUTCOME=${OUTCOME},AIONE_REVIEW_HUMAN_EMAIL=${HUMAN_EMAIL}" \
  --set-env-vars="AIONE_REVIEW_DETAIL_JSON=${DETAIL_JSON}" \
  --set-secrets="DB_PASS=${AIONE_DB_PASSWORD_SECRET}:latest" \
  --command=npm \
  --args=run,design:review:current \
  --tasks=1 \
  --max-retries=0 \
  --task-timeout=10m \
  --quiet >/dev/null

set +e
OUTPUT="$(gcloud run jobs execute "$JOB" --region="$REGION" --project="$PROJECT_ID" --wait --format='value(metadata.name)' 2>&1)"
CODE=$?
set -e
printf '%s\n' "$OUTPUT"
EXECUTION="$(printf '%s\n' "$OUTPUT" | grep -Eo 'aione-assisted-design-review-current-[a-z0-9]+' | tail -n1 || true)"
[[ -n "$EXECUTION" ]] || { echo '[AIONE][STOP] Review execution id missing.' >&2; exit 54; }

LOGS=""
for i in $(seq 1 18); do
  LOGS="$(gcloud beta run jobs executions logs read "$EXECUTION" --region="$REGION" --project="$PROJECT_ID" --limit=500 2>&1 || true)"
  if grep -q 'ASSISTED DESIGN EXPLICIT HUMAN REVIEW V1 PASS' <<<"$LOGS" || grep -q '"ok": false' <<<"$LOGS"; then
    break
  fi
  sleep 5
done
printf '\n[AIONE] authoritative logs\n%s\n' "$LOGS"
[[ "$CODE" -eq 0 ]] || { echo '[AIONE][STOP] Explicit human review failed.' >&2; exit 55; }
grep -q 'ASSISTED DESIGN EXPLICIT HUMAN REVIEW V1 PASS' <<<"$LOGS" || { echo '[AIONE][STOP] Human review PASS marker missing.' >&2; exit 56; }
if [[ "$DETAIL_JSON" != "{}" ]]; then
  grep -q '"reviewDetail": {' <<<"$LOGS" || { echo '[AIONE][STOP] Review detail evidence missing from authoritative logs.' >&2; exit 58; }
fi
printf '\n[AIONE] ASSISTED DESIGN EXPLICIT HUMAN REVIEW V1 PASS\n'
