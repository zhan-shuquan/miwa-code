#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
cd "$REPO_ROOT"

source infra/gcp/cloud-shell/CURRENT_BASELINE.sh
assert_aione_current_baseline

[[ "$(git branch --show-current)" == "main" ]] || { echo '[AIONE][STOP] Acceptance must run from main.' >&2; exit 20; }
[[ -z "$(git status --porcelain)" ]] || { echo '[AIONE][STOP] Repo must be clean before acceptance.' >&2; exit 21; }
git pull --ff-only origin main >/dev/null

PROJECT_ID="$AIONE_PROJECT_ID"
REGION="$AIONE_REGION"
RUNTIME_SA="${AIONE_RUNTIME_SERVICE_ACCOUNT_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"
SHORT_SHA="$(git rev-parse --short=7 HEAD)"
IMAGE="${REGION}-docker.pkg.dev/${PROJECT_ID}/${AIONE_ARTIFACT_REPO}/${AIONE_IMAGE_NAME}:main-${SHORT_SHA}"
CONNECTION="$(gcloud sql instances describe "$AIONE_SQL_INSTANCE" --project="$PROJECT_ID" --format='value(connectionName)')"
ACCEPTANCE_JOB="aione-selection-acceptance-current"

cleanup() {
  gcloud run jobs delete "$ACCEPTANCE_JOB" --region="$REGION" --project="$PROJECT_ID" --quiet >/dev/null 2>&1 || true
}
trap cleanup EXIT

printf '\n[AIONE] Selection Backend Closure V1 acceptance\n'
printf 'Main SHA     : %s\n' "$SHORT_SHA"
printf 'Image        : %s\n' "$IMAGE"
printf 'Cloud SQL    : %s\n\n' "$AIONE_SQL_INSTANCE"

echo '[AIONE] 1/4 Ensure CURRENT immutable main image exists'
if gcloud artifacts docker images describe "$IMAGE" --project="$PROJECT_ID" >/dev/null 2>&1; then
  echo '[AIONE] Immutable image already exists.'
else
  echo '[AIONE] Immutable image missing; trigger the single CURRENT deployment pipeline now.'
  gcloud builds triggers run "$AIONE_DEPLOY_TRIGGER_NAME" \
    --region=global \
    --branch=main \
    --project="$PROJECT_ID" \
    --quiet >/dev/null

  for i in $(seq 1 90); do
    if gcloud artifacts docker images describe "$IMAGE" --project="$PROJECT_ID" >/dev/null 2>&1; then
      echo '[AIONE] Immutable image ready.'
      break
    fi
    if [[ "$i" -eq 90 ]]; then
      echo '[AIONE][STOP] CURRENT deployment pipeline did not produce the immutable main image within 15 minutes.' >&2
      exit 22
    fi
    sleep 10
  done
fi

echo '[AIONE] 2/4 Verify CURRENT service uses the same immutable image'
for i in $(seq 1 90); do
  SERVICE_IMAGE="$(gcloud run services describe "$AIONE_RUN_SERVICE" --region="$REGION" --project="$PROJECT_ID" --format='value(spec.template.spec.containers[0].image)')"
  if [[ "$SERVICE_IMAGE" == "$IMAGE" ]]; then
    echo '[AIONE] CURRENT service image PASS.'
    break
  fi
  if [[ "$i" -eq 90 ]]; then
    echo '[AIONE][STOP] CURRENT service did not deploy this main image within 15 minutes.' >&2
    printf 'Expected: %s\nActual  : %s\n' "$IMAGE" "$SERVICE_IMAGE" >&2
    exit 23
  fi
  sleep 10
done

echo '[AIONE] 3/4 Execute read-only CURRENT database acceptance'
gcloud run jobs deploy "$ACCEPTANCE_JOB" \
  --image="$IMAGE" \
  --region="$REGION" \
  --project="$PROJECT_ID" \
  --service-account="$RUNTIME_SA" \
  --set-cloudsql-instances="$CONNECTION" \
  --set-env-vars="DB_USER=${AIONE_DB_USER},DB_NAME=${AIONE_DB_NAME},INSTANCE_UNIX_SOCKET=/cloudsql/${CONNECTION},NODE_ENV=production" \
  --set-secrets="DB_PASS=${AIONE_DB_PASSWORD_SECRET}:latest" \
  --command=npm \
  --args=run,selection:accept:backend \
  --tasks=1 \
  --max-retries=0 \
  --task-timeout=10m \
  --quiet >/dev/null

set +e
EXECUTE_OUTPUT="$(gcloud run jobs execute "$ACCEPTANCE_JOB" \
  --region="$REGION" \
  --project="$PROJECT_ID" \
  --wait \
  --format='value(metadata.name)' 2>&1)"
EXECUTE_CODE=$?
set -e
printf '%s\n' "$EXECUTE_OUTPUT"

EXECUTION="$(printf '%s\n' "$EXECUTE_OUTPUT" | grep -Eo 'aione-selection-acceptance-current-[a-z0-9]+' | tail -n1 || true)"
if [[ -z "$EXECUTION" ]]; then
  EXECUTION="$(gcloud run jobs executions list \
    --job="$ACCEPTANCE_JOB" \
    --region="$REGION" \
    --project="$PROJECT_ID" \
    --sort-by='~metadata.creationTimestamp' \
    --limit=1 \
    --format='value(metadata.name)' 2>/dev/null || true)"
fi
[[ -n "$EXECUTION" ]] || { echo '[AIONE][STOP] Acceptance execution id missing.' >&2; exit 24; }

echo '[AIONE] 4/4 Read authoritative acceptance result'
set +e
LOGS="$(gcloud beta run jobs executions logs read "$EXECUTION" --region="$REGION" --project="$PROJECT_ID" --limit=300 2>&1)"
LOG_READ_CODE=$?
set -e
printf '%s\n' "$LOGS"

if [[ "$LOG_READ_CODE" -ne 0 ]]; then
  echo '[AIONE][STOP] Acceptance logs could not be read.' >&2
  exit 27
fi

if [[ "$EXECUTE_CODE" -ne 0 ]]; then
  echo '[AIONE][STOP] Selection acceptance job execution failed. Root-cause logs are printed above.' >&2
  exit 25
fi

if ! grep -q '"ok": true' <<<"$LOGS"; then
  echo '[AIONE][STOP] Selection Backend Closure V1 acceptance did not PASS.' >&2
  exit 25
fi

for ref in 582318159544 1055540915024 855305580969; do
  grep -q "\"sourceRef\": \"$ref\"" <<<"$LOGS" || {
    echo "[AIONE][STOP] Expected 1688 sourceRef missing from acceptance result: $ref" >&2
    exit 26
  }
done

echo
printf '[AIONE] SELECTION BACKEND CLOSURE V1 ACCEPTANCE PASS\n'
printf 'Verified: CURRENT image + 3 real 1688 ProductOpportunity records + numbering + CNY + group + weight + ZIP evidence + no duplicate source identity.\n'
