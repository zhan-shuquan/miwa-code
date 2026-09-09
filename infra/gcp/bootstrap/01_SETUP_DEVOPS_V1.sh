#!/usr/bin/env bash
set -euo pipefail

say(){ printf '\n[AIONE] %s\n' "$*"; }
die(){ printf '\n[AIONE][ERROR] %s\n' "$*" >&2; exit 1; }
need(){ command -v "$1" >/dev/null 2>&1 || die "Required command not found: $1"; }

need gcloud
need git

EXPECTED_PROJECT_ID="${AIONE_EXPECTED_PROJECT_ID:-miwa-aione}"
PROJECT_ID="${AIONE_PROJECT_ID:-$(gcloud config get-value project 2>/dev/null || true)}"
REGION="${AIONE_REGION:-asia-northeast1}"
REPO_OWNER="${AIONE_REPO_OWNER:-zhan-shuquan}"
REPO_NAME="${AIONE_REPO_NAME:-miwa-code}"
DEPLOY_SA_NAME="${AIONE_CLOUDBUILD_DEPLOY_SA_NAME:-aione-cloud-build-deployer}"
RUNTIME_SA_NAME="${AIONE_RUNTIME_SA_NAME:-aione-runtime}"
ARTIFACT_REPO="${AIONE_ARTIFACT_REPO:-aione}"
DB_SECRET="${AIONE_DB_PASSWORD_SECRET:-aione-db-password-dev}"
OPENAI_SECRET="${AIONE_OPENAI_API_KEY_SECRET:-aione-openai-api-key}"

TRIGGER_VERIFY="${AIONE_TRIGGER_VERIFY:-aione-verify-current}"
TRIGGER_MIGRATE="${AIONE_TRIGGER_MIGRATE:-aione-db-migrate}"
TRIGGER_DEPLOY="${AIONE_TRIGGER_DEPLOY:-aione-deploy-backend}"

[[ -n "$PROJECT_ID" && "$PROJECT_ID" != "(unset)" ]] || die "No active Google Cloud project."
[[ "$PROJECT_ID" == "$EXPECTED_PROJECT_ID" ]] || die "Refusing to bootstrap project '$PROJECT_ID'. Expected '$EXPECTED_PROJECT_ID'."

CURRENT_BRANCH="$(git branch --show-current 2>/dev/null || true)"
[[ "$CURRENT_BRANCH" == "main" ]] || die "Formal trigger bootstrap must run from main after DevOps V1 is merged. Current branch: ${CURRENT_BRANCH:-unknown}"
[[ -z "$(git status --porcelain)" ]] || die "Working tree must be clean."

git fetch origin main
git pull --ff-only origin main

DEPLOY_SA_EMAIL="${DEPLOY_SA_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"
RUNTIME_SA_EMAIL="${RUNTIME_SA_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"

say "Enable required Google Cloud APIs"
gcloud services enable \
  cloudbuild.googleapis.com \
  run.googleapis.com \
  artifactregistry.googleapis.com \
  sqladmin.googleapis.com \
  secretmanager.googleapis.com \
  iamcredentials.googleapis.com \
  logging.googleapis.com \
  --project="$PROJECT_ID"

say "Verify existing CURRENT resources"
gcloud iam service-accounts describe "$RUNTIME_SA_EMAIL" --project="$PROJECT_ID" >/dev/null || die "Runtime service account not found: $RUNTIME_SA_EMAIL"
gcloud artifacts repositories describe "$ARTIFACT_REPO" --location="$REGION" --project="$PROJECT_ID" >/dev/null || die "Artifact Registry repository not found: $ARTIFACT_REPO"
gcloud secrets describe "$DB_SECRET" --project="$PROJECT_ID" >/dev/null || die "Secret not found: $DB_SECRET"
gcloud secrets describe "$OPENAI_SECRET" --project="$PROJECT_ID" >/dev/null || die "Secret not found: $OPENAI_SECRET"

say "Create dedicated Cloud Build deploy service account if missing"
if ! gcloud iam service-accounts describe "$DEPLOY_SA_EMAIL" --project="$PROJECT_ID" >/dev/null 2>&1; then
  gcloud iam service-accounts create "$DEPLOY_SA_NAME" \
    --display-name="AIONE Cloud Build Deployer" \
    --project="$PROJECT_ID"
fi

say "Grant deploy service account scoped project roles"
for role in \
  roles/artifactregistry.writer \
  roles/run.admin \
  roles/cloudsql.viewer \
  roles/logging.logWriter \
  roles/serviceusage.serviceUsageConsumer
do
  gcloud projects add-iam-policy-binding "$PROJECT_ID" \
    --member="serviceAccount:${DEPLOY_SA_EMAIL}" \
    --role="$role" \
    --condition=None \
    --quiet >/dev/null
done

say "Allow deploy service account to act as AIONE runtime identity"
gcloud iam service-accounts add-iam-policy-binding "$RUNTIME_SA_EMAIL" \
  --member="serviceAccount:${DEPLOY_SA_EMAIL}" \
  --role="roles/iam.serviceAccountUser" \
  --project="$PROJECT_ID" \
  --quiet >/dev/null

say "Allow deploy service account to mint only OIDC identity tokens for private Cloud Run health checks"
gcloud iam service-accounts add-iam-policy-binding "$DEPLOY_SA_EMAIL" \
  --member="serviceAccount:${DEPLOY_SA_EMAIL}" \
  --role="roles/iam.serviceAccountOpenIdTokenCreator" \
  --project="$PROJECT_ID" \
  --quiet >/dev/null

say "Ensure runtime identity can reach CURRENT database and only the required secrets"
gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:${RUNTIME_SA_EMAIL}" \
  --role="roles/cloudsql.client" \
  --condition=None \
  --quiet >/dev/null

for secret in "$DB_SECRET" "$OPENAI_SECRET"; do
  gcloud secrets add-iam-policy-binding "$secret" \
    --member="serviceAccount:${RUNTIME_SA_EMAIL}" \
    --role="roles/secretmanager.secretAccessor" \
    --project="$PROJECT_ID" \
    --quiet >/dev/null
done

trigger_exists(){
  gcloud builds triggers describe "$1" --region="$REGION" --project="$PROJECT_ID" >/dev/null 2>&1
}

create_manual_trigger(){
  local name="$1" config="$2"
  if trigger_exists "$name"; then
    printf '[AIONE] Trigger already exists: %s\n' "$name"
    return 0
  fi

  gcloud builds triggers create manual \
    --region="$REGION" \
    --project="$PROJECT_ID" \
    --name="$name" \
    --repo="$REPO_NAME" \
    --repo-type=GITHUB \
    --branch-pattern='^main$' \
    --build-config="$config" \
    --service-account="$DEPLOY_SA_EMAIL"
}

say "Create three controlled manual Cloud Build triggers"
create_manual_trigger "$TRIGGER_VERIFY" "infra/gcp/cloudbuild/verify-current.yaml"
create_manual_trigger "$TRIGGER_MIGRATE" "infra/gcp/cloudbuild/db-migrate.yaml"
create_manual_trigger "$TRIGGER_DEPLOY" "infra/gcp/cloudbuild/deploy-current-backend.yaml"

cat <<TXT

[AIONE] DevOps bootstrap completed.
Project        : $PROJECT_ID
Region         : $REGION
Repository     : $REPO_OWNER/$REPO_NAME
Deploy SA      : $DEPLOY_SA_EMAIL
Runtime SA     : $RUNTIME_SA_EMAIL

Manual triggers:
  $TRIGGER_VERIFY
  $TRIGGER_MIGRATE
  $TRIGGER_DEPLOY

Next validation gate:
  1. Run $TRIGGER_VERIFY on main.
  2. Confirm authenticated /health + DB preflight PASS.
  3. Keep DB migration trigger at _CONFIRM=DO_NOT_RUN unless a real migration is intended.
  4. Run $TRIGGER_DEPLOY only for reviewed main code.
TXT
