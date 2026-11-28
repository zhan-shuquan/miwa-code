import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {generateKeyPairSync} from 'node:crypto';
import {createAdminEnvelope} from '../src/auth/admin-envelope.js';
const source=await readFile(new URL('../../../../../docs/employee-auth-erp/employee_auth.py',import.meta.url),'utf8');
const keys=generateKeyPairSync('rsa',{modulusLength:3072,privateKeyEncoding:{type:'pkcs8',format:'pem'},publicKeyEncoding:{type:'spki',format:'pem'}});
const codec=createAdminEnvelope(keys.privateKey);
const fixture={source,publicPem:codec.publicPem,keyId:codec.keyId};
const python=`import sys,json,types,base64
v=json.loads(base64.b64decode('${Buffer.from(JSON.stringify(fixture)).toString('base64')}'))
# Isolated mock only: never initialize a Frappe site/database.
f=types.ModuleType('frappe');sys.modules['frappe']=f
class Denied(Exception): pass
def fail(message,*args): raise Denied(message)
f.throw=fail;f.PermissionError=Denied;f.whitelist=lambda:lambda fn:fn
f.session=types.SimpleNamespace(user='ordinary');f.get_roles=lambda:[]
f.flags=types.SimpleNamespace(aione_account_admin=False)
f.db=types.SimpleNamespace(sql=lambda *a:None)
f.get_all=lambda *a,**k:[]
class Doc(dict):
  name='TEST'; custom_miwa_member_id='test-only'
  def get_doc_before_save(self):return getattr(self,'old',None)
  def set(self,k,val):self[k]=val
  def check_permission(self,*a):pass
doc=Doc(custom_miwa_member_id='test-only',status='Active',personal_email='test@example.invalid',prefered_contact_email='Personal Email')
f.get_doc=lambda *a:doc
f.cache=lambda:types.SimpleNamespace(get_value=lambda key:dict(publicPem=v['publicPem'],keyId=v['keyId']))
m=types.ModuleType('isolated_erp_auth');exec(compile(v['source'],'employee_auth.py','exec'),m.__dict__)
def denied(fn):
  try:fn()
  except Denied:return
  raise AssertionError('Unauthorized action allowed')
denied(lambda:m.require_admin('TEST'))
f.get_roles=lambda:['System Manager'];assert m.require_admin('TEST') is doc
f.session.user='Guest';denied(lambda:m.require_admin('TEST'));f.session.user='admin'
assert m.email_of(doc)=='test@example.invalid';assert not m.verified_email(doc)
doc[m.VERIFIED]=m.hashlib.sha256(b'test@example.invalid').hexdigest();assert m.verified_email(doc)
doc.old=Doc(doc);doc['personal_email']='changed@example.invalid';m.validate(doc);assert doc[m.VERIFIED] is None
doc.old=Doc(doc);doc[m.ENABLED]=1;denied(lambda:m.validate(doc))
f.flags.aione_account_admin=True;m.validate(doc)
f.get_all=lambda *a,**k:[dict(personal_email='changed@example.invalid',prefered_contact_email='Personal Email')]
denied(lambda:m.validate(doc))
request,envelope=m.seal(doc,'reset-password',dict(temporaryPassword='Cross language isolated password'))
print(json.dumps(dict(request=request,envelope=envelope,checks=8)))
`;
const docker='C:/Users/美和商会/AppData/Local/Programs/DockerDesktop/resources/bin/docker.exe';
const result=spawnSync(docker,['exec','-i','miwa-erp-dev-backend-1','/home/frappe/frappe-bench/env/bin/python','-'],{input:python,encoding:'utf8',timeout:30000});
assert.equal(result.status,0,result.stderr);
const output=JSON.parse(result.stdout);
assert.deepEqual(codec.decrypt(output.envelope,output.request),{personId:'test-only',action:'reset-password',temporaryPassword:'Cross language isolated password'});
console.log('PASS ERP mocked administrator/guest/field protections, email uniqueness/verification reset, Python AES-GCM + RSA-OAEP to Node decryption; no ERP database initialized');
