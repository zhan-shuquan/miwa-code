#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

cat <<'TXT'
[AIONE] V1.9.21 production subdomain bridge fast path
This path DOES NOT run database migrations.
It rebuilds the backend image, deploys the private Cloud Run revision,
configures the Vercel OIDC/WIF bridge, and runs the auth smoke test.
TXT

for step in 02_BUILD_IMAGE.sh 05_DEPLOY_BACKEND_PRIVATE.sh 07_SETUP_VERCEL_OIDC_BRIDGE.sh 06_SMOKE_TEST.sh; do
  printf '\n============================================================\n'
  printf '[AIONE] Running %s\n' "$step"
  printf '============================================================\n'
  "$SCRIPT_DIR/$step"
done

printf '\n[AIONE] V1.9.21 cloud-side bridge preparation complete.\n'
printf '[AIONE] Copy the five printed values into Vercel Production Environment Variables, then redeploy main.\n'
