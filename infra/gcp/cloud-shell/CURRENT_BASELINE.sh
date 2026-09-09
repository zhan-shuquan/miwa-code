#!/usr/bin/env bash
# AIONE single CURRENT infrastructure baseline.
# This file is the only supported source for runtime and deployment target names.

export AIONE_PROJECT_ID="miwa-aione"
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
export AIONE_DEPLOYER_SERVICE_ACCOUNT_NAME="aione-deployer"
export AIONE_DEPLOY_TRIGGER_NAME="aione-current-deploy"

# AIONE 1688 selection CURRENT file-driven integration.
export AIONE_SHARED_DRIVE_ID="0AIPSFkmR2vB_Uk9PVA"
export AIONE_1688_SELECTION_INBOX_FOLDER_ID="1_hCOozd_Het_7LqMXxHBwdk4ku37JFHs"
export AIONE_SELECTION_IMPORT_JOB="aione-selection-import-current"
export AIONE_SELECTION_IMPORT_SCHEDULER="aione-selection-import-every-10m"

export AIONE_AI_MODE="live"
export AIONE_AI_PROVIDER="openai"
export AIONE_AI_MODEL="gpt-5.6-sol"
export AIONE_OPENAI_API_KEY_SECRET="aione-openai-api-key"

export AIONE_GOOGLE_CLIENT_ID="49629089449-5lkfjfnadvq14f9uuid91chqgjjdihmi.apps.googleusercontent.com"
export AIONE_PRODUCTION_ORIGIN="https://aione.miwa-happyhouse.com"
export AIONE_TEST_ORIGIN="https://aione-test.miwa-happyhouse.com"

AIONE_FORBIDDEN_RUNTIME_NAMES=(
  "aione-backend-v190"
  "aione-backend-dev"
  "aione-backend-pgdev-check"
  "aione-postgres"
)

assert_aione_current_baseline() {
  local bad

  [[ "${AIONE_PROJECT_ID:-}" == "miwa-aione" ]] || {
    echo "[AIONE][FATAL] PROJECT_ID must be miwa-aione" >&2
    exit 90
  }
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
  [[ "${AIONE_PREFLIGHT_JOB:-}" == "aione-db-preflight-current" ]] || {
    echo "[AIONE][FATAL] PREFLIGHT_JOB must be aione-db-preflight-current" >&2
    exit 96
  }
  [[ "${AIONE_DEPLOY_TRIGGER_NAME:-}" == "aione-current-deploy" ]] || {
    echo "[AIONE][FATAL] Deploy trigger must be aione-current-deploy" >&2
    exit 97
  }
  [[ "${AIONE_SHARED_DRIVE_ID:-}" == "0AIPSFkmR2vB_Uk9PVA" ]] || {
    echo "[AIONE][FATAL] Shared Drive must be 美和集团（全球） CURRENT drive" >&2
    exit 99
  }
  [[ "${AIONE_1688_SELECTION_INBOX_FOLDER_ID:-}" == "1_hCOozd_Het_7LqMXxHBwdk4ku37JFHs" ]] || {
    echo "[AIONE][FATAL] 1688 selection inbox folder is not CURRENT" >&2
    exit 100
  }
  [[ "${AIONE_SELECTION_IMPORT_JOB:-}" == "aione-selection-import-current" ]] || {
    echo "[AIONE][FATAL] Selection import job must be aione-selection-import-current" >&2
    exit 101
  }

  for bad in "${AIONE_FORBIDDEN_RUNTIME_NAMES[@]}"; do
    if env | grep -Fq "$bad"; then
      echo "[AIONE][FATAL] Forbidden legacy runtime name detected in environment: $bad" >&2
      exit 98
    fi
  done
}
