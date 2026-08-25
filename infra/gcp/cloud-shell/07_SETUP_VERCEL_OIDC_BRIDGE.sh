#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/lib.sh"

say "Enable APIs needed by the Vercel -> GCP Workload Identity bridge"
gcloud services enable \
  iam.googleapis.com \
  iamcredentials.googleapis.com \
  sts.googleapis.com \
  run.googleapis.com \
  --project="$PROJECT_ID" >/dev/null

TEAM_ISSUER_URI="https://oidc.vercel.com/${VERCEL_TEAM_SLUG}"
GLOBAL_ISSUER_URI="https://oidc.vercel.com"
VERCEL_AUDIENCE="https://vercel.com/${VERCEL_TEAM_SLUG}"
EXPECTED_SUBJECT="owner:${VERCEL_TEAM_SLUG}:project:${VERCEL_PROJECT_NAME}:environment:${VERCEL_ENVIRONMENT}"
TEAM_PROVIDER_ID="${WIF_PROVIDER_ID}-team"
GLOBAL_PROVIDER_ID="${WIF_PROVIDER_ID}-global"
FEDERATED_PRINCIPAL="principal://iam.googleapis.com/projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/${WIF_POOL_ID}/subject/${EXPECTED_SUBJECT}"

say "Ensure Workload Identity Pool: $WIF_POOL_ID"
if ! gcloud iam workload-identity-pools describe "$WIF_POOL_ID" --location=global --project="$PROJECT_ID" >/dev/null 2>&1; then
  gcloud iam workload-identity-pools create "$WIF_POOL_ID" \
    --location=global \
    --project="$PROJECT_ID" \
    --display-name="AIONE Vercel" \
    --description="Vercel production bridge for private AIONE Cloud Run"
fi

say "Ensure Team-issuer OIDC provider: $TEAM_PROVIDER_ID"
if ! gcloud iam workload-identity-pools providers describe "$TEAM_PROVIDER_ID" \
    --workload-identity-pool="$WIF_POOL_ID" --location=global --project="$PROJECT_ID" >/dev/null 2>&1; then
  gcloud iam workload-identity-pools providers create-oidc "$TEAM_PROVIDER_ID" \
    --workload-identity-pool="$WIF_POOL_ID" \
    --location=global \
    --project="$PROJECT_ID" \
    --display-name="AIONE Vercel production team issuer" \
    --issuer-uri="$TEAM_ISSUER_URI" \
    --allowed-audiences="$VERCEL_AUDIENCE" \
    --attribute-mapping="google.subject=assertion.sub" \
    --attribute-condition="assertion.sub=='${EXPECTED_SUBJECT}'"
fi

say "Ensure Global-issuer OIDC provider: $GLOBAL_PROVIDER_ID"
if ! gcloud iam workload-identity-pools providers describe "$GLOBAL_PROVIDER_ID" \
    --workload-identity-pool="$WIF_POOL_ID" --location=global --project="$PROJECT_ID" >/dev/null 2>&1; then
  gcloud iam workload-identity-pools providers create-oidc "$GLOBAL_PROVIDER_ID" \
    --workload-identity-pool="$WIF_POOL_ID" \
    --location=global \
    --project="$PROJECT_ID" \
    --display-name="AIONE Vercel production global issuer" \
    --issuer-uri="$GLOBAL_ISSUER_URI" \
    --allowed-audiences="$VERCEL_AUDIENCE" \
    --attribute-mapping="google.subject=assertion.sub" \
    --attribute-condition="assertion.sub=='${EXPECTED_SUBJECT}'"
fi

say "Ensure dedicated Cloud Run invoker service account"
if ! gcloud iam service-accounts describe "$VERCEL_INVOKER_SA_EMAIL" --project="$PROJECT_ID" >/dev/null 2>&1; then
  gcloud iam service-accounts create "$VERCEL_INVOKER_SA_NAME" \
    --project="$PROJECT_ID" \
    --display-name="AIONE Vercel Cloud Run Invoker"
fi

say "Allow only the expected Vercel production identity to mint this service account's OIDC ID token"
gcloud iam service-accounts add-iam-policy-binding "$VERCEL_INVOKER_SA_EMAIL" \
  --project="$PROJECT_ID" \
  --member="$FEDERATED_PRINCIPAL" \
  --role="roles/iam.serviceAccountOpenIdTokenCreator" >/dev/null

say "Allow the dedicated service account to invoke the private AIONE Cloud Run service"
gcloud run services add-iam-policy-binding "$RUN_SERVICE" \
  --region="$REGION" \
  --project="$PROJECT_ID" \
  --member="serviceAccount:${VERCEL_INVOKER_SA_EMAIL}" \
  --role="roles/run.invoker" >/dev/null

SERVICE_URL="$(gcloud run services describe "$RUN_SERVICE" --region="$REGION" --project="$PROJECT_ID" --format='value(status.url)')"
[[ -n "$SERVICE_URL" ]] || die "Cloud Run service URL not found."

cat <<TXT

[AIONE] Vercel -> private Cloud Run WIF bridge is configured on Google Cloud.

Set these Vercel Production environment variables on project: ${VERCEL_PROJECT_NAME}

AIONE_BACKEND_URL=${SERVICE_URL}
GCP_PROJECT_NUMBER=${PROJECT_NUMBER}
GCP_SERVICE_ACCOUNT_EMAIL=${VERCEL_INVOKER_SA_EMAIL}
GCP_WORKLOAD_IDENTITY_POOL_ID=${WIF_POOL_ID}
GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID=${WIF_PROVIDER_ID}  # base id; bridge auto-selects -team or -global

Security boundary:
  Browser Google ID token -> Vercel /api bridge -> Authorization header
  Vercel OIDC (team/global issuer auto-detected) -> Google WIF -> short-lived Cloud Run ID token -> X-Serverless-Authorization
  Cloud Run remains --no-allow-unauthenticated.

After setting Vercel variables, redeploy main and test:
  https://aione.miwa-happyhouse.com/api/v1/ai-secretary/status
TXT
