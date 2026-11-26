"""Read-only employee projection for the locally authorized 8081 connector."""
import os,json,frappe
os.chdir('/home/frappe/frappe-bench/sites')
frappe.init(site='miwa-dev.localhost',sites_path='/home/frappe/frappe-bench/sites');frappe.connect()
try:
    frappe.set_user('Administrator')
    from miwa_ai.employee_master import directory
    print(json.dumps(directory(),ensure_ascii=False))
finally:
    frappe.db.rollback();frappe.destroy()
