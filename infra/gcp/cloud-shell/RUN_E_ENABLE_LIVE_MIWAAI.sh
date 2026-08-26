#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

export AIONE_IMAGE_TAG="${AIONE_IMAGE_TAG:-v1.9.29.1}"
export AIONE_AI_MODE="live"
export AIONE_AI_PROVIDER="${AIONE_AI_PROVIDER:-openai}"
export AIONE_AI_MODEL="${AIONE_AI_MODEL:-gpt-5.6-sol}"
# shellcheck source=/dev/null
source "$SCRIPT_DIR/lib.sh"
require_db_secret

if [[ -z "${OPENAI_API_KEY_SECRET:-}" ]]; then
  say "No existing OpenAI Secret Manager binding was detected"
  if [[ ! -t 0 ]]; then
    die "Set AIONE_OPENAI_API_KEY_SECRET before non-interactive live deployment."
  fi
  gcloud services enable secretmanager.googleapis.com --project="$PROJECT_ID" >/dev/null
  OPENAI_API_KEY_SECRET="aione-openai-api-key"
  if ! gcloud secrets describe "$OPENAI_API_KEY_SECRET" --project="$PROJECT_ID" >/dev/null 2>&1; then
    gcloud secrets create "$OPENAI_API_KEY_SECRET" --project="$PROJECT_ID" --replication-policy="automatic" >/dev/null
  fi
  printf "Paste OpenAI API key (input hidden; it will not be written to the repository): "
  IFS= read -r -s OPENAI_KEY
  printf "\n"
  [[ -n "$OPENAI_KEY" ]] || die "OpenAI API key was empty."
  printf '%s' "$OPENAI_KEY" | gcloud secrets versions add "$OPENAI_API_KEY_SECRET" --project="$PROJECT_ID" --data-file=- >/dev/null
  unset OPENAI_KEY
  export AIONE_OPENAI_API_KEY_SECRET="$OPENAI_API_KEY_SECRET"
fi
require_ai_secret

say "Grant Runtime Service Account access to the OpenAI API secret"
gcloud secrets add-iam-policy-binding "$OPENAI_API_KEY_SECRET" \
  --project="$PROJECT_ID" \
  --member="serviceAccount:${RUNTIME_SA_EMAIL}" \
  --role="roles/secretmanager.secretAccessor" >/dev/null

say "Build V1.9.29.1 backend image for Work Home restoration + live 美和AI"
bash "$SCRIPT_DIR/02_BUILD_IMAGE.sh"

say "Deploy production 美和AI with live OpenAI provider"
bash "$SCRIPT_DIR/05_DEPLOY_BACKEND_PRIVATE.sh"
bash "$SCRIPT_DIR/07_SETUP_VERCEL_OIDC_BRIDGE.sh"
bash "$SCRIPT_DIR/06_SMOKE_TEST.sh"

echo
echo "[AIONE] Live 美和AI deployment finished."
echo "Test in production: 经营架构还有什么可以优化？"
