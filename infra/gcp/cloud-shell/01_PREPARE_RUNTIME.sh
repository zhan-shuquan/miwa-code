#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/lib.sh"
require_db_secret
print_context

say "Enable only the Google Cloud APIs required for this stage"
gcloud services enable \
  run.googleapis.com \
  sqladmin.googleapis.com \
  secretmanager.googleapis.com \
  artifactregistry.googleapis.com \
  cloudbuild.googleapis.com \
  logging.googleapis.com \
  --project="$PROJECT_ID"

say "Create/reuse dedicated AIONE runtime service account"
if ! gcloud iam service-accounts describe "$RUNTIME_SA_EMAIL" --project="$PROJECT_ID" >/dev/null 2>&1; then
  gcloud iam service-accounts create "$RUNTIME_SA_NAME" --project="$PROJECT_ID" --display-name="AIONE Runtime"
fi

gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:${RUNTIME_SA_EMAIL}" \
  --role="roles/cloudsql.client" --quiet >/dev/null

gcloud secrets add-iam-policy-binding "$DB_PASSWORD_SECRET" \
  --project="$PROJECT_ID" \
  --member="serviceAccount:${RUNTIME_SA_EMAIL}" \
  --role="roles/secretmanager.secretAccessor" --quiet >/dev/null

say "Create/reuse Artifact Registry repository"
if ! gcloud artifacts repositories describe "$ARTIFACT_REPO" --location="$REGION" --project="$PROJECT_ID" >/dev/null 2>&1; then
  gcloud artifacts repositories create "$ARTIFACT_REPO" \
    --repository-format=docker \
    --location="$REGION" \
    --description="AIONE runtime images" \
    --project="$PROJECT_ID"
fi

say "Create an on-demand Cloud SQL backup before schema migration"
BACKUP_DESC="AIONE pre-v1.9 migration $(date -u +%Y-%m-%dT%H:%M:%SZ)"
gcloud sql backups create --instance="$SQL_INSTANCE" --description="$BACKUP_DESC" --project="$PROJECT_ID"

say "Runtime preparation complete"
echo "Next: ./02_BUILD_IMAGE.sh"
