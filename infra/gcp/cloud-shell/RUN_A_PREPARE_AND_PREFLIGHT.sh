#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
for step in 00_DISCOVER.sh 01_PREPARE_RUNTIME.sh 02_BUILD_IMAGE.sh 03_DB_PREFLIGHT.sh; do
  printf '\n============================================================\n'
  printf '[AIONE] Running %s\n' "$step"
  printf '============================================================\n'
  "$SCRIPT_DIR/$step"
done
printf '\n[AIONE] Phase A complete. Review the DB preflight output before migration.\n'
