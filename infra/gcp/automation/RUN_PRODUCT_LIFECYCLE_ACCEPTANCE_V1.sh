#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
cd "$REPO_ROOT"

source infra/gcp/cloud-shell/CURRENT_BASELINE.sh
assert_aione_current_baseline

[[ "$(git branch --show-current)" == "main" ]] || { echo '[AIONE][STOP] Acceptance must run from main.' >&2; exit 20; }
[[ -z "$(git status --porcelain)" ]] || { echo '[AIONE][STOP] Repo must be clean before acceptance.' >&2; exit 21; }
git pull --ff-only origin main >/dev/null

PROJECT_ID="$AIONE_PROJECT_ID"
REGION="$AIONE_REGION"
RUNTIME_SA="${AIONE_RUNTIME_SERVICE_ACCOUNT_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"
SHORT_SHA="$(git rev-parse --short=7 HEAD)"
IMAGE="${REGION}-docker.pkg.dev/${PROJECT_ID}/${AIONE_ARTIFACT_REPO}/${AIONE_IMAGE_NAME}:main-${SHORT_SHA}"
CONNECTION="$(gcloud sql instances describe "$AIONE_SQL_INSTANCE" --project="$PROJECT_ID" --format='value(connectionName)')"
LIFECYCLE_JOB="aione-product-lifecycle-acceptance-current"
SOURCE_REF="855305580969"

cleanup() {
  gcloud run jobs delete "$LIFECYCLE_JOB" --region="$REGION" --project="$PROJECT_ID" --quiet >/dev/null 2>&1 || true
}
trap cleanup EXIT

printf '\n[AIONE] Product Lifecycle Acceptance V1\n'
printf 'Main SHA     : %s\n' "$SHORT_SHA"
printf 'Image        : %s\n' "$IMAGE"
printf 'Cloud SQL    : %s\n' "$AIONE_SQL_INSTANCE"
printf 'Source Ref   : %s\n\n' "$SOURCE_REF"

echo '[AIONE] 1/4 Ensure CURRENT immutable main image exists'
if ! gcloud artifacts docker images describe "$IMAGE" --project="$PROJECT_ID" >/dev/null 2>&1; then
  gcloud builds triggers run "$AIONE_DEPLOY_TRIGGER_NAME" --region=global --branch=main --project="$PROJECT_ID" --quiet >/dev/null
  for i in $(seq 1 90); do
    gcloud artifacts docker images describe "$IMAGE" --project="$PROJECT_ID" >/dev/null 2>&1 && break
    [[ "$i" -eq 90 ]] && { echo '[AIONE][STOP] CURRENT main image unavailable.' >&2; exit 22; }
    sleep 10
  done
fi

echo '[AIONE] 2/4 Verify CURRENT service uses the same immutable image'
for i in $(seq 1 90); do
  SERVICE_IMAGE="$(gcloud run services describe "$AIONE_RUN_SERVICE" --region="$REGION" --project="$PROJECT_ID" --format='value(spec.template.spec.containers[0].image)')"
  [[ "$SERVICE_IMAGE" == "$IMAGE" ]] && break
  [[ "$i" -eq 90 ]] && { echo '[AIONE][STOP] CURRENT service image mismatch.' >&2; exit 23; }
  sleep 10
done

echo '[AIONE] 3/4 Execute the human-confirmed lifecycle decision on CURRENT database'
gcloud run jobs deploy "$LIFECYCLE_JOB" \
  --image="$IMAGE" \
  --region="$REGION" \
  --project="$PROJECT_ID" \
  --service-account="$RUNTIME_SA" \
  --set-cloudsql-instances="$CONNECTION" \
  --set-env-vars="DB_USER=${AIONE_DB_USER},DB_NAME=${AIONE_DB_NAME},INSTANCE_UNIX_SOCKET=/cloudsql/${CONNECTION},NODE_ENV=production,AIONE_ACCEPT_SOURCE_REF=${SOURCE_REF}" \
  --set-secrets="DB_PASS=${AIONE_DB_PASSWORD_SECRET}:latest" \
  --command=npm \
  --args=run,product:lifecycle:accept \
  --tasks=1 \
  --max-retries=0 \
  --task-timeout=10m \
  --quiet >/dev/null

set +e
EXECUTE_OUTPUT="$(gcloud run jobs execute "$LIFECYCLE_JOB" --region="$REGION" --project="$PROJECT_ID" --wait --format='value(metadata.name)' 2>&1)"
EXECUTE_CODE=$?
set -e
printf '%s\n' "$EXECUTE_OUTPUT"

EXECUTION="$(printf '%s\n' "$EXECUTE_OUTPUT" | grep -Eo 'aione-product-lifecycle-acceptance-current-[a-z0-9]+' | tail -n1 || true)"
if [[ -z "$EXECUTION" ]]; then
  EXECUTION="$(gcloud run jobs executions list --job="$LIFECYCLE_JOB" --region="$REGION" --project="$PROJECT_ID" --sort-by='~metadata.creationTimestamp' --limit=1 --format='value(metadata.name)' 2>/dev/null || true)"
fi
[[ -n "$EXECUTION" ]] || { echo '[AIONE][STOP] Lifecycle acceptance execution id missing.' >&2; exit 24; }

echo '[AIONE] 4/4 Read authoritative lifecycle result'
set +e
LOGS="$(gcloud beta run jobs executions logs read "$EXECUTION" --region="$REGION" --project="$PROJECT_ID" --limit=300 2>&1)"
LOG_READ_CODE=$?
set -e
printf '%s\n' "$LOGS"
[[ "$LOG_READ_CODE" -eq 0 ]] || { echo '[AIONE][STOP] Lifecycle acceptance logs could not be read.' >&2; exit 27; }
[[ "$EXECUTE_CODE" -eq 0 ]] || { echo '[AIONE][STOP] Product lifecycle acceptance execution failed. Root-cause logs are printed above.' >&2; exit 25; }
grep -q '"ok": true' <<<"$LOGS" || { echo '[AIONE][STOP] Product Lifecycle Acceptance V1 did not PASS.' >&2; exit 25; }
grep -q '"sourceRef": "855305580969"' <<<"$LOGS" || { echo '[AIONE][STOP] Wrong sourceRef in lifecycle acceptance.' >&2; exit 26; }
grep -Eq '"productCode": "MH[0-9]{7}"' <<<"$LOGS" || { echo '[AIONE][STOP] Product code contract did not PASS.' >&2; exit 28; }
grep -q '"finalStatus": "converted"' <<<"$LOGS" || { echo '[AIONE][STOP] ProductOpportunity did not reach converted state.' >&2; exit 29; }

printf '\n[AIONE] PRODUCT LIFECYCLE ACCEPTANCE V1 PASS\n'
printf 'Verified: human-confirmed 1688 sourceRef 855305580969 -> selected -> one formal Product -> MHxxxxxxx -> draft SKU -> converted, with idempotent re-run and retained source truth.\n'
