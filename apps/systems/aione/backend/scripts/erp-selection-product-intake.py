"""Local bridge only; formal implementation is versioned in miwa_ai."""
import os, sys, json, frappe
os.chdir('/home/frappe/frappe-bench/sites')
frappe.init(site=os.environ['MIWA_CONNECTOR_SITE'], sites_path='/home/frappe/frappe-bench/sites')
frappe.connect()
try:
    frappe.set_user('Administrator')
    from miwa_ai.selection_product_intake import receive
    result = receive(json.load(sys.stdin))
    print(json.dumps({'status':'succeeded','result':result}, ensure_ascii=False))
except Exception as error:
    frappe.db.rollback()
    print(json.dumps({'status':'failed','result':{'message':str(error)}}, ensure_ascii=False))
finally:
    frappe.destroy()
