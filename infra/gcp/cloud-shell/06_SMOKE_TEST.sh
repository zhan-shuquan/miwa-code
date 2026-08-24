#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/lib.sh"

SERVICE_URL="$(gcloud run services describe "$RUN_SERVICE" --region="$REGION" --project="$PROJECT_ID" --format='value(status.url)')"
[[ -n "$SERVICE_URL" ]] || die "Cloud Run service URL not found."
TOKEN="$(gcloud auth print-identity-token)"

say "Cloud Run /health"
curl -fsS -H "Authorization: Bearer $TOKEN" "$SERVICE_URL/health" | jq .

say "AI Secretary runtime status (still Preview unless explicitly changed later)"
curl -fsS -H "Authorization: Bearer $TOKEN" "$SERVICE_URL/api/v1/ai-secretary/status" | jq '{mode,model,writePolicy,toolNames,offices:[.offices[]|{code,name,status}]}'

say "Cloud Run recent warning/error logs"
gcloud logging read \
  "resource.type=cloud_run_revision AND resource.labels.service_name=${RUN_SERVICE} AND severity>=WARNING" \
  --project="$PROJECT_ID" --limit=30 --freshness=30m \
  --format='table(timestamp,severity,textPayload,jsonPayload.message)' || true

cat <<TXT

[AIONE] Cloud data/runtime smoke test completed.
Service remains private. This is intentional until AIONE end-user authentication is wired to Cloud Run.
Current URL: $SERVICE_URL
Next stage after this passes: connect real authentication, then inject OPENAI_API_KEY from Secret Manager and switch AIONE_AI_MODE=openai.
TXT
