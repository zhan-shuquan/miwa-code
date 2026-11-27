"""Read-only ERP parser acceptance, never runs folder watchers or imports Items."""
import sys,json,zipfile,io,tempfile,pathlib,os
import frappe
os.chdir('/home/frappe/frappe-bench/sites')
frappe.init(site='miwa-dev.localhost',sites_path='/home/frappe/frappe-bench/sites');frappe.connect()
try:
    from miwa_ai.autodesign import materials
    from miwa_ai import product_source,excel_permission
    content=sys.stdin.buffer.read()
    with tempfile.TemporaryDirectory(prefix='aione-package-check-') as directory:
        root=pathlib.Path(directory)
        with zipfile.ZipFile(io.BytesIO(content)) as archive:
            for entry in archive.infolist():
                target=(root/entry.filename).resolve()
                if not target.is_relative_to(root.resolve()):raise ValueError('Unsafe ZIP path')
            archive.extractall(root)
        folder=next(p for p in root.iterdir() if p.is_dir());code=folder.name
        parsed=materials.read(folder,code)
        facts=product_source.facts(folder,code,parsed)
        permission=excel_permission.read(folder,code)
        assert len(parsed['skus'])==2, parsed
        assert facts['data']['商品标题'], facts
        assert permission['authorized'] is False, permission
        print(json.dumps({'passed':3,'skuCount':len(parsed['skus']),'sourceTitleRead':True,'publishingAuthorized':False},ensure_ascii=False))
finally:
    frappe.db.rollback();frappe.destroy()
