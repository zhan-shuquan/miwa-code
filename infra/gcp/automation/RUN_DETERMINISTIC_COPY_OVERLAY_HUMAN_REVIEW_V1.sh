#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
cd "$REPO_ROOT"

source infra/gcp/cloud-shell/CURRENT_BASELINE.sh
assert_aione_current_baseline

BRANCH="feat/deterministic-copy-overlay-v1"
CURRENT_BRANCH="$(git branch --show-current)"
[[ "$CURRENT_BRANCH" == "$BRANCH" ]] || {
  echo "[AIONE][STOP] Deterministic overlay human review must run from ${BRANCH}; current=${CURRENT_BRANCH}" >&2
  exit 20
}
[[ -z "$(git status --porcelain)" ]] || {
  echo '[AIONE][STOP] Repo must be clean before deterministic overlay human review.' >&2
  exit 21
}
git pull --ff-only origin "$BRANCH" >/dev/null

PROJECT_ID="$AIONE_PROJECT_ID"
REGION="$AIONE_REGION"
RUNTIME_SA="${AIONE_RUNTIME_SERVICE_ACCOUNT_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"
CONNECTION="$(gcloud sql instances describe "$AIONE_SQL_INSTANCE" --project="$PROJECT_ID" --format='value(connectionName)')"
SHORT_SHA="$(git rev-parse --short=7 HEAD)"
IMAGE="${REGION}-docker.pkg.dev/${PROJECT_ID}/${AIONE_ARTIFACT_REPO}/${AIONE_IMAGE_NAME}:overlay-review-${SHORT_SHA}"
JOB="aione-design-overlay-human-review"
ASSET_ID="$(printf '%s' "${AIONE_REVIEW_ASSET_ID:-}" | xargs)"
OUTCOME="$(printf '%s' "${AIONE_REVIEW_OUTCOME:-}" | tr '[:upper:]' '[:lower:]' | xargs)"
HUMAN_EMAIL="$(printf '%s' "${AIONE_REVIEW_HUMAN_EMAIL:-}" | tr '[:upper:]' '[:lower:]' | xargs)"
DETAIL_JSON="${AIONE_REVIEW_DETAIL_JSON-}"
if [[ -z "$DETAIL_JSON" ]]; then
  DETAIL_JSON='{}'
fi

[[ -n "$ASSET_ID" ]] || { echo '[AIONE][STOP] AIONE_REVIEW_ASSET_ID is required.' >&2; exit 22; }
[[ "$OUTCOME" == "approve" || "$OUTCOME" == "reject" || "$OUTCOME" == "regenerate" ]] || {
  echo '[AIONE][STOP] AIONE_REVIEW_OUTCOME must be approve, reject or regenerate.' >&2
  exit 23
}
[[ -n "$HUMAN_EMAIL" && "$HUMAN_EMAIL" == *@* ]] || {
  echo '[AIONE][STOP] AIONE_REVIEW_HUMAN_EMAIL is required.' >&2
  exit 24
}
[[ "$HUMAN_EMAIL" != "info@miwa-happyhouse.com" ]] || {
  echo '[AIONE][STOP] Transitional admin identity cannot be used as human review evidence.' >&2
  exit 25
}
node -e 'JSON.parse(process.argv[1])' "$DETAIL_JSON" >/dev/null 2>&1 || {
  echo '[AIONE][STOP] AIONE_REVIEW_DETAIL_JSON must be valid JSON.' >&2
  exit 26
}
DETAIL_B64="$(printf '%s' "$DETAIL_JSON" | base64 | tr -d '\n')"

cleanup() {
  gcloud run jobs delete "$JOB" --region="$REGION" --project="$PROJECT_ID" --quiet >/dev/null 2>&1 || true
}
trap cleanup EXIT

printf '\n[AIONE] Deterministic Copy Overlay Explicit Human Review V1\n'
printf 'Branch       : %s\n' "$BRANCH"
printf 'Branch SHA   : %s\n' "$SHORT_SHA"
printf 'Asset ID     : %s\n' "$ASSET_ID"
printf 'Outcome      : %s\n' "$OUTCOME"
printf 'Human Email  : %s\n' "$HUMAN_EMAIL"
printf 'AI generation: NO\n'
printf 'Main traffic : unchanged\n\n'

echo '[AIONE] 1/3 Build isolated branch image'
gcloud builds submit . --project="$PROJECT_ID" --tag="$IMAGE" --quiet >/dev/null

echo '[AIONE] 2/3 Persist explicit human review on the exact deterministic-overlay DERIVED ProductAsset'
gcloud run jobs deploy "$JOB" \
  --image="$IMAGE" \
  --region="$REGION" \
  --project="$PROJECT_ID" \
  --service-account="$RUNTIME_SA" \
  --set-cloudsql-instances="$CONNECTION" \
  --set-env-vars="DB_USER=${AIONE_DB_USER},DB_NAME=${AIONE_DB_NAME},INSTANCE_UNIX_SOCKET=/cloudsql/${CONNECTION},NODE_ENV=production,AIONE_REVIEW_ASSET_ID=${ASSET_ID},AIONE_REVIEW_OUTCOME=${OUTCOME},AIONE_REVIEW_HUMAN_EMAIL=${HUMAN_EMAIL},AIONE_REVIEW_DETAIL_B64=${DETAIL_B64}" \
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
EXECUTION="$(printf '%s\n' "$OUTPUT" | grep -Eo 'aione-design-overlay-human-review-[a-z0-9]+' | tail -n1 || true)"
[[ -n "$EXECUTION" ]] || EXECUTION="$(gcloud run jobs executions list --job="$JOB" --region="$REGION" --project="$PROJECT_ID" --sort-by='~metadata.creationTimestamp' --limit=1 --format='value(metadata.name)' 2>/dev/null || true)"
[[ -n "$EXECUTION" ]] || { echo '[AIONE][STOP] Human review execution id missing.' >&2; exit 27; }

LOGS=""
for i in $(seq 1 18); do
  LOGS="$(gcloud beta run jobs executions logs read "$EXECUTION" --region="$REGION" --project="$PROJECT_ID" --limit=500 2>&1 || true)"
  if grep -q 'ASSISTED DESIGN EXPLICIT HUMAN REVIEW V1 PASS' <<<"$LOGS" || grep -q '"ok": false' <<<"$LOGS"; then
    break
  fi
  sleep 5
done
printf '\n[AIONE] authoritative logs\n%s\n' "$LOGS"
[[ "$CODE" -eq 0 ]] || { echo '[AIONE][STOP] Explicit human review job failed.' >&2; exit 28; }
grep -q 'ASSISTED DESIGN EXPLICIT HUMAN REVIEW V1 PASS' <<<"$LOGS" || { echo '[AIONE][STOP] Human review PASS marker missing.' >&2; exit 29; }
grep -q '"reviewTarget": "derived-product-asset"' <<<"$LOGS" || { echo '[AIONE][STOP] Review target was not a DERIVED ProductAsset.' >&2; exit 30; }
grep -q "\"assetId\": \"${ASSET_ID}\"" <<<"$LOGS" || { echo '[AIONE][STOP] Human review was written to the wrong ProductAsset.' >&2; exit 31; }
EXPECTED_STATUS="approved"
[[ "$OUTCOME" == "reject" ]] && EXPECTED_STATUS="rejected"
[[ "$OUTCOME" == "regenerate" ]] && EXPECTED_STATUS="regenerate_requested"
grep -q "\"reviewStatus\": \"${EXPECTED_STATUS}\"" <<<"$LOGS" || { echo '[AIONE][STOP] Persisted review status does not match requested outcome.' >&2; exit 32; }
grep -q "\"humanEmail\": \"${HUMAN_EMAIL}\"" <<<"$LOGS" || { echo '[AIONE][STOP] Persisted review evidence does not match the explicit human identity.' >&2; exit 33; }

echo '[AIONE] 3/3 Explicit human review persisted and verified.'
printf '\n[AIONE] DETERMINISTIC COPY OVERLAY HUMAN REVIEW PASS\n'
printf 'Asset ID      : %s\n' "$ASSET_ID"
printf 'Review Status : %s\n' "$EXPECTED_STATUS"
printf 'Human Email   : %s\n' "$HUMAN_EMAIL"
printf 'AI generation : NO\n'
printf 'Main traffic  : unchanged\n'
