"""Exercise the real candidate step with fake gcloud/curl; no cloud operations."""
import json,os,pathlib,subprocess,tempfile,yaml
root=pathlib.Path(__file__).resolve().parents[3]
config=yaml.safe_load((root/'infra/gcp/cloudbuild/deploy-current.yaml').read_text())
assert config['substitutions']['_AIONE_DEPLOY_MODE']=='release'
# Regression: preview must not invoke ANY of the three migration/preflight jobs.
for protected_id in ['automatic-current-migration','migration-gate','read-only-db-preflight']:
 protected=next(s for s in config['steps'] if s['id']==protected_id)
 assert 'AIONE_DEPLOY_MODE=${_AIONE_DEPLOY_MODE}' in protected['env']
 protected_script=protected['args'][-1].replace('$','
script=step['args'][-1].replace('$$','$').replace('${SHORT_SHA}','abcdef1').replace('${COMMIT_SHA}','a'*40)
assert '--no-traffic' in script and '--no-allow-unauthenticated' in script
with tempfile.TemporaryDirectory() as directory:
 d=pathlib.Path(directory);log=d/'calls';bin=d/'bin';bin.mkdir()
 mock='''#!/usr/bin/env python3
import json,os,sys
args=sys.argv[1:]
with open(os.environ['MOCK_LOG'],'a') as f:f.write(json.dumps(args)+'\\n')
if args[:3]==['run','services','describe']:
 if any('value(status.traffic' in a for a in args):print('current-old')
 else:print(json.dumps({'status':{'latestReadyRevisionName':'candidate-new','url':'https://current.example','traffic':[{'revisionName':'current-old','percent':100},{'revisionName':'candidate-new','tag':'candidate-abcdef1','url':'https://candidate.example'}]}}))
elif args[:3]==['sql','instances','describe']:print('miwa-aione:asia-northeast1:aione-pg-dev')
elif args[:2]==['auth','print-identity-token']:print('test-token')
'''
 (bin/'gcloud').write_text(mock);(bin/'curl').write_text('#!/bin/sh\nprintf \'{"ok":true,"database":"connected"}\\n\'\n')
 for p in bin.iterdir():p.chmod(0o755)
 for mode in ['preview','release','invalid']:
  log.write_text('');env={**os.environ,'PATH':str(bin)+os.pathsep+os.environ['PATH'],'MOCK_LOG':str(log),'AIONE_DEPLOY_MODE':mode}
  result=subprocess.run(['bash','-ceu',script],cwd=root,env=env,text=True,capture_output=True)
  calls=[json.loads(line) for line in log.read_text().splitlines()];cutovers=[c for c in calls if c[:3]==['run','services','update-traffic']]
  if mode=='preview':assert result.returncode==0 and not cutovers and 'PREVIEW PASS' in result.stdout,(result.stdout,result.stderr)
  elif mode=='release':assert result.returncode==0 and len(cutovers)==1,(result.stdout,result.stderr)
  else:assert result.returncode!=0 and not cutovers
print('PASS CURRENT pipeline: preview never cuts traffic, release still cuts over, invalid mode fails closed; IAM remains private')
)
 assert 'if [[ "$AIONE_DEPLOY_MODE" == "preview" ]]; then' in protected_script
 assert protected_script.index('exit 0') < protected_script.index('source infra/gcp/cloud-shell/CURRENT_BASELINE.sh')
 with tempfile.TemporaryDirectory() as guard_dir:
  env={**os.environ,'AIONE_DEPLOY_MODE':'preview','PATH':guard_dir}
  p=subprocess.run(['/bin/bash','-ceu',protected_script],cwd=root,env=env,text=True,capture_output=True)
  assert p.returncode==0 and 'skipping shared CURRENT DB migration' in p.stdout,(protected_id,p.stdout,p.stderr)

step=next(s for s in config['steps'] if s['id']=='candidate-deploy-health-cutover')
script=step['args'][-1].replace('$$','$').replace('${SHORT_SHA}','abcdef1').replace('${COMMIT_SHA}','a'*40)
assert '--no-traffic' in script and '--no-allow-unauthenticated' in script
with tempfile.TemporaryDirectory() as directory:
 d=pathlib.Path(directory);log=d/'calls';bin=d/'bin';bin.mkdir()
 mock='''#!/usr/bin/env python3
import json,os,sys
args=sys.argv[1:]
with open(os.environ['MOCK_LOG'],'a') as f:f.write(json.dumps(args)+'\\n')
if args[:3]==['run','services','describe']:
 if any('value(status.traffic' in a for a in args):print('current-old')
 else:print(json.dumps({'status':{'latestReadyRevisionName':'candidate-new','url':'https://current.example','traffic':[{'revisionName':'current-old','percent':100},{'revisionName':'candidate-new','tag':'candidate-abcdef1','url':'https://candidate.example'}]}}))
elif args[:3]==['sql','instances','describe']:print('miwa-aione:asia-northeast1:aione-pg-dev')
elif args[:2]==['auth','print-identity-token']:print('test-token')
'''
 (bin/'gcloud').write_text(mock);(bin/'curl').write_text('#!/bin/sh\nprintf \'{"ok":true,"database":"connected"}\\n\'\n')
 for p in bin.iterdir():p.chmod(0o755)
 for mode in ['preview','release','invalid']:
  log.write_text('');env={**os.environ,'PATH':str(bin)+os.pathsep+os.environ['PATH'],'MOCK_LOG':str(log),'AIONE_DEPLOY_MODE':mode}
  result=subprocess.run(['bash','-ceu',script],cwd=root,env=env,text=True,capture_output=True)
  calls=[json.loads(line) for line in log.read_text().splitlines()];cutovers=[c for c in calls if c[:3]==['run','services','update-traffic']]
  if mode=='preview':assert result.returncode==0 and not cutovers and 'PREVIEW PASS' in result.stdout,(result.stdout,result.stderr)
  elif mode=='release':assert result.returncode==0 and len(cutovers)==1,(result.stdout,result.stderr)
  else:assert result.returncode!=0 and not cutovers
print('PASS CURRENT pipeline: preview never cuts traffic, release still cuts over, invalid mode fails closed; IAM remains private')
