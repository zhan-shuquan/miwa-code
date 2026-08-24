#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/lib.sh"
require_db_secret
print_context

say "Deploy read-only DB preflight as a Cloud Run Job"
gcloud run jobs deploy "$PREFLIGHT_JOB" \
  --image="$IMAGE_URI" \
  --region="$REGION" \
  --project="$PROJECT_ID" \
  --service-account="$RUNTIME_SA_EMAIL" \
  --set-cloudsql-instances="$INSTANCE_CONNECTION_NAME" \
  --set-env-vars="$(job_env_flags)" \
  --set-secrets="DB_PASS=${DB_PASSWORD_SECRET}:latest" \
  --command=npm \
  --args=run,db:preflight \
  --tasks=1 \
  --max-retries=0 \
  --task-timeout=10m

gcloud run jobs execute "$PREFLIGHT_JOB" --region="$REGION" --project="$PROJECT_ID" --wait

say "Latest preflight logs"
gcloud logging read \
  "resource.type=cloud_run_job AND resource.labels.job_name=${PREFLIGHT_JOB}" \
  --project="$PROJECT_ID" --limit=80 --freshness=30m \
  --format='value(timestamp,textPayload,jsonPayload.message)' | tail -n 80

cat <<'TXT'

[AIONE] STOP HERE AND REVIEW THE PREFLIGHT OUTPUT.
Required existing tables should still be present:
  people, external_identities, product_opportunities, activity_logs
Do not run migration if the report shows an unexpected database or missing canonical tables.
If correct, continue with: ./04_DB_MIGRATE.sh
TXT
