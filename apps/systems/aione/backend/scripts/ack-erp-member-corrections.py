"""Acknowledgements from the authenticated existing outbound employee sync only."""
import os,sys,json,frappe
os.chdir('/home/frappe/frappe-bench/sites')
frappe.init(site=os.environ.get('MIWA_CONNECTOR_SITE','miwa-dev.localhost'),sites_path='/home/frappe/frappe-bench/sites');frappe.connect()
try:
    frappe.set_user('Administrator')
    from miwa_ai.member_correction import acknowledge
    acknowledge(json.load(sys.stdin))
    frappe.db.commit()
    print(json.dumps({'ok':True}))
except Exception:
    frappe.db.rollback()
    raise
finally:
    frappe.destroy()
