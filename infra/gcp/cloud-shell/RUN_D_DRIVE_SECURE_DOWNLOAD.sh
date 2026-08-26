#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# Isolate this release tag without changing the user's saved cloud-config.sh.
export AIONE_IMAGE_TAG="${AIONE_IMAGE_TAG:-v1.9.26}"

source "$SCRIPT_DIR/lib.sh"

say "Enable Google Drive API for the AIONE runtime project"
gcloud services enable drive.googleapis.com --project="$PROJECT_ID"

say "Show the runtime identity that needs one-time Shared Drive membership"
printf '[AIONE] Add this account to Shared Drive 美和集团（全球） as Viewer:\n%s\n' "$RUNTIME_SA_EMAIL"

say "Build V1.9.26 backend image"
"$SCRIPT_DIR/02_BUILD_IMAGE.sh"

say "Deploy V1.9.26 private backend with secure Drive proxy enabled"
"$SCRIPT_DIR/05_DEPLOY_BACKEND_PRIVATE.sh"

say "Deployment finished"
echo "One-time Drive action (if not already done): add $RUNTIME_SA_EMAIL to Shared Drive 美和集团（全球） as Viewer."
echo "Then sign in to AIONE and test: 美和之家 -> 企业资料 -> 集团核心资料 -> 下载原件"
