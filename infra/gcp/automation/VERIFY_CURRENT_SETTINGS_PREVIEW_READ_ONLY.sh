#!/usr/bin/env bash
# Read-only verification after an authorized private candidate deployment.
# Never deploys, migrates, seeds stores, changes traffic, or writes app data.
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"
source infra/gcp/cloud-shell/CURRENT_BASELINE.sh
assert_aione_current_baseline
: "${AIONE_PREVIEW_COMMIT:?Set reviewed full candidate commit SHA}"
[[ "$AIONE_PREVIEW_COMMIT" =~ ^[a-f0-9]{40}$ ]] || { echo '[STOP] Invalid SHA' >&2; exit 64; }
tag="candidate-${AIONE_PREVIEW_COMMIT:0:7}"
data="$(gcloud run services describe "$AIONE_RUN_SERVICE" --project="$AIONE_PROJECT_ID" --region="$AIONE_REGION" --format=json)"
details="$(printf '%s' "$data" | python3 -c 'import json,sys
p=json.load(sys.stdin);t=sys.argv[1];s=p["status"];v=[x for x in s.get("traffic",[]) if x.get("tag")==t]
if len(v)!=1:raise SystemExit("[STOP] Candidate tag not found or ambiguous")
x=v[0]
if int(x.get("percent") or 0)!=0:raise SystemExit("[STOP] Candidate has non-zero traffic")
if sum(int(z.get("percent") or 0) for z in s.get("traffic",[]))!=100:raise SystemExit("[STOP] Active traffic allocation is not 100 percent")
if not x.get("url") or not s.get("url"):raise SystemExit("[STOP] Missing private candidate URL")
print(s["url"]);print(x["url"]);print(x.get("revisionName",""))' "$tag")"
service_url="$(printf '%s\n' "$details" | sed -n '1p')"
candidate_url="$(printf '%s\n' "$details" | sed -n '2p')"
candidate_revision="$(printf '%s\n' "$details" | sed -n '3p')"
token="$(gcloud auth print-identity-token --audiences="$service_url")"
health="$(curl --fail --silent --show-error --max-time 20 -H "Authorization: Bearer $token" "$candidate_url/health")"
printf '%s' "$health" | python3 -c 'import json,sys
p=json.load(sys.stdin)
if p.get("ok") is not True or p.get("database")!="connected":raise SystemExit("[STOP] Candidate health/database contract failed")
print("[AIONE] Candidate /health read-only PASS")'
printf '[AIONE] Candidate revision: %s\n' "$candidate_revision"
echo '[AIONE] Candidate tag has 0 percent traffic; this check made no database change.'
echo '[AIONE] Store-setting write acceptance remains BLOCKED until approved migration.'
