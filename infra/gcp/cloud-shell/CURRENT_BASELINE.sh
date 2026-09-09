#!/usr/bin/env bash
# AIONE single CURRENT infrastructure baseline.
# This file is the only supported source for runtime target names.

export AIONE_REGION="asia-northeast1"
export AIONE_RUN_SERVICE="aione-backend-current"
export AIONE_SQL_INSTANCE="aione-pg-dev"
export AIONE_DB_NAME="aione"
export AIONE_DB_USER="aione_app"
export AIONE_DB_PASSWORD_SECRET="aione-db-password-dev"
export AIONE_ARTIFACT_REPO="aione"
export AIONE_IMAGE_NAME="aione-backend"
export AIONE_PREFLIGHT_JOB="aione-db-preflight-current"
export AIONE_MIGRATION_JOB="aione-db-migrate-current"
export AIONE_RUNTIME_SERVICE_ACCOUNT_NAME="aione-runtime"
export AIONE_AI_MODE="live"
export AIONE_AI_PROVIDER="openai"
export AIONE_AI_MODEL="gpt-5.6-sol"

AIONE_FORBIDDEN_RUNTIME_NAMES=(
  "aione-backend-v190"
  "aione-backend-dev"
  "aione-backend-pgdev-check"
  "aione-postgres"
)

assert_aione_current_baseline() {
  local bad

  [[ "${AIONE_RUN_SERVICE:-}" == "aione-backend-current" ]] || {
    echo "[AIONE][FATAL] RUN_SERVICE must be aione-backend-current" >&2
    exit 91
  }
  [[ "${AIONE_SQL_INSTANCE:-}" == "aione-pg-dev" ]] || {
    echo "[AIONE][FATAL] SQL_INSTANCE must be aione-pg-dev" >&2
    exit 92
  }
  [[ "${AIONE_DB_NAME:-}" == "aione" ]] || {
    echo "[AIONE][FATAL] DB_NAME must be aione" >&2
    exit 93
  }
  [[ "${AIONE_DB_USER:-}" == "aione_app" ]] || {
    echo "[AIONE][FATAL] DB_USER must be aione_app" >&2
    exit 94
  }
  [[ "${AIONE_DB_PASSWORD_SECRET:-}" == "aione-db-password-dev" ]] || {
    echo "[AIONE][FATAL] DB secret must be aione-db-password-dev" >&2
    exit 95
  }

  for bad in "${AIONE_FORBIDDEN_RUNTIME_NAMES[@]}"; do
    if env | grep -Fq "$bad"; then
      echo "[AIONE][FATAL] Forbidden legacy runtime name detected in environment: $bad" >&2
      exit 96
    fi
  done
}
