"""Install additive selection numbering contracts on the explicitly selected DEV site."""
import os,json,frappe
from frappe.custom.doctype.custom_field.custom_field import create_custom_fields
os.chdir('/home/frappe/frappe-bench/sites')
frappe.init(site='miwa-dev.localhost',sites_path='/home/frappe/frappe-bench/sites');frappe.connect()
try:
    create_custom_fields({
      'Employee':[
        dict(fieldname='custom_miwa_member_id',label='美和会员号',fieldtype='Data',unique=1,permlevel=9,insert_after='employee_number'),
        dict(fieldname='custom_miwa_item_prefix',label='员工货号前缀',fieldtype='Data',unique=1,permlevel=9,insert_after='custom_miwa_member_id')],
      'Item':[dict(fieldname='custom_miwa_selection_id',label='AIONE选品记录',fieldtype='Data',read_only=1,insert_after='item_code')]
    },update=True)
    # Dedicated permission level: never broaden an existing employee field group.
    conflicts=frappe.get_all('Custom DocPerm',filters={'parent':'Employee','permlevel':9,'role':['!=','System Manager']},pluck='role')
    if conflicts:raise ValueError('Employee permission level 9 already belongs to other roles; review required')
    from frappe.permissions import add_permission,update_permission_property
    add_permission('Employee','System Manager',9)
    update_permission_property('Employee','System Manager',9,'read',1)
    update_permission_property('Employee','System Manager',9,'write',1)
    name='MIWA Item Code Reservation'
    if not frappe.db.exists('DocType',name):
        frappe.get_doc(dict(doctype='DocType',name=name,module='Custom',custom=1,autoname='field:selection_id',track_changes=1,
          fields=[dict(fieldname='selection_id',label='选品记录',fieldtype='Data',reqd=1,unique=1),
                  dict(fieldname='selection_no',label='选品货号',fieldtype='Data'),
                  dict(fieldname='member_id',label='会员号',fieldtype='Data',reqd=1),
                  dict(fieldname='item_prefix',label='货号前缀',fieldtype='Data'),
                  dict(fieldname='item_code',label='正式商品货号',fieldtype='Data',unique=1,reqd=1),
                  dict(fieldname='source_url',label='采购来源',fieldtype='Small Text'),
                  dict(fieldname='existing_item',label='关联已存在商品',fieldtype='Check',default=0)],
          permissions=[dict(role='System Manager',read=1,write=1,create=1,delete=0,report=1,export=1)])).insert(ignore_permissions=True)
    reservation_type=frappe.get_doc('DocType',name)
    for field in reservation_type.fields:
        if field.fieldname=='member_id':field.reqd=0
    if not any(field.fieldname=='source_system' for field in reservation_type.fields):
        reservation_type.append('fields',dict(fieldname='source_system',label='编号来源',fieldtype='Data',default='aione'))
    reservation_type.allow_rename=0
    for permission in reservation_type.permissions:
        permission.write=0;permission.create=0;permission.delete=0
    reservation_type.save(ignore_permissions=True)
    name='MIWA-选品货号预留保护'
    script="""reservation = frappe.db.get_value('MIWA Item Code Reservation', {'item_code': doc.item_code}, ['selection_id'], as_dict=True)
if reservation and doc.get('custom_miwa_selection_id') != reservation.selection_id:
    frappe.throw('此货号已为选品记录预留，请从对应选品记录建档，不能重复占用。')
if not reservation:
    if doc.get('custom_miwa_selection_id'):
        frappe.throw('选品货号尚未完成正式预留，请先完成编号申请。')
    # Native Item creation competes for the same UNIQUE item_code in this transaction.
    # No employee mapping is guessed for a manually entered code.
    frappe.get_doc({'doctype':'MIWA Item Code Reservation',
        'selection_id':'erp-item:'+doc.item_code,'item_code':doc.item_code,
        'source_system':'erp','existing_item':1}).insert(ignore_permissions=True)
"""
    script="if doc.is_new():\n"+"\n".join("    "+line for line in script.splitlines())
    if not frappe.db.exists('Server Script',name):
        frappe.get_doc(dict(doctype='Server Script',name=name,script_type='DocType Event',reference_doctype='Item',doctype_event='Before Save',script=script,disabled=0)).insert(ignore_permissions=True)
    else:
        existing_script=frappe.get_doc('Server Script',name)
        existing_script.script=script
        existing_script.doctype_event='Before Save'
        existing_script.save(ignore_permissions=True)
    frappe.db.commit()
    print(json.dumps({'installed':True,'site':'miwa-dev.localhost','existingItemsChanged':False}))
finally:frappe.destroy()
