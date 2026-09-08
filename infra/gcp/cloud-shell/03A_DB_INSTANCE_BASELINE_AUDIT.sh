#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INSTANCES=("aione-postgres" "aione-pg-dev")

for INSTANCE in "${INSTANCES[@]}"; do
  (
    export AIONE_SQL_INSTANCE="$INSTANCE"
    # shellcheck source=/dev/null
    source "$SCRIPT_DIR/lib.sh"
    require_db_secret

    JOB="aione-db-baseline-audit-${INSTANCE}"

    say "Read-only baseline audit: ${INSTANCE}"
    printf '[AIONE] Instance              : %s\n' "$SQL_INSTANCE"
    printf '[AIONE] Connection name       : %s\n' "$INSTANCE_CONNECTION_NAME"
    printf '[AIONE] Database              : %s\n' "$DB_NAME"
    printf '[AIONE] Database user         : %s\n' "$DB_USER"
    printf '[AIONE] Cloud SQL create time : '
    gcloud sql instances describe "$INSTANCE" \
      --project="$PROJECT_ID" \
      --format='value(createTime)'

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
    echo "========== ${INSTANCE} : PREFLIGHT OUTPUT =========="
    gcloud logging read \
      "resource.type=cloud_run_job AND resource.labels.job_name=${JOB}" \
      --project="$PROJECT_ID" \
      --limit=120 \
      --freshness=30m \
      --format='value(timestamp,textPayload,jsonPayload.message)' \
      | tail -n 120
    echo "========== END ${INSTANCE} =========="
    echo
  )
done

cat <<'TXT'
[AIONE] AUDIT COMPLETE.
This script only runs the repository's read-only db:preflight against both existing Cloud SQL instances.
It does not execute migrations and does not delete or alter database data.

Next gate: compare both outputs and lock exactly one formal database baseline before any 0090 migration.
TXT
