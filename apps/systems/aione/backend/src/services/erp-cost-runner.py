"""Isolated, read-only ERP rule host. No Frappe/database/network access from rules.

The reviewed rule hash is pinned at deployment. Updated ERP rules require review;
parameter updates alone never grant permission to execute downloaded source.
"""
import json, os, hashlib, datetime, re
from http.server import BaseHTTPRequestHandler, HTTPServer
from types import SimpleNamespace

class Record(dict):
    def __getattr__(self, key): return self.get(key)
    def set(self, key, value): self[key] = value

def record(value):
    if isinstance(value, dict): return Record({k:record(v) for k,v in value.items()})
    if isinstance(value, list): return [record(v) for v in value]
    return value

def calculate(snapshot, values):
    source = snapshot['rules']['source']
    digest = hashlib.sha256(source.encode()).hexdigest()
    if digest != os.environ['ERP_REVIEWED_RULE_SHA256']:
        raise ValueError('ERP rule version requires review')
    data = record(values)
    data.setdefault('stock_uom', ''); data.setdefault('name', '__aione_unsaved__')
    data.setdefault('variant_of', None); data.setdefault('has_variants', False)
    today = datetime.date.today().isoformat()
    def get_doc(doctype, name=None):
        if doctype == 'AIONE Cost Settings': return record(snapshot['settings'])
        if doctype == 'Price List': return record(snapshot['priceLists'][name])
        raise ValueError('Unresolved ERP dependency: ' + doctype)
    def get_all(doctype, **kwargs):
        if doctype == 'Currency Exchange':
            return record([r for r in snapshot['exchange'] if str(r['date']) <= today][:1])
        # New selection inputs have no ERP Item identity; purchase price is explicit.
        if doctype == 'Item Price': return []
        raise ValueError('Unresolved ERP dependency: ' + doctype)
    def field(name):
        return record(next(f for f in snapshot['fields'] if f['id']==name))
    frappe = SimpleNamespace(get_doc=get_doc, get_all=get_all,
        get_meta=lambda _:SimpleNamespace(get_field=field),
        utils=SimpleNamespace(nowdate=lambda:today,now_datetime=lambda:datetime.datetime.now(datetime.timezone.utc).isoformat()))
    safe = {k:__builtins__[k] if isinstance(__builtins__,dict) else getattr(__builtins__,k)
            for k in ['float','int','str','bool','range','max','min','sum','len','any']}
    scope = {'frappe':frappe,'doc':data,'__builtins__':safe}
    exec(compile(source, 'reviewed-erp-cost-script', 'exec'), scope, scope)
    status = data.get('custom_aione_status','')
    return dict(status='incomplete' if status.startswith('待核算') else 'estimated',
        message=status, results={k:v for k,v in data.items() if k.startswith('custom_')},
        breakdown={k:scope.get(k) for k in ['purchase_jpy','cn_domestic','duty']},
        ruleVersion=digest, parameterVersion=snapshot['version'], verified=False)

class Handler(BaseHTTPRequestHandler):
    def do_POST(self):
        try:
            if self.path not in ['/calculate','/identify']: raise ValueError('Unknown endpoint')
            length=int(self.headers.get('Content-Length','0'))
            if length>2000000: raise ValueError('Payload too large')
            body=json.loads(self.rfile.read(length))
            if self.path=='/calculate':
                result=calculate(body['snapshot'],body['values'])
            else:
                source=body['snapshot']['identification']['source']
                if hashlib.sha256(source.encode()).hexdigest()!=os.environ['ERP_REVIEWED_IDENTIFICATION_SHA256']:raise ValueError('Identification rule requires review')
                scope={'re':re,'__builtins__':{'str':str,'dict':dict,'any':any,'len':len}}
                exec(compile(source,'reviewed-erp-identification','exec'),scope,scope)
                title=str(body.get('title',''))[:2000]
                result=dict(category=scope['suggest_group'](title),shortName=scope['identify'](title))
            payload=json.dumps(result,ensure_ascii=False).encode()
            self.send_response(200)
        except Exception as error:
            payload=json.dumps({'error':str(error)}).encode(); self.send_response(422)
        self.send_header('Content-Type','application/json');self.end_headers();self.wfile.write(payload)
    def log_message(self,*args): pass

if __name__=='__main__': HTTPServer(('0.0.0.0',8755),Handler).serve_forever()
