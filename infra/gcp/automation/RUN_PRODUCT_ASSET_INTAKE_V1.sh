#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
cd "$REPO_ROOT"

source infra/gcp/cloud-shell/CURRENT_BASELINE.sh
assert_aione_current_baseline

[[ "$(git branch --show-current)" == "main" ]] || { echo '[AIONE][STOP] Product Asset Intake acceptance must run from main.' >&2; exit 20; }
[[ -z "$(git status --porcelain)" ]] || { echo '[AIONE][STOP] Repo must be clean before Product Asset Intake acceptance.' >&2; exit 21; }
git pull --ff-only origin main >/dev/null

PROJECT_ID="$AIONE_PROJECT_ID"
REGION="$AIONE_REGION"
RUNTIME_SA="${AIONE_RUNTIME_SERVICE_ACCOUNT_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"
SHORT_SHA="$(git rev-parse --short=7 HEAD)"
IMAGE="${REGION}-docker.pkg.dev/${PROJECT_ID}/${AIONE_ARTIFACT_REPO}/${AIONE_IMAGE_NAME}:main-${SHORT_SHA}"
CONNECTION="$(gcloud sql instances describe "$AIONE_SQL_INSTANCE" --project="$PROJECT_ID" --format='value(connectionName)')"
SOURCE_REF="855305580969"
BUCKET="$AIONE_PRODUCT_ASSET_BUCKET"
JOB="$AIONE_PRODUCT_ASSET_INTAKE_JOB"

cleanup() {
  gcloud run jobs delete "$JOB" --region="$REGION" --project="$PROJECT_ID" --quiet >/dev/null 2>&1 || true
}
trap cleanup EXIT

printf '\n[AIONE] Product Asset Intake Backend Closure V1\n'
printf 'Main SHA     : %s\n' "$SHORT_SHA"
printf 'Image        : %s\n' "$IMAGE"
printf 'Cloud SQL    : %s\n' "$AIONE_SQL_INSTANCE"
printf 'Source Ref   : %s\n' "$SOURCE_REF"
printf 'GCS Bucket   : %s\n\n' "$BUCKET"

echo '[AIONE] 1/6 Ensure the only CURRENT Product asset bucket exists'
if ! gcloud storage buckets describe "gs://${BUCKET}" --project="$PROJECT_ID" >/dev/null 2>&1; then
  gcloud storage buckets create "gs://${BUCKET}" \
    --project="$PROJECT_ID" \
    --location="$REGION" \
    --uniform-bucket-level-access \
    --public-access-prevention >/dev/null
fi
BUCKET_PROJECT="$(gcloud storage buckets describe "gs://${BUCKET}" --project="$PROJECT_ID" --format='value(projectNumber)')"
PROJECT_NUMBER="$(gcloud projects describe "$PROJECT_ID" --format='value(projectNumber)')"
[[ "$BUCKET_PROJECT" == "$PROJECT_NUMBER" ]] || { echo '[AIONE][STOP] Product asset bucket does not belong to CURRENT project.' >&2; exit 22; }

echo '[AIONE] 2/6 Ensure CURRENT runtime can write Product SOURCE assets'
gcloud storage buckets add-iam-policy-binding "gs://${BUCKET}" \
  --member="serviceAccount:${RUNTIME_SA}" \
  --role='roles/storage.objectAdmin' \
  --project="$PROJECT_ID" >/dev/null

echo '[AIONE] 3/6 Ensure CURRENT immutable main image exists and service is aligned'
if ! gcloud artifacts docker images describe "$IMAGE" --project="$PROJECT_ID" >/dev/null 2>&1; then
  gcloud builds triggers run "$AIONE_DEPLOY_TRIGGER_NAME" --region=global --branch=main --project="$PROJECT_ID" --quiet >/dev/null
fi
for i in $(seq 1 90); do
  IMAGE_READY=0
  SERVICE_READY=0
  gcloud artifacts docker images describe "$IMAGE" --project="$PROJECT_ID" >/dev/null 2>&1 && IMAGE_READY=1
  SERVICE_IMAGE="$(gcloud run services describe "$AIONE_RUN_SERVICE" --region="$REGION" --project="$PROJECT_ID" --format='value(spec.template.spec.containers[0].image)' 2>/dev/null || true)"
  [[ "$SERVICE_IMAGE" == "$IMAGE" ]] && SERVICE_READY=1
  [[ "$IMAGE_READY" -eq 1 && "$SERVICE_READY" -eq 1 ]] && break
  [[ "$i" -eq 90 ]] && { echo '[AIONE][STOP] CURRENT immutable image/service alignment timed out.' >&2; exit 23; }
  sleep 10
done

echo '[AIONE] 4/6 Deploy one ephemeral CURRENT Product Asset Intake job'
gcloud run jobs deploy "$JOB" \
  --image="$IMAGE" \
  --region="$REGION" \
  --project="$PROJECT_ID" \
  --service-account="$RUNTIME_SA" \
  --set-cloudsql-instances="$CONNECTION" \
  --set-env-vars="DB_USER=${AIONE_DB_USER},DB_NAME=${AIONE_DB_NAME},INSTANCE_UNIX_SOCKET=/cloudsql/${CONNECTION},NODE_ENV=production,AIONE_PRODUCT_ASSET_SOURCE_REF=${SOURCE_REF},AIONE_PRODUCT_ASSET_BUCKET=${BUCKET}" \
  --set-secrets="DB_PASS=${AIONE_DB_PASSWORD_SECRET}:latest" \
  --command=npm \
  --args=run,product:assets:intake \
  --tasks=1 \
  --max-retries=0 \
  --task-timeout=20m \
  --memory=2Gi \
  --quiet >/dev/null

run_and_read() {
  local label="$1"
  local output code execution logs
  set +e
  output="$(gcloud run jobs execute "$JOB" --region="$REGION" --project="$PROJECT_ID" --wait --format='value(metadata.name)' 2>&1)"
  code=$?
  set -e
  printf '%s\n' "$output" >&2
  execution="$(printf '%s\n' "$output" | grep -Eo 'aione-product-asset-intake-current-[a-z0-9]+' | tail -n1 || true)"
  if [[ -z "$execution" ]]; then
    execution="$(gcloud run jobs executions list --job="$JOB" --region="$REGION" --project="$PROJECT_ID" --sort-by='~metadata.creationTimestamp' --limit=1 --format='value(metadata.name)' 2>/dev/null || true)"
  fi
  [[ -n "$execution" ]] || { echo '[AIONE][STOP] Product Asset Intake execution id missing.' >&2; return 24; }

  set +e
  logs="$(gcloud beta run jobs executions logs read "$execution" --region="$REGION" --project="$PROJECT_ID" --limit=1000 2>&1)"
  local log_code=$?
  set -e
  printf '\n[AIONE] %s authoritative logs\n%s\n' "$label" "$logs" >&2
  [[ "$log_code" -eq 0 ]] || { echo '[AIONE][STOP] Product Asset Intake logs could not be read.' >&2; return 25; }
  [[ "$code" -eq 0 ]] || { echo '[AIONE][STOP] Product Asset Intake execution failed. Root-cause logs are printed above.' >&2; return 26; }
  grep -q '"ok": true' <<<"$logs" || { echo '[AIONE][STOP] Product Asset Intake did not return ok=true.' >&2; return 27; }
  grep -q '"sourceRef": "855305580969"' <<<"$logs" || { echo '[AIONE][STOP] Product Asset Intake used the wrong sourceRef.' >&2; return 28; }
  grep -q '"productCode": "MH0000002"' <<<"$logs" || { echo '[AIONE][STOP] Product Asset Intake used the wrong Product.' >&2; return 29; }
  grep -q 'source_main_image' <<<"$logs" || { echo '[AIONE][STOP] 1688 主图 directory was not recognized.' >&2; return 30; }
  grep -q 'source_sku_image' <<<"$logs" || { echo '[AIONE][STOP] 1688 sku图片 directory was not recognized.' >&2; return 31; }
  grep -q 'source_detail_image' <<<"$logs" || { echo '[AIONE][STOP] 1688 详情 directory was not recognized.' >&2; return 32; }
  grep -q 'source_video' <<<"$logs" || { echo '[AIONE][STOP] 1688 视频 directory was not recognized.' >&2; return 33; }
  printf '%s' "$logs"
}

echo '[AIONE] 5/6 Execute real SOURCE intake from Drive -> GCS -> ProductAsset'
FIRST_LOGS="$(run_and_read 'FIRST RUN')"
FIRST_COUNT="$(grep -E '"sourceAssetCount": [0-9]+' <<<"$FIRST_LOGS" | tail -n1 | grep -Eo '[0-9]+' | tail -n1)"
[[ -n "$FIRST_COUNT" && "$FIRST_COUNT" -gt 0 ]] || { echo '[AIONE][STOP] No SOURCE ProductAsset was formalized.' >&2; exit 34; }

echo '[AIONE] 6/6 Re-run and prove idempotency'
SECOND_LOGS="$(run_and_read 'SECOND RUN')"
SECOND_COUNT="$(grep -E '"sourceAssetCount": [0-9]+' <<<"$SECOND_LOGS" | tail -n1 | grep -Eo '[0-9]+' | tail -n1)"
SECOND_CREATED="$(grep -E '"createdAssetCount": [0-9]+' <<<"$SECOND_LOGS" | tail -n1 | grep -Eo '[0-9]+' | tail -n1)"
SECOND_UPLOADED="$(grep -E '"uploadedObjectCount": [0-9]+' <<<"$SECOND_LOGS" | tail -n1 | grep -Eo '[0-9]+' | tail -n1)"
[[ "$SECOND_COUNT" == "$FIRST_COUNT" ]] || { echo '[AIONE][STOP] SOURCE ProductAsset count changed on idempotency re-run.' >&2; exit 35; }
[[ "$SECOND_CREATED" == "0" ]] || { echo '[AIONE][STOP] Idempotency failed: second run created ProductAssets.' >&2; exit 36; }
[[ "$SECOND_UPLOADED" == "0" ]] || { echo '[AIONE][STOP] Idempotency failed: second run uploaded duplicate GCS objects.' >&2; exit 37; }

printf '\n[AIONE] PRODUCT ASSET INTAKE BACKEND CLOSURE V1 PASS\n'
printf 'Verified: Drive ZIP evidence -> safe temporary extraction -> four 1688 source roles -> GCS SOURCE objects -> ProductAsset(MH0000002) -> GCS size verification -> idempotent second run.\n'
