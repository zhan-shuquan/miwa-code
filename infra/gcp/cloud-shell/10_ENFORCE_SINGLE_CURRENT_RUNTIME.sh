#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
cd "$REPO_ROOT"

source "$SCRIPT_DIR/lib.sh"
assert_aione_current_baseline

PROJECT_ID="${AIONE_PROJECT_ID:-miwa-aione}"
REGION="${AIONE_REGION:-asia-northeast1}"
CURRENT_SERVICE="${AIONE_RUN_SERVICE}"
CURRENT_SQL="${AIONE_SQL_INSTANCE}"

say "Verify CURRENT service before destructive cleanup"
SERVICE_JSON="$(gcloud run services describe "$CURRENT_SERVICE" --project="$PROJECT_ID" --region="$REGION" --format=json)"
LATEST="$(printf '%s' "$SERVICE_JSON" | jq -r '.status.latestReadyRevisionName // empty')"
ACTUAL_CONN="$(printf '%s' "$SERVICE_JSON" | jq -r '.spec.template.metadata.annotations["run.googleapis.com/cloudsql-instances"] // empty')"
EXPECTED_CONN="$(gcloud sql instances describe "$CURRENT_SQL" --project="$PROJECT_ID" --format='value(connectionName)')"

[[ -n "$LATEST" ]] || die "CURRENT service has no ready revision"
[[ "$ACTUAL_CONN" == "$EXPECTED_CONN" ]] || die "CURRENT service is not bound to $CURRENT_SQL"

say "Route 100 percent traffic to the latest CURRENT revision"
gcloud run services update-traffic "$CURRENT_SERVICE" \
  --project="$PROJECT_ID" \
  --region="$REGION" \
  --to-revisions="${LATEST}=100"

SERVICE_URL="$(gcloud run services describe "$CURRENT_SERVICE" --project="$PROJECT_ID" --region="$REGION" --format='value(status.url)')"
TOKEN="$(gcloud auth print-identity-token)"
HEALTH="$(curl --silent --show-error --fail --max-time 60 -H "Authorization: Bearer $TOKEN" "$SERVICE_URL/health")"
printf '%s\n' "$HEALTH"
printf '%s' "$HEALTH" | jq -e '.ok == true and .database == "connected"' >/dev/null || die "CURRENT health check failed"

say "Delete legacy Cloud Run services"
for service in aione-backend aione-backend-v190 aione-backend-dev aione-backend-pgdev-check; do
  if gcloud run services describe "$service" --project="$PROJECT_ID" --region="$REGION" >/dev/null 2>&1; then
    gcloud run services delete "$service" --project="$PROJECT_ID" --region="$REGION" --quiet
  fi
done

say "Delete legacy Cloud Run jobs"
for job in aione-current-preflight-bbc1843b aione-db-preflight aione-db-migrate aione-db-preflight-bbc1843b; do
  if gcloud run jobs describe "$job" --project="$PROJECT_ID" --region="$REGION" >/dev/null 2>&1; then
    gcloud run jobs delete "$job" --project="$PROJECT_ID" --region="$REGION" --quiet
  fi
done

say "Delete legacy Cloud SQL instance"
if gcloud sql instances describe aione-postgres --project="$PROJECT_ID" >/dev/null 2>&1; then
  gcloud sql instances patch aione-postgres --project="$PROJECT_ID" --no-deletion-protection --quiet >/dev/null 2>&1 || true
  gcloud sql instances delete aione-postgres --project="$PROJECT_ID" --quiet
fi

say "Remove old Cloud Shell working copies"
rm -rf "$HOME/AIONE190" "$HOME/miwa-code-p0"

say "Verify only CURRENT named runtime resources remain"
printf '\nCloud Run services:\n'
gcloud run services list --project="$PROJECT_ID" --region="$REGION" --format='value(metadata.name)'
printf '\nCloud SQL instances:\n'
gcloud sql instances list --project="$PROJECT_ID" --format='value(name)'
printf '\nCloud Run jobs:\n'
gcloud run jobs list --project="$PROJECT_ID" --region="$REGION" --format='value(metadata.name)'

printf '\n[AIONE] SINGLE CURRENT runtime enforced: %s -> %s -> %s/%s\n' \
  "$CURRENT_SERVICE" "$CURRENT_SQL" "$DB_NAME" "$DB_USER"
