"""Local authenticated bridge; allocation implementation is versioned in miwa_ai."""
import os,sys,json,frappe
os.chdir('/home/frappe/frappe-bench/sites')
frappe.init(site=os.environ.get('MIWA_CONNECTOR_SITE','miwa-dev.localhost'),sites_path='/home/frappe/frappe-bench/sites');frappe.connect()
try:
    frappe.set_user('Administrator')
    from miwa_ai.selection_numbering import execute
    request=json.load(sys.stdin)
    print(json.dumps(execute(request['kind'],request['payload']),ensure_ascii=False))
finally:frappe.destroy()
