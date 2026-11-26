"""Compatibility entry: the additive schema belongs to miwa_ai, not AIONE."""
import os,json,frappe
os.chdir('/home/frappe/frappe-bench/sites')
frappe.init(site='miwa-dev.localhost',sites_path='/home/frappe/frappe-bench/sites');frappe.connect()
try:
    frappe.set_user('Administrator')
    from miwa_ai.employee_master import install
    install();frappe.db.commit()
    print(json.dumps({'installed':True,'site':'miwa-dev.localhost'}))
finally:frappe.destroy()
