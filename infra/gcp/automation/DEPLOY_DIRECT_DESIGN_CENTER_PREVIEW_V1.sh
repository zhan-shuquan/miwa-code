#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
cd "$REPO_ROOT"

source infra/gcp/cloud-shell/CURRENT_BASELINE.sh
assert_aione_current_baseline

BRANCH="feat/design-center-tag-card-hero-v1"
PREVIEW_SERVICE="aione-design-center-preview"
PRODUCT_CODE="MH0000002"
URL_FILE="$HOME/aione_design_center_direct_url.txt"

[[ "$(git branch --show-current)" == "$BRANCH" ]] || { echo "[AIONE][STOP] Direct preview must run from $BRANCH" >&2; exit 20; }
[[ -z "$(git status --porcelain)" ]] || { echo '[AIONE][STOP] Repo must be clean before direct preview deploy.' >&2; exit 21; }
git pull --ff-only origin "$BRANCH" >/dev/null

gcloud config set project "$AIONE_PROJECT_ID" >/dev/null
PROJECT_ID="$AIONE_PROJECT_ID"
REGION="$AIONE_REGION"
RUNTIME_SA="${AIONE_RUNTIME_SERVICE_ACCOUNT_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"
CONNECTION="$(gcloud sql instances describe "$AIONE_SQL_INSTANCE" --project="$PROJECT_ID" --format='value(connectionName)')"
SHORT_SHA="$(git rev-parse --short=7 HEAD)"
IMAGE="${REGION}-docker.pkg.dev/${PROJECT_ID}/${AIONE_ARTIFACT_REPO}/${AIONE_IMAGE_NAME}:design-center-direct-${SHORT_SHA}"
TOKEN="$(python3 - <<'PY'
import secrets
print(secrets.token_urlsafe(24))
PY
)"

rm -f "$URL_FILE"

echo '[AIONE] 1/3 Build latest branch image only'
gcloud builds submit . --project="$PROJECT_ID" --tag="$IMAGE" --quiet >/dev/null

echo '[AIONE] 2/3 Deploy isolated direct Preview service with application token gate'
gcloud run deploy "$PREVIEW_SERVICE" \
  --image="$IMAGE" \
  --region="$REGION" \
  --project="$PROJECT_ID" \
  --service-account="$RUNTIME_SA" \
  --set-cloudsql-instances="$CONNECTION" \
  --set-secrets="DB_PASS=${AIONE_DB_PASSWORD_SECRET}:latest" \
  --set-env-vars="DB_USER=${AIONE_DB_USER},DB_NAME=${AIONE_DB_NAME},INSTANCE_UNIX_SOCKET=/cloudsql/${CONNECTION},NODE_ENV=production,AIONE_ENABLE_DESIGN_CENTER_PREVIEW=true,AIONE_DESIGN_CENTER_PREVIEW_ROOT=/app/design-center-preview,AIONE_REQUIRE_GOOGLE_AUTH=false,AIONE_ALLOW_PREVIEW_ACTOR=true,AIONE_ALLOW_SYSTEM_WRITES=true,AIONE_PREVIEW_ACCESS_TOKEN=${TOKEN}" \
  --allow-unauthenticated \
  --quiet >/dev/null

SERVICE_URL="$(gcloud run services describe "$PREVIEW_SERVICE" --region="$REGION" --project="$PROJECT_ID" --format='value(status.url)')"
DIRECT_URL="${SERVICE_URL}/design-center-v1.html?product=${PRODUCT_CODE}&preview_key=${TOKEN}"

echo '[AIONE] 3/3 Verify direct access path'
BODY="$(curl -fsS -c /tmp/aione-preview-cookie.txt "$DIRECT_URL")"
grep -Fq '设计中心 V1' <<<"$BODY"
API="$(curl -fsS -b /tmp/aione-preview-cookie.txt "${SERVICE_URL}/api/v1/design-center/workbench?product=${PRODUCT_CODE}")"
printf '%s' "$API" | python3 -c 'import json,sys; p=json.load(sys.stdin)["workbench"]; assert p["product"]["productCode"]=="MH0000002"; assert p["product"]["productData"]["supportedSize"]=="24–27cm"; assert p["tagCard"]["brand_name_en"]=="SOCKONE"; print("[AIONE] Direct workbench PASS")'

printf '%s\n' "$DIRECT_URL" > "$URL_FILE"
chmod 600 "$URL_FILE"

printf '\n[AIONE] DIRECT DESIGN CENTER PREVIEW READY\n'
printf 'URL           : %s\n' "$DIRECT_URL"
printf 'URL file      : %s\n' "$URL_FILE"
printf 'Main service  : UNCHANGED\n'
printf 'Migration     : NO\n'
printf 'Image generate: NO\n'
printf 'Access        : isolated Preview service + application token gate\n'
