#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
for step in 04_DB_MIGRATE.sh 05_DEPLOY_BACKEND_PRIVATE.sh 07_SETUP_VERCEL_OIDC_BRIDGE.sh 06_SMOKE_TEST.sh; do
  printf '\n============================================================\n'
  printf '[AIONE] Running %s\n' "$step"
  printf '============================================================\n'
  "$SCRIPT_DIR/$step"
done
printf '\n[AIONE] Phase B complete. Cloud SQL migration + private Cloud Run + Vercel WIF bridge smoke test finished.\n'
