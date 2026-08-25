#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/lib.sh"

SERVICE_URL="$(gcloud run services describe "$RUN_SERVICE" --region="$REGION" --project="$PROJECT_ID" --format='value(status.url)')"
[[ -n "$SERVICE_URL" ]] || die "Cloud Run service URL not found."
IAM_TOKEN="$(gcloud auth print-identity-token)"

say "Cloud Run /health through IAM"
curl -fsS -H "Authorization: Bearer $IAM_TOKEN" "$SERVICE_URL/health" | jq .

if [[ -n "${AIONE_TEST_GOOGLE_ID_TOKEN:-}" ]]; then
  say "AI Secretary status through dual auth (Cloud Run IAM + AIONE Google user)"
  curl -fsS \
    -H "X-Serverless-Authorization: Bearer $IAM_TOKEN" \
    -H "Authorization: Bearer $AIONE_TEST_GOOGLE_ID_TOKEN" \
    "$SERVICE_URL/api/v1/ai-secretary/status" \
    | jq '{mode,model,writePolicy,toolNames,offices:[.offices[]|{code,name,status}]}'
else
  say "Verify API refuses a request that has Cloud Run IAM but no AIONE user token"
  STATUS="$(curl -sS -o /tmp/aione-smoke-auth.json -w '%{http_code}' -H "Authorization: Bearer $IAM_TOKEN" "$SERVICE_URL/api/v1/ai-secretary/status")"
  if [[ "$STATUS" != "401" ]]; then
    cat /tmp/aione-smoke-auth.json >&2 || true
    die "Expected API user-auth gate to return 401; got $STATUS"
  fi
  jq . /tmp/aione-smoke-auth.json || cat /tmp/aione-smoke-auth.json
  warn "AIONE_TEST_GOOGLE_ID_TOKEN not set. Browser end-to-end validation will provide the employee Google token through Vercel."
fi

say "Cloud Run recent warning/error logs"
gcloud logging read \
  "resource.type=cloud_run_revision AND resource.labels.service_name=${RUN_SERVICE} AND severity>=WARNING" \
  --project="$PROJECT_ID" --limit=30 --freshness=30m \
  --format='table(timestamp,severity,textPayload,jsonPayload.message)' || true

cat <<TXT

[AIONE] Cloud data/runtime smoke test completed.
Service remains private. This is intentional.
Current URL: $SERVICE_URL
V1.9.21 adds a separate AIONE Google-user authentication layer behind Cloud Run IAM.
TXT
