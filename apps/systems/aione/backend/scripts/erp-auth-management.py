"""Dedicated encrypted auth management transport; never print credential plaintext."""
import os,json,sys,frappe
os.chdir('/home/frappe/frappe-bench/sites')
frappe.init(site=os.environ.get('MIWA_CONNECTOR_SITE','miwa-dev.localhost'),sites_path='/home/frappe/frappe-bench/sites');frappe.connect()
try:
    frappe.set_user('Administrator')
    from miwa_ai.employee_auth import COMMAND, PUBLIC_KEY
    data=json.load(sys.stdin)
    if data.get('publicKey'):
        frappe.cache().set_value(PUBLIC_KEY,data['publicKey'])
    for result in data.get('results',[]):
        if not frappe.db.exists(COMMAND,result['requestId']):continue
        command=frappe.get_doc(COMMAND,result['requestId'])
        if command.status=='Succeeded':continue
        command.db_set('status','Succeeded' if result.get('ok') else 'Failed')
        command.db_set('result',json.dumps({'ok':result.get('ok') is True,'message':str(result.get('message') or '')[:300]}))
    for status in data.get('statuses',[]):
        allowed={key:status.get(key) for key in ('password_set','must_change','activated_at','last_login_at','temporary_expires_at','googleBindings')}
        allowed['syncedAt']=str(frappe.utils.now_datetime())
        frappe.cache().set_value('aione-auth-status:'+status['person_id'],allowed)
    commands=[]
    for name in frappe.get_all(COMMAND,filters={'status':'Pending'},pluck='name',order_by='creation asc',limit_page_length=20):
        command=frappe.get_doc(COMMAND,name)
        commands.append(json.loads(command.payload))
    ids=frappe.get_all('Employee',filters={'custom_miwa_member_id':['!=','']},pluck='custom_miwa_member_id')
    frappe.db.commit()
    print(json.dumps({'commands':commands,'personIds':ids},ensure_ascii=False))
except Exception:
    frappe.db.rollback()
    # Suppress request payloads and library exceptions on the connector stderr channel.
    sys.stderr.write('ERP authentication management transport failed\n')
    sys.exit(1)
finally:frappe.destroy()
