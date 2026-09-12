#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
cd "$REPO_ROOT"

source infra/gcp/cloud-shell/CURRENT_BASELINE.sh
assert_aione_current_baseline

[[ "$(git branch --show-current)" == "main" ]] || { echo '[AIONE][STOP] CURRENT migration action must run from main.' >&2; exit 20; }
[[ -z "$(git status --porcelain)" ]] || { echo '[AIONE][STOP] Repo must be clean before CURRENT migration action.' >&2; exit 21; }
git pull --ff-only origin main >/dev/null

resolve_gcloud_control_account() {
  local requested_email active_account
  local -a authenticated_accounts=()

  requested_email="$(printf '%s' "${AIONE_GCLOUD_CONTROL_EMAIL:-}" | tr '[:upper:]' '[:lower:]' | xargs)"
  active_account="$(gcloud config get-value account 2>/dev/null || true)"
  active_account="$(printf '%s' "$active_account" | tr '[:upper:]' '[:lower:]' | xargs)"
  [[ "$active_account" != "(unset)" ]] || active_account=""

  mapfile -t authenticated_accounts < <(
    gcloud auth list --format='value(account)' 2>/dev/null \
      | tr '[:upper:]' '[:lower:]' \
      | sed '/^[[:space:]]*$/d' \
      | sort -u
  )

  if [[ -n "$requested_email" ]]; then
    if ! printf '%s\n' "${authenticated_accounts[@]:-}" | grep -Fxq "$requested_email"; then
      echo "[AIONE][STOP] Requested Cloud control account is not authenticated in gcloud: $requested_email" >&2
      exit 22
    fi
    if [[ "$active_account" != "$requested_email" ]]; then
      gcloud config set account "$requested_email" >/dev/null
      active_account="$requested_email"
      echo "[AIONE] Selected requested gcloud control account: $active_account"
    fi
  elif [[ -z "$active_account" ]]; then
    if [[ "${#authenticated_accounts[@]}" -eq 1 ]]; then
      active_account="${authenticated_accounts[0]}"
      gcloud config set account "$active_account" >/dev/null
      echo "[AIONE] Auto-selected sole authenticated gcloud control account: $active_account"
    elif [[ "${#authenticated_accounts[@]}" -eq 0 ]]; then
      echo '[AIONE][STOP] No authenticated gcloud account is available. Run gcloud auth login once, then rerun.' >&2
      exit 22
    else
      echo '[AIONE][STOP] Multiple gcloud accounts are authenticated but none is active. Set AIONE_GCLOUD_CONTROL_EMAIL and rerun.' >&2
      exit 22
    fi
  fi

  CLOUD_CONTROL_EMAIL="$active_account"
}

mint_cloud_run_health_token() {
  local service_url="$1"
  if [[ "$CLOUD_CONTROL_EMAIL" == *.gserviceaccount.com ]]; then
    gcloud auth print-identity-token --audiences="$service_url"
  else
    # Cloud Shell normally runs this reviewed action under a human Google account.
    # For direct Cloud Run developer invocation, use the generic gcloud identity token.
    # Forcing --audiences on a user credential can yield HTTP 401 from Cloud Run.
    gcloud auth print-identity-token
  fi
}

wait_for_build_terminal() {
  local build_id="$1"
  local allow_failure_with_image="${2:-false}"
  local status=""

  for i in $(seq 1 120); do
    status="$(gcloud builds describe "$build_id" --project="$PROJECT_ID" --region=global --format='value(status)' 2>/dev/null || true)"
    case "$status" in
      SUCCESS)
        return 0
        ;;
      FAILURE|CANCELLED|EXPIRED|TIMEOUT|INTERNAL_ERROR)
        if [[ "$allow_failure_with_image" == "true" ]] && gcloud artifacts docker images describe "$IMAGE" --project="$PROJECT_ID" >/dev/null 2>&1; then
          echo "[AIONE] Bootstrap build ended with ${status} after publishing the required immutable image."
          echo '[AIONE] This is allowed before migration because the deployment migration gate can intentionally stop on DB/Repo version mismatch.'
          return 0
        fi
        echo "[AIONE][STOP] Cloud Build failed before the required state was reached: $status" >&2
        return 1
        ;;
    esac
    if [[ "$i" -eq 120 ]]; then
      echo '[AIONE][STOP] Cloud Build did not finish within 20 minutes.' >&2
      return 1
    fi
    sleep 10
  done
}

resolve_gcloud_control_account

gcloud config set project "$AIONE_PROJECT_ID" >/dev/null

PROJECT_ID="$AIONE_PROJECT_ID"
REGION="$AIONE_REGION"
RUNTIME_SA="${AIONE_RUNTIME_SERVICE_ACCOUNT_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"
CONNECTION="$(gcloud sql instances describe "$AIONE_SQL_INSTANCE" --project="$PROJECT_ID" --format='value(connectionName)')"
REPO_VERSION="$(find data-code/migrations -maxdepth 1 -type f -name '[0-9][0-9][0-9][0-9]_*.sql' -printf '%f\n' | sort | tail -n1 | cut -d_ -f1)"
[[ -n "$REPO_VERSION" ]] || { echo '[AIONE][STOP] Could not resolve Repo migration version.' >&2; exit 23; }

# Resolve the newest code-bearing commit. Automation-only changes must not
# change the immutable application image identity.
CODE_FULL_SHA="$(git log -1 --format=%H -- \
  apps/systems/aione/backend \
  data-code/migrations \
  data-code/current \
  Dockerfile \
  infra/gcp/cloudbuild/deploy-current.yaml \
  infra/gcp/cloud-shell/CURRENT_BASELINE.sh)"
[[ -n "$CODE_FULL_SHA" ]] || { echo '[AIONE][STOP] Could not resolve CURRENT code-bearing SHA.' >&2; exit 24; }
CODE_SHA="${CODE_FULL_SHA:0:7}"
IMAGE="${REGION}-docker.pkg.dev/${PROJECT_ID}/${AIONE_ARTIFACT_REPO}/${AIONE_IMAGE_NAME}:main-${CODE_SHA}"

printf '\n[AIONE] Apply reviewed CURRENT migrations and redeploy\n'
printf 'Main HEAD             : %s\n' "$(git rev-parse --short=7 HEAD)"
printf 'Code image SHA        : %s\n' "$CODE_SHA"
printf 'Migration target      : %s\n' "$REPO_VERSION"
printf 'Cloud SQL             : %s\n' "$AIONE_SQL_INSTANCE"
printf 'Cloud control account : %s\n\n' "$CLOUD_CONTROL_EMAIL"

echo '[AIONE] 1/5 Confirm immutable code image exists'
if ! gcloud artifacts docker images describe "$IMAGE" --project="$PROJECT_ID" >/dev/null 2>&1; then
  echo "[AIONE] Immutable image is not visible yet: $IMAGE"
  echo '[AIONE] Wait briefly for the automatic main trigger before self-healing.'
  for i in $(seq 1 18); do
    if gcloud artifacts docker images describe "$IMAGE" --project="$PROJECT_ID" >/dev/null 2>&1; then
      echo '[AIONE] Automatic main build published the immutable image.'
      break
    fi
    sleep 10
  done
fi

if ! gcloud artifacts docker images describe "$IMAGE" --project="$PROJECT_ID" >/dev/null 2>&1; then
  echo '[AIONE] Immutable image is still missing; run the canonical deployment trigger for the exact code-bearing commit.'
  BOOTSTRAP_BUILD_ID="$(gcloud builds triggers run "$AIONE_DEPLOY_TRIGGER_NAME" \
    --project="$PROJECT_ID" \
    --region=global \
    --sha="$CODE_FULL_SHA" \
    --format='value(metadata.build.id)')"
  [[ -n "$BOOTSTRAP_BUILD_ID" ]] || { echo '[AIONE][STOP] Could not resolve bootstrap build id.' >&2; exit 25; }
  printf 'Bootstrap Build ID: %s\n' "$BOOTSTRAP_BUILD_ID"
  wait_for_build_terminal "$BOOTSTRAP_BUILD_ID" true || exit 25
fi

if ! gcloud artifacts docker images describe "$IMAGE" --project="$PROJECT_ID" >/dev/null 2>&1; then
  echo "[AIONE][STOP] Required immutable image still does not exist: $IMAGE" >&2
  exit 25
fi
echo '[AIONE] Immutable code image ready.'

echo '[AIONE] 2/5 Deploy and execute the canonical migration job'
gcloud run jobs deploy "$AIONE_MIGRATION_JOB" \
  --image="$IMAGE" \
  --region="$REGION" \
  --project="$PROJECT_ID" \
  --service-account="$RUNTIME_SA" \
  --set-cloudsql-instances="$CONNECTION" \
  --set-env-vars="DB_USER=${AIONE_DB_USER},DB_NAME=${AIONE_DB_NAME},INSTANCE_UNIX_SOCKET=/cloudsql/${CONNECTION},NODE_ENV=production" \
  --set-secrets="DB_PASS=${AIONE_DB_PASSWORD_SECRET}:latest" \
  --command=npm \
  --args=run,db:migrate \
  --tasks=1 \
  --max-retries=0 \
  --task-timeout=10m \
  --quiet

gcloud run jobs execute "$AIONE_MIGRATION_JOB" \
  --region="$REGION" \
  --project="$PROJECT_ID" \
  --wait >/dev/null

echo '[AIONE] 3/5 Verify CURRENT database migration version through the production health contract'
SERVICE_URL="$(gcloud run services describe "$AIONE_RUN_SERVICE" --region="$REGION" --project="$PROJECT_ID" --format='value(status.url)')"
IAM_TOKEN="$(mint_cloud_run_health_token "$SERVICE_URL")"
HEALTH_JSON="$(curl -fsS -H "Authorization: Bearer $IAM_TOKEN" "$SERVICE_URL/health")"
DB_VERSION="$(printf '%s' "$HEALTH_JSON" | python3 -c 'import json,sys; p=json.load(sys.stdin); print((p.get("latestMigration") or {}).get("version") or "")')"
printf 'db_migration=%s repo_migration=%s\n' "$DB_VERSION" "$REPO_VERSION"
[[ "$DB_VERSION" == "$REPO_VERSION" ]] || { echo '[AIONE][STOP] Database migration verification failed.' >&2; exit 26; }

echo '[AIONE] 4/5 Trigger the single main -> CURRENT deployment pipeline'
BUILD_ID="$(gcloud builds triggers run "$AIONE_DEPLOY_TRIGGER_NAME" \
  --project="$PROJECT_ID" \
  --region=global \
  --branch=main \
  --format='value(metadata.build.id)')"
[[ -n "$BUILD_ID" ]] || { echo '[AIONE][STOP] Could not resolve triggered build id.' >&2; exit 27; }
printf 'Build ID: %s\n' "$BUILD_ID"
wait_for_build_terminal "$BUILD_ID" false || exit 28
echo '[AIONE] CURRENT deployment PASS.'

echo '[AIONE] 5/5 Verify deployed service is healthy and aligned with the triggered main image'
IAM_TOKEN="$(mint_cloud_run_health_token "$SERVICE_URL")"
FINAL_HEALTH="$(curl -fsS -H "Authorization: Bearer $IAM_TOKEN" "$SERVICE_URL/health")"
printf '%s\n' "$FINAL_HEALTH"
printf '%s' "$FINAL_HEALTH" | python3 -c 'import json,sys; p=json.load(sys.stdin); assert p.get("ok") is True and p.get("database")=="connected"'

printf '\n[AIONE] CURRENT MIGRATION + DEPLOY PASS\n'
printf 'Database migration is aligned with Repo and the single CURRENT deployment pipeline completed successfully.\n'
