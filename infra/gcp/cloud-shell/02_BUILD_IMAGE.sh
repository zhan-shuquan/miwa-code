#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/lib.sh"

say "Build immutable AIONE Backend image with Cloud Build"
print_context
cd "$REPO_ROOT"
gcloud builds submit --tag "$IMAGE_URI" --project="$PROJECT_ID" .

say "Image build complete"
echo "$IMAGE_URI"
echo "Next: ./03_DB_PREFLIGHT.sh"
