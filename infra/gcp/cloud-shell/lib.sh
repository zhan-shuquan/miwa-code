#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
CURRENT_BASELINE_FILE="$SCRIPT_DIR/CURRENT_BASELINE.sh"
[[ -f "$CURRENT_BASELINE_FILE" ]] || { echo "[AIONE][FATAL] Missing CURRENT_BASELINE.sh" >&2; exit 90; }
# shellcheck source=/dev/null
source "$CURRENT_BASELINE_FILE"
assert_aione_current_baseline

say(){ printf '\n[AIONE] %s\n' "$*"; }
warn(){ printf '\n[AIONE][WARN] %s\n' "$*" >&2; }
die(){ printf '\n[AIONE][ERROR] %s\n' "$*" >&2; exit 1; }
need(){ command -v "$1" >/dev/null 2>&1 || die "Required command not found: $1"; }

need gcloud
need jq

PROJECT_ID="${AIONE_PROJECT_ID:-$(gcloud config get-value project 2>/dev/null || true)}"
[[ -n "$PROJECT_ID" && "$PROJECT_ID" != "(unset)" ]] || die "No active Google Cloud project."
[[ "$PROJECT_ID" == "miwa-aione" ]] || die "CURRENT baseline is locked to project miwa-aione. Active project: $PROJECT_ID"

PROJECT_NUMBER="$(gcloud projects describe "$PROJECT_ID" --format='value(projectNumber)')"
ACTIVE_ACCOUNT="$(gcloud auth list --filter=status:ACTIVE --format='value(account)' | head -n1)"
[[ -n "$ACTIVE_ACCOUNT" ]] || die "No active gcloud account."

REGION="$AIONE_REGION"
RUN_SERVICE="$AIONE_RUN_SERVICE"
ARTIFACT_REPO="$AIONE_ARTIFACT_REPO"
IMAGE_NAME="$AIONE_IMAGE_NAME"
PREFLIGHT_JOB="$AIONE_PREFLIGHT_JOB"
MIGRATION_JOB="$AIONE_MIGRATION_JOB"
RUNTIME_SA_NAME="$AIONE_RUNTIME_SERVICE_ACCOUNT_NAME"
RUNTIME_SA_EMAIL="${RUNTIME_SA_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"
DB_NAME="$AIONE_DB_NAME"
DB_USER="$AIONE_DB_USER"
DB_PASSWORD_SECRET="$AIONE_DB_PASSWORD_SECRET"
SQL_INSTANCE="$AIONE_SQL_INSTANCE"
AI_MODE="$AIONE_AI_MODE"
AI_PROVIDER="$AIONE_AI_PROVIDER"
AI_MODEL="$AIONE_AI_MODEL"
GOOGLE_CLIENT_ID="${AIONE_GOOGLE_CLIENT_ID:-49629089449-5lkfjfnadvq14f9uuid91chqgjjdihmi.apps.googleusercontent.com}"
VERCEL_TEAM_SLUG="${AIONE_VERCEL_TEAM_SLUG:-info-64613987s-projects}"
VERCEL_PROJECT_NAME="${AIONE_VERCEL_PROJECT_NAME:-miwa-aione-test}"
VERCEL_ENVIRONMENT="${AIONE_VERCEL_ENVIRONMENT:-production}"
WIF_POOL_ID="${AIONE_WIF_POOL_ID:-vercel-aione}"
WIF_PROVIDER_ID="${AIONE_WIF_PROVIDER_ID:-vercel-aione-prod}"
VERCEL_INVOKER_SA_NAME="${AIONE_VERCEL_INVOKER_SERVICE_ACCOUNT_NAME:-aione-vercel-invoker}"
VERCEL_INVOKER_SA_EMAIL="${VERCEL_INVOKER_SA_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"
IMAGE_TAG="${AIONE_IMAGE_TAG:-current}"

TARGET_SERVICE_JSON="$(gcloud run services describe "$RUN_SERVICE" --region="$REGION" --project="$PROJECT_ID" --format=json 2>/dev/null || true)"

secret_ref_from_json(){
  local json="$1" env_name="$2"
  printf '%s' "$json" | jq -r --arg env "$env_name" '[.spec.template.spec.containers[0].env[]? | select(.name==$env) | .valueFrom.secretKeyRef.name][0] // empty' 2>/dev/null || true
}

OPENAI_API_KEY_SECRET="${AIONE_OPENAI_API_KEY_SECRET:-$(secret_ref_from_json "$TARGET_SERVICE_JSON" "OPENAI_API_KEY")}"
if [[ -z "$OPENAI_API_KEY_SECRET" ]]; then
  for candidate in aione-openai-api-key openai-api-key; do
    if gcloud secrets describe "$candidate" --project="$PROJECT_ID" >/dev/null 2>&1; then OPENAI_API_KEY_SECRET="$candidate"; break; fi
  done
fi

INSTANCE_CONNECTION_NAME="$(gcloud sql instances describe "$SQL_INSTANCE" --project="$PROJECT_ID" --format='value(connectionName)')"
[[ "$INSTANCE_CONNECTION_NAME" == "miwa-aione:asia-northeast1:aione-pg-dev" ]] || die "CURRENT Cloud SQL connection mismatch: $INSTANCE_CONNECTION_NAME"
INSTANCE_UNIX_SOCKET="/cloudsql/${INSTANCE_CONNECTION_NAME}"

IMAGE_URI="${REGION}-docker.pkg.dev/${PROJECT_ID}/${ARTIFACT_REPO}/${IMAGE_NAME}:${IMAGE_TAG}"

require_db_secret(){
  gcloud secrets describe "$DB_PASSWORD_SECRET" --project="$PROJECT_ID" >/dev/null 2>&1 || die "Secret not found: $DB_PASSWORD_SECRET"
}

require_ai_secret(){
  [[ "$AI_MODE" == "live" || "$AI_MODE" == "openai" ]] || return 0
  [[ -n "$OPENAI_API_KEY_SECRET" ]] || die "Live 美和AI requires an OpenAI Secret Manager secret."
  gcloud secrets describe "$OPENAI_API_KEY_SECRET" --project="$PROJECT_ID" >/dev/null 2>&1 || die "OpenAI secret not found: $OPENAI_API_KEY_SECRET"
}

print_context(){
  cat <<CTX
[AIONE] CURRENT baseline only
[AIONE] Project               : $PROJECT_ID
[AIONE] Region                : $REGION
[AIONE] Cloud Run             : $RUN_SERVICE
[AIONE] Cloud SQL             : $SQL_INSTANCE
[AIONE] Connection            : $INSTANCE_CONNECTION_NAME
[AIONE] Database              : $DB_NAME
[AIONE] Database user         : $DB_USER
[AIONE] DB password secret    : $DB_PASSWORD_SECRET
[AIONE] Runtime service acct  : $RUNTIME_SA_EMAIL
[AIONE] Artifact image        : $IMAGE_URI
[AIONE] AI mode/provider      : $AI_MODE / $AI_PROVIDER
CTX
}

job_env_flags(){
  printf '%s' "DB_USER=${DB_USER},DB_NAME=${DB_NAME},INSTANCE_UNIX_SOCKET=${INSTANCE_UNIX_SOCKET},AIONE_ALLOW_PREVIEW_ACTOR=false,AIONE_ALLOW_SYSTEM_WRITES=false,NODE_ENV=production"
}
