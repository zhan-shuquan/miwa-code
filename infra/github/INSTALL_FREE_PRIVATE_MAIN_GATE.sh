#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$REPO_ROOT"
source infra/gcp/cloud-shell/CURRENT_BASELINE.sh
assert_aione_current_baseline

PROJECT_ID="$AIONE_PROJECT_ID"
PROJECT_NUMBER="$AIONE_PROJECT_NUMBER"
POOL_ID="$AIONE_GITHUB_WIF_POOL_ID"
PROVIDER_ID="$AIONE_GITHUB_WIF_PROVIDER_ID"
APPROVER_SA="${AIONE_GITHUB_APPROVER_SERVICE_ACCOUNT_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"
REPOSITORY="$AIONE_GITHUB_REPOSITORY"

printf '\n[AIONE] Install private-repo production approval gate\n'
printf 'Repository : %s\n' "$REPOSITORY"
printf 'Project    : %s\n' "$PROJECT_ID"
printf 'Trigger    : %s\n' "$AIONE_DEPLOY_TRIGGER_NAME"
printf 'Approver SA: %s\n\n' "$APPROVER_SA"

gcloud config set project "$PROJECT_ID" >/dev/null

echo '[AIONE] Enable IAM and Security Token Service APIs'
gcloud services enable \
  iam.googleapis.com \
  iamcredentials.googleapis.com \
  sts.googleapis.com \
  cloudbuild.googleapis.com \
  --project="$PROJECT_ID" >/dev/null

echo '[AIONE] Ensure dedicated GitHub approver service account'
if ! gcloud iam service-accounts describe "$APPROVER_SA" --project="$PROJECT_ID" >/dev/null 2>&1; then
  gcloud iam service-accounts create "$AIONE_GITHUB_APPROVER_SERVICE_ACCOUNT_NAME" \
    --project="$PROJECT_ID" \
    --display-name='AIONE GitHub merged-PR deploy approver'
fi

for role in roles/cloudbuild.builds.approver roles/cloudbuild.builds.viewer; do
  gcloud projects add-iam-policy-binding "$PROJECT_ID" \
    --member="serviceAccount:${APPROVER_SA}" \
    --role="$role" \
    --condition=None \
    --quiet >/dev/null
done

echo '[AIONE] Ensure GitHub Workload Identity Pool'
if ! gcloud iam workload-identity-pools describe "$POOL_ID" \
  --project="$PROJECT_ID" --location=global >/dev/null 2>&1; then
  gcloud iam workload-identity-pools create "$POOL_ID" \
    --project="$PROJECT_ID" \
    --location=global \
    --display-name='AIONE GitHub Actions'
fi

echo '[AIONE] Ensure GitHub OIDC provider restricted to the one AIONE repository'
if ! gcloud iam workload-identity-pools providers describe "$PROVIDER_ID" \
  --project="$PROJECT_ID" --location=global --workload-identity-pool="$POOL_ID" >/dev/null 2>&1; then
  gcloud iam workload-identity-pools providers create-oidc "$PROVIDER_ID" \
    --project="$PROJECT_ID" \
    --location=global \
    --workload-identity-pool="$POOL_ID" \
    --display-name='AIONE miwa-code GitHub provider' \
    --issuer-uri='https://token.actions.githubusercontent.com/' \
    --attribute-mapping='google.subject=assertion.sub,attribute.repository=assertion.repository,attribute.repository_owner=assertion.repository_owner' \
    --attribute-condition="assertion.repository=='${REPOSITORY}'"
fi

MEMBER="principalSet://iam.googleapis.com/projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/${POOL_ID}/attribute.repository/${REPOSITORY}"

echo '[AIONE] Allow only this GitHub repository to impersonate the approver service account'
gcloud iam service-accounts add-iam-policy-binding "$APPROVER_SA" \
  --project="$PROJECT_ID" \
  --role='roles/iam.workloadIdentityUser' \
  --member="$MEMBER" \
  --quiet >/dev/null

echo '[AIONE] Re-install CURRENT trigger with Cloud Build approval required'
bash infra/gcp/automation/INSTALL_CURRENT_AUTOMATION.sh

echo '[AIONE] Verify approval gate and WIF provider'
gcloud builds triggers describe "$AIONE_DEPLOY_TRIGGER_NAME" \
  --project="$PROJECT_ID" --region=global \
  --format='yaml(name,approvalConfig.approvalRequired,github.push.branch,serviceAccount)'

gcloud iam workload-identity-pools providers describe "$PROVIDER_ID" \
  --project="$PROJECT_ID" --location=global --workload-identity-pool="$POOL_ID" \
  --format='yaml(name,state,oidc.issuerUri,attributeCondition)'

printf '\n[AIONE] PRIVATE REPO MAIN GATE INSTALLED\n'
printf 'Production deployment now requires both events:\n'
printf '  1. main push creates a PENDING Cloud Build\n'
printf '  2. GitHub merged-PR workflow approves the matching build\n'
printf 'A direct push to main is therefore not automatically deployed to production.\n'
