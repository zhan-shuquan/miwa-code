#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/lib.sh"
assert_aione_current_baseline

PROJECT_ID="${AIONE_PROJECT_ID:-miwa-aione}"
REGION="${AIONE_REGION:-asia-northeast1}"
KEEP_JOB="${AIONE_PREFLIGHT_JOB}"

OLD_JOBS=(
  "aione-db-baseline-audit-aione-pg-dev"
  "aione-db-baseline-audit-aione-postgres"
  "aione-db-legacy-inventory"
  "aione-db-migrate-dev"
  "aione-db-preflight-dev"
  "aione-db-preflight-strict-dev"
  "aione-db-smoke-p0-dev"
  "aione-migrate-once"
  "aione-recurring-migrate"
  "aione-v1-reset-once"
)

say "Purge non-CURRENT AIONE jobs"
for job in "${OLD_JOBS[@]}"; do
  if gcloud run jobs describe "$job" --project="$PROJECT_ID" --region="$REGION" >/dev/null 2>&1; then
    gcloud run jobs delete "$job" --project="$PROJECT_ID" --region="$REGION" --quiet
  fi
done

say "Verify the only remaining AIONE Cloud Run job"
mapfile -t jobs < <(gcloud run jobs list --project="$PROJECT_ID" --region="$REGION" --format='value(metadata.name)' | grep '^aione-' || true)

printf '%s\n' "${jobs[@]}"

if [[ ${#jobs[@]} -ne 1 || "${jobs[0]}" != "$KEEP_JOB" ]]; then
  echo "[AIONE][FATAL] Expected only $KEEP_JOB, but found: ${jobs[*]:-<none>}" >&2
  exit 97
fi

printf '\n[AIONE] Cloud Run jobs now have one CURRENT baseline only: %s\n' "$KEEP_JOB"
