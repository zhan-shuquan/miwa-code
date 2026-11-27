"""Read-only export, run with the existing ERP bench Python; never calls save/hooks."""
import json, hashlib, datetime, os, inspect
import frappe

os.chdir('/home/frappe/frappe-bench/sites')
frappe.init(site=os.environ.get('MIWA_CONNECTOR_SITE','miwa-dev.localhost'), sites_path='/home/frappe/frappe-bench/sites')
frappe.connect()
try:
    frappe.set_user("Administrator")
    # Use the same live reference as ERP Setup > MIWA Business Parameters.
    # Its review drafts are intentionally not effective costing parameters.
    from miwa_ai.business_parameters_stage1 import reference
    business_parameters = reference()
    settings = business_parameters['cost']
    script = frappe.get_doc('Server Script', 'AIONE-统一成本定价-TEST')
    if script.disabled:
        raise RuntimeError('ERP cost script disabled')
    meta = frappe.get_meta('Item')
    from miwa_ai import product_names, folder_import, field_normalization
    identification='\n'.join(name+' = '+repr(getattr(product_names,name))
        for name in ('RULES','MATERIAL_KEYS','SHAPE_KEYS','MATERIALS') if hasattr(product_names,name))+'\n'
    identification+='\n'.join(inspect.getsource(getattr(product_names,name))
        for name in ('_negative_materials','_materials','_family','_descriptor','identify') if hasattr(product_names,name))
    identification+='\n'+inspect.getsource(folder_import.suggest_group)
    fields = [dict(id=f.fieldname, label=f.label, type=f.fieldtype, options=f.options,
                   default=f.default, required=bool(f.reqd)) for f in meta.fields
              if f.fieldname.startswith('custom_') or f.fieldname in
              ['item_code','item_name','item_group','brand','stock_uom','description']]
    catalog=[dict(code=r.item_code,url=r.get('custom_采购链接url')) for r in frappe.get_all('Item',fields=['item_code','custom_采购链接url'])]
    store_meta = frappe.get_meta('MIWA Platform Store')
    stores = frappe.get_all('MIWA Platform Store', fields=['name','platform'] +
        (['custom_selection_disabled'] if store_meta.has_field('custom_selection_disabled') else []))
    platforms = sorted({r.platform for r in stores if r.platform and not r.get('custom_selection_disabled')})
    snapshot = dict(catalog=catalog,schemaVersion=1, capturedAt=datetime.datetime.now(datetime.timezone.utc).isoformat(),
        verified=False, source=settings.get('source'), settings=settings, fields=fields,
        entryDefaults={'salesPlatform': frappe.db.get_single_value('MIWA Business Parameters', 'custom_selection_sales_platform')
                       if frappe.get_meta('MIWA Business Parameters').has_field('custom_selection_sales_platform') else None},
        rules=dict(source=script.script, sha256=hashlib.sha256(script.script.encode()).hexdigest(), modified=str(script.modified)),
        identification=dict(source=identification,sha256=hashlib.sha256(identification.encode()).hexdigest()),
        categories=frappe.get_all('Item Group',fields=['name','parent_item_group','is_group','custom_miwa_default_brand']),
        itemAttributes=[dict(frappe.get_doc('Item Attribute',name).as_dict(),
            aliases=list(field_normalization.AXES.get(name, ())))
            for name in frappe.get_all('Item Attribute',pluck='name')],
        brands=frappe.get_all('Brand',pluck='name'),
        platforms=platforms,
        platformPolicies={p: dict(verified=False, rate=settings.get('platform_rate'),
            source='美和业务参数 / ERP现有统一试算规则',
            warning='该平台正式交易费率待业务核实；当前使用ERP统一试算参数') for p in platforms},
        uoms=frappe.get_all('UOM',pluck='name'),
        exchange=business_parameters['exchange'],
        priceLists={name:frappe.get_doc('Price List',name).as_dict() for name in [settings.purchase_price_list,settings.unit_price_list]})
    from miwa_ai.sku_identity import master_rows
    snapshot['selectionChannels'] = frappe.get_all('MIWA Selection Channel',
        filters={'enabled':1}, fields=['channel_code','channel_name','channel_group','official_url','source_kind','icon_text','entry_note','sort_order'],
        order_by='sort_order asc, name asc') if frappe.db.exists('DocType','MIWA Selection Channel') else []
    snapshot['skuMaster'] = master_rows()
    print(json.dumps(snapshot, ensure_ascii=False, default=str))
finally:
    frappe.db.rollback()
    frappe.destroy()
