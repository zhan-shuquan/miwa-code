#!/usr/bin/env bash
# Preview stop-mode in the existing CURRENT pipeline, not a second runtime baseline.
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"
source infra/gcp/cloud-shell/CURRENT_BASELINE.sh
assert_aione_current_baseline
: "${AIONE_PREVIEW_COMMIT:?Set the reviewed full PR commit SHA}"
[[ "$AIONE_PREVIEW_COMMIT" =~ ^[a-f0-9]{40}$ ]] || exit 64
[[ "$(git rev-parse HEAD)" == "$AIONE_PREVIEW_COMMIT" ]] || { echo '[STOP] Checkout does not match reviewed commit'; exit 64; }
[[ -z "$(git status --porcelain)" ]] || { echo '[STOP] Working tree has unreviewed changes'; exit 64; }
SHORT_SHA="${AIONE_PREVIEW_COMMIT:0:7}"
echo '[AIONE] Existing CURRENT pipeline, preview stop-mode.'
echo "[AIONE] REVIEWED COMMIT: $AIONE_PREVIEW_COMMIT"
echo '[AIONE] Preview mode skips shared CURRENT database migrations and schema preflight; existing runtime database remains unchanged.'
echo '[AIONE] Deploy private tagged revision; preserve active traffic and authentication.'
gcloud builds submit . --project="$AIONE_PROJECT_ID" \
  --config=infra/gcp/cloudbuild/deploy-current.yaml \
  --service-account="projects/$AIONE_PROJECT_ID/serviceAccounts/$AIONE_DEPLOYER_SERVICE_ACCOUNT_NAME@$AIONE_PROJECT_ID.iam.gserviceaccount.com" \
  --substitutions="SHORT_SHA=$SHORT_SHA,_AIONE_DEPLOY_MODE=preview" --quiet
TAG="candidate-$SHORT_SHA"
gcloud run services describe "$AIONE_RUN_SERVICE" --project="$AIONE_PROJECT_ID" --region="$AIONE_REGION" --format=json \
 | python3 -c 'import json,sys; p=json.load(sys.stdin); tag=sys.argv[1]; print("PREVIEW_BACKEND_URL="+next(r["url"] for r in p["status"]["traffic"] if r.get("tag")==tag))' "$TAG"
