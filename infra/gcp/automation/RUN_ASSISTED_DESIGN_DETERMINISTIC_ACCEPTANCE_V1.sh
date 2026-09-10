#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
cd "$REPO_ROOT"

source infra/gcp/cloud-shell/CURRENT_BASELINE.sh
assert_aione_current_baseline

[[ "$(git branch --show-current)" == "main" ]] || { echo '[AIONE][STOP] Assisted Design acceptance must run from main.' >&2; exit 20; }
[[ -z "$(git status --porcelain)" ]] || { echo '[AIONE][STOP] Repo must be clean before acceptance.' >&2; exit 21; }
git pull --ff-only origin main >/dev/null

PROJECT_ID="$AIONE_PROJECT_ID"
REGION="$AIONE_REGION"
RUNTIME_SA="${AIONE_RUNTIME_SERVICE_ACCOUNT_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"
SHORT_SHA="$(git rev-parse --short=7 HEAD)"
IMAGE="${REGION}-docker.pkg.dev/${PROJECT_ID}/${AIONE_ARTIFACT_REPO}/${AIONE_IMAGE_NAME}:main-${SHORT_SHA}"
CONNECTION="$(gcloud sql instances describe "$AIONE_SQL_INSTANCE" --project="$PROJECT_ID" --format='value(connectionName)')"
JOB="aione-assisted-design-deterministic-acceptance-current"
BUCKET="$AIONE_PRODUCT_ASSET_BUCKET"
MIGRATION_JOB="$AIONE_MIGRATION_JOB"
HUMAN_EMAIL="$(printf '%s' "${AIONE_ACCEPT_HUMAN_EMAIL:-$(gcloud config get-value account 2>/dev/null)}" | tr '[:upper:]' '[:lower:]' | xargs)"

[[ -n "$HUMAN_EMAIL" && "$HUMAN_EMAIL" == *@* ]] || { echo '[AIONE][STOP] Explicit or active Google account email could not be resolved.' >&2; exit 24; }
[[ "$HUMAN_EMAIL" != "info@miwa-happyhouse.com" ]] || { echo '[AIONE][STOP] Transitional admin identity cannot be used as human acceptance evidence.' >&2; exit 25; }

cleanup() {
  gcloud run jobs delete "$JOB" --region="$REGION" --project="$PROJECT_ID" --quiet >/dev/null 2>&1 || true
}
trap cleanup EXIT

printf '\n[AIONE] Assisted Design Deterministic Backend Closure V1\n'
printf 'Main SHA     : %s\n' "$SHORT_SHA"
printf 'Product      : MH0000002\n'
printf 'Canvas       : 1000x1500\n'
printf 'Human Email  : %s\n' "$HUMAN_EMAIL"
printf 'GCS Bucket   : %s\n\n' "$BUCKET"

wait_for_image() {
  for i in $(seq 1 90); do
    if gcloud artifacts docker images describe "$IMAGE" --project="$PROJECT_ID" >/dev/null 2>&1; then
      echo "[AIONE] Target image ready: $IMAGE"
      return 0
    fi
    if (( i % 6 == 0 )); then
      echo "[AIONE] Waiting for immutable image... $((i * 10))s"
    fi
    sleep 10
  done
  echo '[AIONE][STOP] CURRENT immutable image build timed out.' >&2
  return 22
}

wait_for_service_alignment() {
  for i in $(seq 1 90); do
    SERVICE_IMAGE="$(gcloud run services describe "$AIONE_RUN_SERVICE" --region="$REGION" --project="$PROJECT_ID" --format='value(spec.template.spec.containers[0].image)' 2>/dev/null || true)"
    if [[ "$SERVICE_IMAGE" == "$IMAGE" ]]; then
      echo "[AIONE] CURRENT service aligned: $SERVICE_IMAGE"
      return 0
    fi
    if (( i % 6 == 0 )); then
      echo "[AIONE] Waiting for service alignment... current=${SERVICE_IMAGE:-unknown} target=$IMAGE elapsed=$((i * 10))s"
    fi
    sleep 10
  done
  echo '[AIONE][STOP] CURRENT immutable image/service alignment timed out.' >&2
  return 23
}

echo '[AIONE] 1/5 Ensure CURRENT immutable image exists'
if ! gcloud artifacts docker images describe "$IMAGE" --project="$PROJECT_ID" >/dev/null 2>&1; then
  echo '[AIONE] Target image is missing; trigger CURRENT main build.'
  gcloud builds triggers run "$AIONE_DEPLOY_TRIGGER_NAME" --region=global --branch=main --project="$PROJECT_ID" --quiet >/dev/null || true
fi
wait_for_image

echo '[AIONE] 2/5 Align CURRENT database migration and service'
SERVICE_IMAGE="$(gcloud run services describe "$AIONE_RUN_SERVICE" --region="$REGION" --project="$PROJECT_ID" --format='value(spec.template.spec.containers[0].image)' 2>/dev/null || true)"
if [[ "$SERVICE_IMAGE" != "$IMAGE" ]]; then
  echo "[AIONE] Service is behind CURRENT main. current=${SERVICE_IMAGE:-unknown} target=$IMAGE"
  echo '[AIONE] Apply reviewed CURRENT migrations using the canonical migration job.'
  gcloud run jobs deploy "$MIGRATION_JOB" \
    --image="$IMAGE" \
    --region="$REGION" \
    --project="$PROJECT_ID" \
    --service-account="$RUNTIME_SA" \
    --set-cloudsql-instances="$CONNECTION" \
    --set-env-vars="DB_USER=${AIONE_DB_USER},DB_NAME=${AIONE_DB_NAME},INSTANCE_UNIX_SOCKET=/cloudsql/${CONNECTION},NODE_ENV=production" \
    --set-secrets="DB_PASS=${AIONE_DB_PASSWORD_SECRET}:latest" \
    --command=npm \
    --args=run,db:migrate \
    --tasks=1 \
    --max-retries=0 \
    --task-timeout=10m \
    --quiet >/dev/null
  gcloud run jobs execute "$MIGRATION_JOB" --region="$REGION" --project="$PROJECT_ID" --wait >/dev/null

  echo '[AIONE] Re-trigger CURRENT deployment after migration gate is satisfied.'
  gcloud builds triggers run "$AIONE_DEPLOY_TRIGGER_NAME" --region=global --branch=main --project="$PROJECT_ID" --quiet >/dev/null
  wait_for_service_alignment
else
  echo "[AIONE] CURRENT service already aligned: $SERVICE_IMAGE"
fi

echo '[AIONE] 3/5 Confirm canonical Product asset bucket exists'
gcloud storage buckets describe "gs://${BUCKET}" --project="$PROJECT_ID" >/dev/null

echo '[AIONE] 4/5 Deploy one ephemeral CURRENT deterministic acceptance job'
gcloud run jobs deploy "$JOB" \
  --image="$IMAGE" \
  --region="$REGION" \
  --project="$PROJECT_ID" \
  --service-account="$RUNTIME_SA" \
  --set-cloudsql-instances="$CONNECTION" \
  --set-env-vars="DB_USER=${AIONE_DB_USER},DB_NAME=${AIONE_DB_NAME},INSTANCE_UNIX_SOCKET=/cloudsql/${CONNECTION},NODE_ENV=production,AIONE_PRODUCT_ASSET_BUCKET=${BUCKET},AIONE_ACCEPT_HUMAN_EMAIL=${HUMAN_EMAIL}" \
  --set-secrets="DB_PASS=${AIONE_DB_PASSWORD_SECRET}:latest" \
  --command=bash \
  --args=-lc,'npm run db:migrate && npm run design:deterministic:accept' \
  --tasks=1 \
  --max-retries=0 \
  --task-timeout=20m \
  --memory=2Gi \
  --quiet >/dev/null

echo '[AIONE] 5/5 Execute against real CURRENT Product and read authoritative logs'
set +e
OUTPUT="$(gcloud run jobs execute "$JOB" --region="$REGION" --project="$PROJECT_ID" --wait --format='value(metadata.name)' 2>&1)"
CODE=$?
set -e
printf '%s\n' "$OUTPUT"
EXECUTION="$(printf '%s\n' "$OUTPUT" | grep -Eo 'aione-assisted-design-deterministic-acceptance-current-[a-z0-9]+' | tail -n1 || true)"
if [[ -z "$EXECUTION" ]]; then
  EXECUTION="$(gcloud run jobs executions list --job="$JOB" --region="$REGION" --project="$PROJECT_ID" --sort-by='~metadata.creationTimestamp' --limit=1 --format='value(metadata.name)' 2>/dev/null || true)"
fi
[[ -n "$EXECUTION" ]] || { echo '[AIONE][STOP] Acceptance execution id missing.' >&2; exit 26; }
LOGS="$(gcloud beta run jobs executions logs read "$EXECUTION" --region="$REGION" --project="$PROJECT_ID" --limit=1000 2>&1)"
printf '\n[AIONE] authoritative logs\n%s\n' "$LOGS"
[[ "$CODE" -eq 0 ]] || { echo '[AIONE][STOP] Assisted Design deterministic acceptance failed. Root-cause logs are printed above.' >&2; exit 27; }
grep -q '"ok": true' <<<"$LOGS" || { echo '[AIONE][STOP] Acceptance did not return ok=true.' >&2; exit 28; }
grep -q '"productCode": "MH0000002"' <<<"$LOGS" || { echo '[AIONE][STOP] Acceptance used the wrong Product.' >&2; exit 29; }
grep -q '"outputLayer": "DERIVED"' <<<"$LOGS" || { echo '[AIONE][STOP] DERIVED ProductAsset evidence missing.' >&2; exit 30; }
grep -q '"canvas": "1000x1500"' <<<"$LOGS" || { echo '[AIONE][STOP] Canvas normalization evidence missing.' >&2; exit 31; }
grep -q '"secondExecutionReused": true' <<<"$LOGS" || { echo '[AIONE][STOP] Execution idempotency was not proven.' >&2; exit 32; }
grep -q '"reviewStatus": "approved"' <<<"$LOGS" || { echo '[AIONE][STOP] Human review approval evidence missing.' >&2; exit 33; }
grep -q '"humanIdentityResolution": "explicit_active_google_identity"' <<<"$LOGS" || { echo '[AIONE][STOP] Explicit human identity evidence missing.' >&2; exit 34; }
grep -q 'ASSISTED DESIGN DETERMINISTIC BACKEND CLOSURE V1 PASS' <<<"$LOGS" || { echo '[AIONE][STOP] PASS marker missing.' >&2; exit 35; }

printf '\n[AIONE] ASSISTED DESIGN DETERMINISTIC BACKEND CLOSURE V1 PASS\n'
printf 'Verified: MH0000002 canonical SOURCE main image -> explicitly resolved active Google human -> approved DesignTask -> deterministic 1000x1500 normalization -> GCS DERIVED object -> ProductAsset provenance -> explicit human review -> idempotent second execution.\n'
