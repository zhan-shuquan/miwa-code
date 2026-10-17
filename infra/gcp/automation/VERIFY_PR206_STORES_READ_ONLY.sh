#!/usr/bin/env bash
# Read-only canonical store check against a previously deployed private candidate.
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"
source infra/gcp/cloud-shell/CURRENT_BASELINE.sh
assert_aione_current_baseline
: "${AIONE_PREVIEW_COMMIT:?Set the known deployed full commit SHA}"
[[ "$AIONE_PREVIEW_COMMIT" =~ ^[a-f0-9]{40}$ ]] || exit 64
tag="candidate-${AIONE_PREVIEW_COMMIT:0:7}"
service_json="$(gcloud run services describe "$AIONE_RUN_SERVICE" --project="$AIONE_PROJECT_ID" --region="$AIONE_REGION" --format=json)"
details="$(printf "%s" "$service_json" | python3 -c 'import json,sys
p=json.load(sys.stdin); s=p["status"]; v=[x for x in s["traffic"] if x.get("tag")==sys.argv[1]]
if len(v)!=1 or int(v[0].get("percent",0))!=0: raise SystemExit("[STOP] Private zero-traffic candidate not found")
print(s["url"]); print(v[0]["url"])' "$tag")"
service_url="$(printf "%s\n" "$details" | sed -n '1p')"
candidate_url="$(printf "%s\n" "$details" | sed -n '2p')"
token="$(gcloud auth print-identity-token --audiences="$service_url")"
body="$(mktemp)"
trap 'rm -f "$body"' EXIT
status="$(curl -sS --max-time 20 -o "$body" -w "%{http_code}" -H "Authorization: Bearer $token" "$candidate_url/api/v1/shared-parameters")"
if [[ "$status" == 401 || "$status" == 403 ]]; then echo "[BLOCK] Application authentication is required; no writes performed"; exit 31; fi
[[ "$status" == 200 ]] || { echo "[BLOCK] HTTP $status" >&2; exit 32; }
python3 - "$body" <<'PY'
import json,sys
try:
 p=json.load(open(sys.argv[1],encoding="utf-8"))
 assert p["storeCatalog"]["ready"] is True
 actual={s["code"]:s for s in p["stores"] if s.get("code") in ("NAGAI_GD","SHIAWASEYA","PRIMELIFE")}
 expected={"NAGAI_GD":"永井GD","SHIAWASEYA":"幸せ屋","PRIMELIFE":"PrimeLife"}
 assert len(actual)==3
 assert all(actual[k]["name"]==name for k,name in expected.items())
 assert all(s["status"]=="inactive" and s["platform_status"]=="inactive" and s["platform_code"]=="RAKUTEN" for s in actual.values())
except (KeyError,ValueError,TypeError,AssertionError) as exc:
 raise SystemExit("[BLOCK] Live API store contract failed: "+type(exc).__name__)
print("[AIONE] PASS: 3 inactive canonical stores returned via live private candidate API")
PY
