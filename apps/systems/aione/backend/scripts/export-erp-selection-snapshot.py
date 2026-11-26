"""Read-only export, run with the existing ERP bench Python; never calls save/hooks."""
import json, hashlib, datetime, os, inspect
import frappe

os.chdir('/home/frappe/frappe-bench/sites')
frappe.init(site='miwa-dev.localhost', sites_path='/home/frappe/frappe-bench/sites')
frappe.connect()
try:
    settings = frappe.get_single('AIONE Cost Settings').as_dict()
    script = frappe.get_doc('Server Script', 'AIONE-统一成本定价-TEST')
    if script.disabled:
        raise RuntimeError('ERP cost script disabled')
    meta = frappe.get_meta('Item')
    from miwa_ai import product_names, folder_import
    identification='RULES = '+repr(product_names.RULES)+'\n'+inspect.getsource(product_names.identify)+'\n'+inspect.getsource(folder_import.suggest_group)
    fields = [dict(id=f.fieldname, label=f.label, type=f.fieldtype, options=f.options,
                   default=f.default, required=bool(f.reqd)) for f in meta.fields
              if f.fieldname.startswith('custom_') or f.fieldname in
              ['item_code','item_name','item_group','brand','stock_uom','description']]
    person_fields=['name','employee_name','employee_number']
    configured=frappe.get_meta('Employee').has_field('custom_miwa_member_id')
    if configured:person_fields+=['custom_miwa_member_id','custom_miwa_item_prefix']
    employees=frappe.get_all('Employee',filters={'status':'Active'},fields=person_fields)
    people=[dict(employeeId=r.name,name=r.employee_name,memberId=r.get('custom_miwa_member_id'),prefix=r.get('custom_miwa_item_prefix')) for r in employees]
    catalog=[dict(code=r.item_code,url=r.get('custom_采购链接url')) for r in frappe.get_all('Item',fields=['item_code','custom_采购链接url'])]
    snapshot = dict(personPrefixes=people,catalog=catalog,schemaVersion=1, capturedAt=datetime.datetime.now(datetime.timezone.utc).isoformat(),
        verified=False, source=settings.get('source'), settings=settings, fields=fields,
        rules=dict(source=script.script, sha256=hashlib.sha256(script.script.encode()).hexdigest(), modified=str(script.modified)),
        identification=dict(source=identification,sha256=hashlib.sha256(identification.encode()).hexdigest()),
        categories=frappe.get_all('Item Group',fields=['name','parent_item_group','is_group','custom_miwa_default_brand']),
        brands=frappe.get_all('Brand',pluck='name'),
        platforms=sorted(set((frappe.get_meta('MIWA Platform Store').get_field('platform').options or '').splitlines()) | set(frappe.get_all('MIWA Platform Store',pluck='platform'))),
        uoms=frappe.get_all('UOM',pluck='name'),
        exchange=frappe.get_all('Currency Exchange',filters={'from_currency':'CNY','to_currency':'JPY','date':['<=',frappe.utils.nowdate()]},fields=['exchange_rate','date'],order_by='date desc',limit_page_length=1),
        priceLists={name:frappe.get_doc('Price List',name).as_dict() for name in [settings.purchase_price_list,settings.unit_price_list]})
    print(json.dumps(snapshot, ensure_ascii=False, default=str))
finally:
    frappe.db.rollback()
    frappe.destroy()
