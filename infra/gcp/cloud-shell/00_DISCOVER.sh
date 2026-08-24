#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
# shellcheck source=lib.sh
source "$SCRIPT_DIR/lib.sh"

say "Google Cloud deployment discovery (read-only)"
print_context

say "Existing source Cloud Run service (read-only discovery)"
if [[ -n "$SERVICE_JSON" ]]; then
  printf '%s\n' "$SERVICE_JSON" | jq '{name:.metadata.name, url:.status.url, serviceAccount:.spec.template.spec.serviceAccountName, cloudSql:.spec.template.metadata.annotations["run.googleapis.com/cloudsql-instances"], env:[.spec.template.spec.containers[0].env[]? | {name:.name, value:(if .value then .value else "<secret>" end)}]}'
else
  echo "No existing source service named $SOURCE_RUN_SERVICE in $REGION."
fi

say "Cloud SQL protection status"
gcloud sql instances describe "$SQL_INSTANCE" --project="$PROJECT_ID" --format='yaml(name,databaseVersion,region,connectionName,settings.backupConfiguration.enabled,settings.backupConfiguration.pointInTimeRecoveryEnabled,settings.backupConfiguration.transactionLogRetentionDays)'

say "Existing migration tables"
# We intentionally do not connect to the DB in discovery; actual DB preflight runs as a private Cloud Run Job.
echo "Next: ./01_PREPARE_RUNTIME.sh"
