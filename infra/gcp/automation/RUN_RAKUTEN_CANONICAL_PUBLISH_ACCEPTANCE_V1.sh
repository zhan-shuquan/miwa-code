#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
cd "$REPO_ROOT"

source infra/gcp/cloud-shell/CURRENT_BASELINE.sh
assert_aione_current_baseline

[[ "$(git branch --show-current)" == "main" ]] || { echo '[AIONE][STOP] Rakuten acceptance must run from main.' >&2; exit 20; }
[[ -z "$(git status --porcelain)" ]] || { echo '[AIONE][STOP] Repo must be clean before Rakuten acceptance.' >&2; exit 21; }
git pull --ff-only origin main >/dev/null

PROJECT_ID="$AIONE_PROJECT_ID"
REGION="$AIONE_REGION"
RUNTIME_SA="${AIONE_RUNTIME_SERVICE_ACCOUNT_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"
SHORT_SHA="$(git rev-parse --short=7 HEAD)"
IMAGE="${REGION}-docker.pkg.dev/${PROJECT_ID}/${AIONE_ARTIFACT_REPO}/${AIONE_IMAGE_NAME}:main-${SHORT_SHA}"
CONNECTION="$(gcloud sql instances describe "$AIONE_SQL_INSTANCE" --project="$PROJECT_ID" --format='value(connectionName)')"
JOB="aione-rakuten-canonical-acceptance-current"
SHOP_REF="global-dimensions"
PRODUCT_CODE="MH0000002"
SOURCE_REF="855305580969"
CONTAINER_CODE="rkc001"

cleanup() {
  gcloud run jobs delete "$JOB" --region="$REGION" --project="$PROJECT_ID" --quiet >/dev/null 2>&1 || true
}
trap cleanup EXIT

printf '\n[AIONE] Rakuten Canonical Publish Backend Closure V1\n'
printf 'Main SHA     : %s\n' "$SHORT_SHA"
printf 'Image        : %s\n' "$IMAGE"
printf 'Cloud SQL    : %s\n' "$AIONE_SQL_INSTANCE"
printf 'Product      : %s\n' "$PRODUCT_CODE"
printf 'Source Ref   : %s\n' "$SOURCE_REF"
printf 'Target Store : %s\n' "$SHOP_REF"
printf 'R-Cabinet    : %s\n\n' "$CONTAINER_CODE"

echo '[AIONE] 1/5 Confirm CURRENT immutable image and service alignment'
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
  [[ "$i" -eq 90 ]] && { echo '[AIONE][STOP] CURRENT immutable image/service alignment timed out.' >&2; exit 22; }
  sleep 10
done

echo '[AIONE] 2/5 Resolve the CURRENT Rakuten secret bindings from the only Cloud Run service'
SERVICE_JSON="$(gcloud run services describe "$AIONE_RUN_SERVICE" --region="$REGION" --project="$PROJECT_ID" --format=json)"
RAKUTEN_SECRET_NAME="$(printf '%s' "$SERVICE_JSON" | python3 -c 'import json,sys; p=json.load(sys.stdin); env=p["spec"]["template"]["spec"]["containers"][0].get("env",[]); print(next((x.get("valueFrom",{}).get("secretKeyRef",{}).get("name","") for x in env if x.get("name")=="AIONE_RAKUTEN_SERVICE_SECRET"),""))')"
RAKUTEN_LICENSE_NAME="$(printf '%s' "$SERVICE_JSON" | python3 -c 'import json,sys; p=json.load(sys.stdin); env=p["spec"]["template"]["spec"]["containers"][0].get("env",[]); print(next((x.get("valueFrom",{}).get("secretKeyRef",{}).get("name","") for x in env if x.get("name")=="AIONE_RAKUTEN_LICENSE_KEY"),""))')"
[[ -n "$RAKUTEN_SECRET_NAME" ]] || { echo '[AIONE][STOP] CURRENT service has no AIONE_RAKUTEN_SERVICE_SECRET binding.' >&2; exit 23; }
[[ -n "$RAKUTEN_LICENSE_NAME" ]] || { echo '[AIONE][STOP] CURRENT service has no AIONE_RAKUTEN_LICENSE_KEY binding.' >&2; exit 24; }

echo '[AIONE] 3/5 Confirm canonical Product asset bucket exists'
gcloud storage buckets describe "gs://${AIONE_PRODUCT_ASSET_BUCKET}" --project="$PROJECT_ID" >/dev/null 2>&1 || {
  echo '[AIONE][STOP] CURRENT Product asset bucket is missing.' >&2
  exit 25
}

echo '[AIONE] 4/5 Deploy one ephemeral acceptance job against global-dimensions only'
gcloud run jobs deploy "$JOB" \
  --image="$IMAGE" \
  --region="$REGION" \
  --project="$PROJECT_ID" \
  --service-account="$RUNTIME_SA" \
  --set-cloudsql-instances="$CONNECTION" \
  --set-env-vars="DB_USER=${AIONE_DB_USER},DB_NAME=${AIONE_DB_NAME},INSTANCE_UNIX_SOCKET=/cloudsql/${CONNECTION},NODE_ENV=production,AIONE_PRODUCT_ASSET_BUCKET=${AIONE_PRODUCT_ASSET_BUCKET}" \
  --set-secrets="DB_PASS=${AIONE_DB_PASSWORD_SECRET}:latest,AIONE_RAKUTEN_SERVICE_SECRET=${RAKUTEN_SECRET_NAME}:latest,AIONE_RAKUTEN_LICENSE_KEY=${RAKUTEN_LICENSE_NAME}:latest" \
  --command=npm \
  --args=run,rakuten:canonical:accept \
  --tasks=1 \
  --max-retries=0 \
  --task-timeout=20m \
  --memory=1Gi \
  --quiet >/dev/null

echo '[AIONE] 5/5 Publish exactly one canonical main image and prove idempotency'
set +e
OUTPUT="$(gcloud run jobs execute "$JOB" --region="$REGION" --project="$PROJECT_ID" --wait --format='value(metadata.name)' 2>&1)"
CODE=$?
set -e
printf '%s\n' "$OUTPUT"
EXECUTION="$(printf '%s\n' "$OUTPUT" | grep -Eo 'aione-rakuten-canonical-acceptance-current-[a-z0-9]+' | tail -n1 || true)"
if [[ -z "$EXECUTION" ]]; then
  EXECUTION="$(gcloud run jobs executions list --job="$JOB" --region="$REGION" --project="$PROJECT_ID" --sort-by='~metadata.creationTimestamp' --limit=1 --format='value(metadata.name)' 2>/dev/null || true)"
fi
[[ -n "$EXECUTION" ]] || { echo '[AIONE][STOP] Rakuten acceptance execution id missing.' >&2; exit 26; }

set +e
LOGS="$(gcloud beta run jobs executions logs read "$EXECUTION" --region="$REGION" --project="$PROJECT_ID" --limit=1000 2>&1)"
LOG_CODE=$?
set -e
printf '\n[AIONE] authoritative logs\n%s\n' "$LOGS"
[[ "$LOG_CODE" -eq 0 ]] || { echo '[AIONE][STOP] Rakuten acceptance logs could not be read.' >&2; exit 27; }
[[ "$CODE" -eq 0 ]] || { echo '[AIONE][STOP] Rakuten canonical publish acceptance failed. Root-cause logs are printed above.' >&2; exit 28; }

grep -q '"ok": true' <<<"$LOGS" || { echo '[AIONE][STOP] Acceptance did not return ok=true.' >&2; exit 29; }
grep -q '"productCode": "MH0000002"' <<<"$LOGS" || { echo '[AIONE][STOP] Wrong Product was used.' >&2; exit 30; }
grep -q '"sourceRef": "855305580969"' <<<"$LOGS" || { echo '[AIONE][STOP] Wrong sourceRef was used.' >&2; exit 31; }
grep -q '"shopRef": "global-dimensions"' <<<"$LOGS" || { echo '[AIONE][STOP] Wrong Rakuten store was used.' >&2; exit 32; }
grep -q '"secondRunReused": true' <<<"$LOGS" || { echo '[AIONE][STOP] Idempotency reuse was not proven.' >&2; exit 33; }
grep -q '"channelMappingCount": 1' <<<"$LOGS" || { echo '[AIONE][STOP] Exactly one canonical channel mapping was not proven.' >&2; exit 34; }
grep -q '"externalAssetId":' <<<"$LOGS" || { echo '[AIONE][STOP] Rakuten provider asset identity missing.' >&2; exit 35; }

printf '\n[AIONE] RAKUTEN CANONICAL PUBLISH BACKEND CLOSURE V1 PASS\n'
printf 'Verified: MH0000002 canonical GCS main image -> explicit Rakuten main_images assignment -> global-dimensions/rkc001 -> R-Cabinet provider identity -> one channel mapping -> idempotent second run.\n'
