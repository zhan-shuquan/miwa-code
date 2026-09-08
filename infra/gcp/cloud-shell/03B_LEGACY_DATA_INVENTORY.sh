#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [[ -f "$SCRIPT_DIR/lib.sh" ]]; then
  LIB_SH="$SCRIPT_DIR/lib.sh"
elif [[ -f "./lib.sh" ]]; then
  LIB_SH="$(pwd)/lib.sh"
else
  echo "[AIONE][ERROR] lib.sh not found. Run from infra/gcp/cloud-shell or keep this script beside lib.sh." >&2
  exit 1
fi

export AIONE_SQL_INSTANCE="aione-postgres"
export AIONE_DB_PASSWORD_SECRET="aione-db-password"
# shellcheck source=/dev/null
source "$LIB_SH"
require_db_secret

JOB="aione-db-legacy-inventory"

say "Read-only legacy data inventory: ${AIONE_SQL_INSTANCE}"
printf '[AIONE] Instance           : %s\n' "$SQL_INSTANCE"
printf '[AIONE] Database           : %s\n' "$DB_NAME"
printf '[AIONE] Database user      : %s\n' "$DB_USER"
printf '[AIONE] DB password secret : %s\n' "$DB_PASSWORD_SECRET"

gcloud run jobs deploy "$JOB" \
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
  --task-timeout=10m \
  --quiet

gcloud run jobs execute "$JOB" \
  --region="$REGION" \
  --project="$PROJECT_ID" \
  --wait \
  --quiet

echo
echo "========== LEGACY INVENTORY SUMMARY =========="
gcloud logging read \
  "resource.type=cloud_run_job AND resource.labels.job_name=${JOB}" \
  --project="$PROJECT_ID" \
  --freshness=10m \
  --limit=300 \
  --order=asc \
  --format='value(textPayload,jsonPayload.message)' \
  | awk '
      /"applied_migrations"[[:space:]]*:/ {show=1}
      show {print}
      /"identity_profile"[[:space:]]*:/ {exit}
    '
echo "========== END SUMMARY =========="
echo
cat <<'TXT'
[AIONE] This inventory is read-only.
No migration, UPDATE, DELETE, TRUNCATE or DROP was executed.
Next gate: identify non-zero legacy tables, then inspect only those records that may contain real business data.
TXT
