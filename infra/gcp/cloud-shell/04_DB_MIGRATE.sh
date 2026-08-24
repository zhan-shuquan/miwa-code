#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/lib.sh"
require_db_secret
print_context

cat <<TXT

[AIONE] This applies additive migrations 0001 through 0050 to:
  project : $PROJECT_ID
  instance: $SQL_INSTANCE
  database: $DB_NAME
Existing canonical tables are not intentionally dropped, truncated, or renamed.
An on-demand backup should already exist from 01_PREPARE_RUNTIME.sh.
TXT
read -r -p "Type MIGRATE AIONE to continue: " CONFIRM
[[ "$CONFIRM" == "MIGRATE AIONE" ]] || die "Migration cancelled."

say "Deploy migration Cloud Run Job"
gcloud run jobs deploy "$MIGRATION_JOB" \
  --image="$IMAGE_URI" \
  --region="$REGION" \
  --project="$PROJECT_ID" \
  --service-account="$RUNTIME_SA_EMAIL" \
  --set-cloudsql-instances="$INSTANCE_CONNECTION_NAME" \
  --set-env-vars="$(job_env_flags)" \
  --set-secrets="DB_PASS=${DB_PASSWORD_SECRET}:latest" \
  --command=npm \
  --args=run,db:migrate \
  --tasks=1 \
  --max-retries=0 \
  --task-timeout=15m

gcloud run jobs execute "$MIGRATION_JOB" --region="$REGION" --project="$PROJECT_ID" --wait

say "Latest migration logs"
gcloud logging read \
  "resource.type=cloud_run_job AND resource.labels.job_name=${MIGRATION_JOB}" \
  --project="$PROJECT_ID" --limit=120 --freshness=30m \
  --format='value(timestamp,textPayload,jsonPayload.message)' | tail -n 120

say "Re-run read-only preflight after migration"
gcloud run jobs execute "$PREFLIGHT_JOB" --region="$REGION" --project="$PROJECT_ID" --wait

echo "Next: ./05_DEPLOY_BACKEND_PRIVATE.sh"
