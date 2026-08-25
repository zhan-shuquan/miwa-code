#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
CONFIG_FILE="$SCRIPT_DIR/cloud-config.sh"
[[ -f "$CONFIG_FILE" ]] && # shellcheck source=/dev/null
  source "$CONFIG_FILE"

say(){ printf '\n[AIONE] %s\n' "$*"; }
warn(){ printf '\n[AIONE][WARN] %s\n' "$*" >&2; }
die(){ printf '\n[AIONE][ERROR] %s\n' "$*" >&2; exit 1; }
need(){ command -v "$1" >/dev/null 2>&1 || die "Required command not found: $1"; }

need gcloud
need jq

PROJECT_ID="${AIONE_PROJECT_ID:-$(gcloud config get-value project 2>/dev/null || true)}"
[[ -n "$PROJECT_ID" && "$PROJECT_ID" != "(unset)" ]] || die "No active Google Cloud project. Run: gcloud config set project PROJECT_ID"
PROJECT_NUMBER="$(gcloud projects describe "$PROJECT_ID" --format='value(projectNumber)')"
ACTIVE_ACCOUNT="$(gcloud auth list --filter=status:ACTIVE --format='value(account)' | head -n1)"
[[ -n "$ACTIVE_ACCOUNT" ]] || die "No active gcloud account. Cloud Shell should already be authenticated."

REGION="${AIONE_REGION:-asia-northeast1}"
SOURCE_RUN_SERVICE="${AIONE_SOURCE_RUN_SERVICE:-aione-backend}"
RUN_SERVICE="${AIONE_RUN_SERVICE:-aione-backend-v190}"
ARTIFACT_REPO="${AIONE_ARTIFACT_REPO:-aione}"
IMAGE_NAME="${AIONE_IMAGE_NAME:-aione-backend}"
PREFLIGHT_JOB="${AIONE_PREFLIGHT_JOB:-aione-db-preflight}"
MIGRATION_JOB="${AIONE_MIGRATION_JOB:-aione-db-migrate}"
RUNTIME_SA_NAME="${AIONE_RUNTIME_SERVICE_ACCOUNT_NAME:-aione-runtime}"
RUNTIME_SA_EMAIL="${RUNTIME_SA_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"
DB_NAME="${AIONE_DB_NAME:-aione}"
DB_USER="${AIONE_DB_USER:-aione_app}"
AI_MODE="${AIONE_AI_MODE:-preview}"
GOOGLE_CLIENT_ID="${AIONE_GOOGLE_CLIENT_ID:-49629089449-5lkfjfnadvq14f9uuid91chqgjjdihmi.apps.googleusercontent.com}"
VERCEL_TEAM_SLUG="${AIONE_VERCEL_TEAM_SLUG:-info-64613987s-projects}"
VERCEL_PROJECT_NAME="${AIONE_VERCEL_PROJECT_NAME:-miwa-aione-test}"
VERCEL_ENVIRONMENT="${AIONE_VERCEL_ENVIRONMENT:-production}"
WIF_POOL_ID="${AIONE_WIF_POOL_ID:-vercel-aione}"
WIF_PROVIDER_ID="${AIONE_WIF_PROVIDER_ID:-vercel-aione-prod}"
VERCEL_INVOKER_SA_NAME="${AIONE_VERCEL_INVOKER_SERVICE_ACCOUNT_NAME:-aione-vercel-invoker}"
VERCEL_INVOKER_SA_EMAIL="${VERCEL_INVOKER_SA_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"
IMAGE_TAG="${AIONE_IMAGE_TAG:-v1.9.21}"

service_json(){ gcloud run services describe "$SOURCE_RUN_SERVICE" --region="$REGION" --project="$PROJECT_ID" --format=json 2>/dev/null || true; }

SERVICE_JSON="$(service_json)"

if [[ -z "${AIONE_SQL_INSTANCE:-}" ]]; then
  EXISTING_CONN="$(printf '%s' "$SERVICE_JSON" | jq -r '.spec.template.metadata.annotations["run.googleapis.com/cloudsql-instances"] // empty' 2>/dev/null || true)"
  if [[ -n "$EXISTING_CONN" ]]; then
    SQL_INSTANCE="${EXISTING_CONN##*:}"
  elif gcloud sql instances describe aione --project="$PROJECT_ID" >/dev/null 2>&1; then
    SQL_INSTANCE="aione"
  else
    mapfile -t _instances < <(gcloud sql instances list --project="$PROJECT_ID" --format='value(name)')
    if [[ ${#_instances[@]} -eq 1 ]]; then SQL_INSTANCE="${_instances[0]}"; else SQL_INSTANCE=""; fi
  fi
else
  SQL_INSTANCE="$AIONE_SQL_INSTANCE"
fi
[[ -n "$SQL_INSTANCE" ]] || die "Cloud SQL instance could not be auto-detected. Set AIONE_SQL_INSTANCE in cloud-config.sh."

INSTANCE_CONNECTION_NAME="$(gcloud sql instances describe "$SQL_INSTANCE" --project="$PROJECT_ID" --format='value(connectionName)')"
[[ -n "$INSTANCE_CONNECTION_NAME" ]] || die "Cloud SQL connectionName unavailable for $SQL_INSTANCE"
INSTANCE_UNIX_SOCKET="/cloudsql/${INSTANCE_CONNECTION_NAME}"

if [[ -z "${AIONE_DB_PASSWORD_SECRET:-}" ]]; then
  DB_PASSWORD_SECRET="$(printf '%s' "$SERVICE_JSON" | jq -r '[.spec.template.spec.containers[0].env[]? | select(.name=="DB_PASS") | .valueFrom.secretKeyRef.name][0] // empty' 2>/dev/null || true)"
else
  DB_PASSWORD_SECRET="$AIONE_DB_PASSWORD_SECRET"
fi

if [[ -n "$SERVICE_JSON" ]]; then
  DETECTED_DB_NAME="$(printf '%s' "$SERVICE_JSON" | jq -r '[.spec.template.spec.containers[0].env[]? | select(.name=="DB_NAME") | .value][0] // empty')"
  DETECTED_DB_USER="$(printf '%s' "$SERVICE_JSON" | jq -r '[.spec.template.spec.containers[0].env[]? | select(.name=="DB_USER") | .value][0] // empty')"
  [[ -n "$DETECTED_DB_NAME" ]] && DB_NAME="$DETECTED_DB_NAME"
  [[ -n "$DETECTED_DB_USER" ]] && DB_USER="$DETECTED_DB_USER"
fi

IMAGE_URI="${REGION}-docker.pkg.dev/${PROJECT_ID}/${ARTIFACT_REPO}/${IMAGE_NAME}:${IMAGE_TAG}"

require_db_secret(){
  [[ -n "$DB_PASSWORD_SECRET" ]] || die "DB_PASS secret name was not auto-detected. Set AIONE_DB_PASSWORD_SECRET in infra/gcp/cloud-shell/cloud-config.sh."
  gcloud secrets describe "$DB_PASSWORD_SECRET" --project="$PROJECT_ID" >/dev/null 2>&1 || die "Secret not found: $DB_PASSWORD_SECRET"
}

print_context(){
  cat <<CTX
[AIONE] Active account        : $ACTIVE_ACCOUNT
[AIONE] Project ID            : $PROJECT_ID
[AIONE] Region                : $REGION
[AIONE] Source Cloud Run      : $SOURCE_RUN_SERVICE
[AIONE] Target Cloud Run      : $RUN_SERVICE
[AIONE] Cloud SQL instance    : $SQL_INSTANCE
[AIONE] Connection name       : $INSTANCE_CONNECTION_NAME
[AIONE] Database              : $DB_NAME
[AIONE] Database user         : $DB_USER
[AIONE] DB password secret    : ${DB_PASSWORD_SECRET:-<not detected>}
[AIONE] Runtime service acct  : $RUNTIME_SA_EMAIL
[AIONE] Artifact image        : $IMAGE_URI
[AIONE] AI mode for cloud test: $AI_MODE
[AIONE] Vercel team/project    : $VERCEL_TEAM_SLUG / $VERCEL_PROJECT_NAME
[AIONE] Vercel invoker SA     : $VERCEL_INVOKER_SA_EMAIL
CTX
}

job_env_flags(){
  printf '%s' "DB_USER=${DB_USER},DB_NAME=${DB_NAME},INSTANCE_UNIX_SOCKET=${INSTANCE_UNIX_SOCKET},AIONE_ALLOW_PREVIEW_ACTOR=false,AIONE_ALLOW_SYSTEM_WRITES=false,NODE_ENV=production"
}
