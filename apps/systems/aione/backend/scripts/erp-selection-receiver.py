"""8081 test receiver over local stdin. Preserves the ERP network isolation."""
import os,sys,json,hashlib,pathlib,base64
import frappe
os.chdir('/home/frappe/frappe-bench/sites')
frappe.init(site='miwa-dev.localhost',sites_path='/home/frappe/frappe-bench/sites');frappe.connect()
try:
    request=json.load(sys.stdin);payload=request['payload']
    if payload.get('testOnly') is not True or payload.get('allowPublish') is not False or payload.get('allowPaidAI') is not False:
        raise ValueError('Only isolated test receipts permitted')
    root=pathlib.Path(frappe.get_site_path('private','aione-selection-test-inbox'))
    key=hashlib.sha256((payload['selectionId']+':'+str(payload['version'])).encode()).hexdigest()
    folder=root/key;receipt=folder/'receipt.json'
    if receipt.exists():
        result=json.loads(receipt.read_text(encoding='utf8'))['result']
    else:
        values={k:v for k,v in payload['data'].items() if k.startswith('custom_') or k in ['item_code','item_name','stock_uom','item_group','brand']}
        values.update(doctype='Item',name='__aione_unsaved__',variant_of=None,has_variants=0)
        doc=frappe.get_doc(values)
        rule=frappe.get_doc('Server Script','AIONE-统一成本定价-TEST')
        if rule.disabled or hashlib.sha256(rule.script.encode()).hexdigest()!=payload['pricing']['ruleVersion']:raise ValueError('Rule version conflict')
        rule.execute_doc(doc)
        if str(doc.get('custom_aione_status') or '').startswith('待核算'):raise ValueError(doc.custom_aione_status)
        compare=['custom_到日本仓成本','custom_运营后毛利润','custom_目标毛利率达标售价','custom_运营后保本售价']
        if any(doc.get(k)!=payload['pricing']['results'].get(k) for k in compare):raise ValueError('ERP cost differs from confirmed selection')
        folder.mkdir(parents=True,exist_ok=True)
        for asset in request.get('assets',[]):
            content=base64.b64decode(asset['base64'],validate=True)
            if hashlib.sha256(content).hexdigest()!=asset['sha256']:raise ValueError('Attachment checksum mismatch')
            safe=hashlib.sha256(asset['id'].encode()).hexdigest()
            (folder/safe).write_bytes(content)
        result={'stage':'test_received','message':'8081 ERP已接收隔离测试资料，原生规则重算一致；未建正式商品、未美工、未上架','ruleChecked':True,'attachmentCount':len(request.get('assets',[])),'published':False,'paidAI':False}
        tmp=folder/'receipt.tmp';tmp.write_text(json.dumps({'payload':payload,'result':result},ensure_ascii=False),encoding='utf8');tmp.replace(receipt)
    print(json.dumps({'status':'succeeded','result':result},ensure_ascii=False))
except Exception as error:
    print(json.dumps({'status':'failed','result':{'message':str(error),'published':False,'paidAI':False}},ensure_ascii=False))
finally:
    frappe.db.rollback();frappe.destroy()
