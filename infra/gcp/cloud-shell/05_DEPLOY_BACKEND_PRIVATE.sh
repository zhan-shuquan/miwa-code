#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/lib.sh"
require_db_secret
print_context

say "Deploy AIONE Backend privately to Cloud Run"
gcloud run deploy "$RUN_SERVICE" \
  --image="$IMAGE_URI" \
  --region="$REGION" \
  --project="$PROJECT_ID" \
  --service-account="$RUNTIME_SA_EMAIL" \
  --set-cloudsql-instances="$INSTANCE_CONNECTION_NAME" \
  --update-secrets="DB_PASS=${DB_PASSWORD_SECRET}:latest" \
  --update-env-vars="DB_USER=${DB_USER},DB_NAME=${DB_NAME},INSTANCE_UNIX_SOCKET=${INSTANCE_UNIX_SOCKET},NODE_ENV=production,AIONE_ALLOW_PREVIEW_ACTOR=false,AIONE_ALLOW_SYSTEM_WRITES=false,AIONE_AI_MODE=${AI_MODE},AIONE_CORS_ORIGINS=http://127.0.0.1:5500\,http://localhost:5500" \
  --no-allow-unauthenticated

say "Private deployment complete"
gcloud run services describe "$RUN_SERVICE" --region="$REGION" --project="$PROJECT_ID" --format='yaml(metadata.name,status.url,status.latestReadyRevisionName,spec.template.spec.serviceAccountName)'
echo "Next: ./06_SMOKE_TEST.sh"
