#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
cd "$REPO_ROOT"

source infra/gcp/cloud-shell/CURRENT_BASELINE.sh
assert_aione_current_baseline

PROJECT_ID="$AIONE_PROJECT_ID"
DEPLOYER_SA="${AIONE_DEPLOYER_SERVICE_ACCOUNT_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"
RUNTIME_SA="${AIONE_RUNTIME_SERVICE_ACCOUNT_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"
TRIGGER="$AIONE_DEPLOY_TRIGGER_NAME"
BUILD_CONFIG="infra/gcp/cloudbuild/deploy-current.yaml"

printf '\n[AIONE] Install automated CURRENT operations\n'
printf 'Project       : %s\n' "$PROJECT_ID"
printf 'Cloud Run     : %s\n' "$AIONE_RUN_SERVICE"
printf 'Cloud SQL     : %s\n' "$AIONE_SQL_INSTANCE"
printf 'Deploy trigger: %s\n' "$TRIGGER"
printf 'Deployer SA   : %s\n\n' "$DEPLOYER_SA"

gcloud config set project "$PROJECT_ID" >/dev/null

echo '[AIONE] Enable required Google Cloud APIs'
gcloud services enable \
  cloudbuild.googleapis.com \
  run.googleapis.com \
  artifactregistry.googleapis.com \
  iam.googleapis.com \
  iamcredentials.googleapis.com \
  sts.googleapis.com \
  secretmanager.googleapis.com \
  sqladmin.googleapis.com \
  --project="$PROJECT_ID" >/dev/null

echo '[AIONE] Ensure dedicated deployment service account'
if ! gcloud iam service-accounts describe "$DEPLOYER_SA" --project="$PROJECT_ID" >/dev/null 2>&1; then
  gcloud iam service-accounts create "$AIONE_DEPLOYER_SERVICE_ACCOUNT_NAME" \
    --project="$PROJECT_ID" \
    --display-name='AIONE CURRENT automated deployer'
fi

echo '[AIONE] Grant deployer only the roles required by the CURRENT pipeline'
for role in \
  roles/run.admin \
  roles/artifactregistry.writer \
  roles/logging.logWriter \
  roles/cloudsql.viewer \
  roles/secretmanager.viewer; do
  gcloud projects add-iam-policy-binding "$PROJECT_ID" \
    --member="serviceAccount:${DEPLOYER_SA}" \
    --role="$role" \
    --condition=None \
    --quiet >/dev/null
done

echo '[AIONE] Allow deployer to run Cloud Run resources as the locked runtime service account'
gcloud iam service-accounts add-iam-policy-binding "$RUNTIME_SA" \
  --project="$PROJECT_ID" \
  --member="serviceAccount:${DEPLOYER_SA}" \
  --role='roles/iam.serviceAccountUser' \
  --quiet >/dev/null

echo '[AIONE] Allow deployer to mint its short-lived ID token for authenticated health checks'
gcloud iam service-accounts add-iam-policy-binding "$DEPLOYER_SA" \
  --project="$PROJECT_ID" \
  --member="serviceAccount:${DEPLOYER_SA}" \
  --role='roles/iam.serviceAccountOpenIdTokenCreator' \
  --quiet >/dev/null

echo '[AIONE] Allow deployer to invoke the private CURRENT Cloud Run service'
gcloud run services add-iam-policy-binding "$AIONE_RUN_SERVICE" \
  --project="$PROJECT_ID" \
  --region="$AIONE_REGION" \
  --member="serviceAccount:${DEPLOYER_SA}" \
  --role='roles/run.invoker' \
  --quiet >/dev/null

INCLUDED_FILES='apps/systems/aione/backend/**,data-code/migrations/**,data-code/current/**,Dockerfile,infra/gcp/cloudbuild/deploy-current.yaml,infra/gcp/cloud-shell/CURRENT_BASELINE.sh'
SERVICE_ACCOUNT_RESOURCE="projects/${PROJECT_ID}/serviceAccounts/${DEPLOYER_SA}"

echo '[AIONE] Create or update the single main -> CURRENT deployment trigger'
echo '[AIONE] Every matching main push creates a PENDING build. Only the GitHub PR-merge approval workflow may approve it.'
if gcloud builds triggers describe "$TRIGGER" --project="$PROJECT_ID" --region=global >/dev/null 2>&1; then
  gcloud builds triggers update github "$TRIGGER" \
    --project="$PROJECT_ID" \
    --region=global \
    --branch-pattern='^main$' \
    --build-config="$BUILD_CONFIG" \
    --included-files="$INCLUDED_FILES" \
    --service-account="$SERVICE_ACCOUNT_RESOURCE" \
    --include-logs-with-status \
    --require-approval \
    --quiet
else
  gcloud builds triggers create github \
    --project="$PROJECT_ID" \
    --region=global \
    --name="$TRIGGER" \
    --repo-owner='zhan-shuquan' \
    --repo-name='miwa-code' \
    --branch-pattern='^main$' \
    --build-config="$BUILD_CONFIG" \
    --included-files="$INCLUDED_FILES" \
    --service-account="$SERVICE_ACCOUNT_RESOURCE" \
    --include-logs-with-status \
    --require-approval
fi

echo '[AIONE] Verify exactly one CURRENT deployment trigger exists and approval is required'
gcloud builds triggers describe "$TRIGGER" \
  --project="$PROJECT_ID" \
  --region=global \
  --format='yaml(name,filename,github.push.branch,serviceAccount,includedFiles,approvalConfig.approvalRequired,disabled)'

printf '\n[AIONE] AUTOMATED OPS INSTALLED\n'
printf 'Normal operation from now on:\n'
printf '  Branch work -> checks -> merge main -> pending Cloud Build -> GitHub PR-merge approval -> candidate health -> 100%% cutover\n'
printf 'Direct pushes to main can create a pending build but are not auto-approved for production deployment.\n'
printf 'Database migration mismatch blocks deployment automatically and requires a separately reviewed CURRENT migration action.\n'
