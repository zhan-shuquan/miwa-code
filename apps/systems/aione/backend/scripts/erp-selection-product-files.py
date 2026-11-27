"""Authenticated local bridge to ERP-owned product directory configuration."""
import os, sys, json, frappe
os.chdir('/home/frappe/frappe-bench/sites')
frappe.init(site=os.environ['MIWA_CONNECTOR_SITE'], sites_path='/home/frappe/frappe-bench/sites')
frappe.connect()
try:
    frappe.set_user('Administrator')
    from miwa_ai.selection_product_files import prepare, acknowledge
    request = json.load(sys.stdin)
    result = acknowledge(request['payload'],request['result']) if request.get('action') == 'acknowledge' else prepare(request['payload'])
    print(json.dumps({'status':'succeeded','result':result}, ensure_ascii=False))
except Exception as error:
    frappe.db.rollback()
    print(json.dumps({'status':'failed','result':{'message':str(error)}}, ensure_ascii=False))
finally:
    frappe.destroy()
