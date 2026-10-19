"""Mocked acceptance of the read-only CURRENT candidate verifier. No GCP/network calls."""
import json
import os
from pathlib import Path
import subprocess
import tempfile

ROOT = Path(__file__).resolve().parents[3]
VERIFY = ROOT / "infra/gcp/automation/VERIFY_CURRENT_SETTINGS_PREVIEW_READ_ONLY.sh"
SHA = "a" * 40
TAG = "candidate-" + SHA[:7]

def service(candidate_percent=0, include_tag=True):
    traffic = [{"revisionName":"current-healthy","percent":100-candidate_percent}]
    if include_tag:
        traffic.append({"revisionName":"candidate-private","tag":TAG,"percent":candidate_percent,"url":"https://candidate.example"})
    return {"status":{"url":"https://current.example","traffic":traffic}}

with tempfile.TemporaryDirectory() as temp:
    d = Path(temp)
    bindir = d / "bin"
    bindir.mkdir()
    log = d / "calls.jsonl"
    gcloud = bindir / "gcloud"
    gcloud.write_text("""#!/usr/bin/env python3
import json,os,sys
args=sys.argv[1:]
with open(os.environ["MOCK_LOG"],"a") as f: f.write(json.dumps(["gcloud",*args])+"\\n")
if args[:3]==["run","services","describe"]:
 print(os.environ["MOCK_SERVICE"])
elif args[:2]==["auth","print-identity-token"]:
 print("mock-identity-token")
else:
 raise SystemExit("Forbidden gcloud invocation: "+str(args))
""")
    curl = bindir / "curl"
    curl.write_text("""#!/usr/bin/env python3
import json,os,sys
args=sys.argv[1:]
with open(os.environ["MOCK_LOG"],"a") as f: f.write(json.dumps(["curl",*args])+"\\n")
if not any(a=="https://candidate.example/health" for a in args):
 raise SystemExit("Unexpected curl endpoint")
print(os.environ["MOCK_HEALTH"])
""")
    gcloud.chmod(0o755)
    curl.chmod(0o755)

    def run(payload, health, sha=SHA):
        log.write_text("")
        env = {**os.environ,
               "PATH":str(bindir)+os.pathsep+os.environ["PATH"],
               "MOCK_LOG":str(log),
               "MOCK_SERVICE":json.dumps(payload),
               "MOCK_HEALTH":json.dumps(health),
               "AIONE_PREVIEW_COMMIT":sha}
        result=subprocess.run(["bash",str(VERIFY)],cwd=ROOT,env=env,capture_output=True,text=True)
        calls=[json.loads(line) for line in log.read_text().splitlines()]
        for call in calls:
            assert call[0] in ("gcloud","curl"), call
            if call[0]=="gcloud":
                assert call[1:4]==["run","services","describe"] or call[1:3]==["auth","print-identity-token"],call
        return result,calls

    good={"ok":True,"database":"connected"}
    result,calls=run(service(),good)
    assert result.returncode==0,(result.stdout,result.stderr)
    assert "read-only PASS" in result.stdout and "0 percent traffic" in result.stdout
    assert len(calls)==3,calls
    for ready,expected in [(True,"counters schema read-only PASS"),(False,"[BLOCK] New product/SKU numbering requires reviewed 0111 migration")]:
        result,calls=run(service(),{**good,"businessNumberCountersReady":ready})
        assert result.returncode==0 and expected in result.stdout,(result.stdout,result.stderr)
        assert len(calls)==3,calls

    for bad_service,bad_health,label in [
        (service(candidate_percent=1),good,"candidate has live traffic"),
        (service(include_tag=False),good,"candidate tag missing"),
        (service(),{"ok":False,"database":"connected"},"health failed"),
        (service(),{"ok":True,"database":"disconnected"},"database failed")
    ]:
        result,calls=run(bad_service,bad_health)
        assert result.returncode!=0,(label,result.stdout,result.stderr)
        assert not any("update-traffic" in " ".join(map(str,c)) for c in calls)
    result,calls=run(service(),good,sha="invalid")
    assert result.returncode!=0 and not calls
print("PASS read-only candidate verification: healthy/zero traffic accepted; unsafe or unhealthy candidate rejected")
