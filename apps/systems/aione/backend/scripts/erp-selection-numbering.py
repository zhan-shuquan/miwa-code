"""ERP-owned numbering; reads existing Items, persistent reservations and native series."""
import os,sys,json,re,frappe
from frappe.model.naming import getseries
os.chdir('/home/frappe/frappe-bench/sites')
frappe.init(site='miwa-dev.localhost',sites_path='/home/frappe/frappe-bench/sites');frappe.connect()
locked=False
try:
    request=json.load(sys.stdin);kind=request['kind'];p=request['payload']
    locked=bool(frappe.db.sql("SELECT GET_LOCK('miwa-aione-item-number',15)")[0][0])
    if not locked:raise ValueError('编号服务繁忙，请重试')
    if kind=='person_prefix':
        member=str(p['memberId']);prefix=str(p['prefix'])
        if not re.fullmatch(r'[A-Za-z0-9_-]{1,9}',prefix):raise ValueError('前缀应为ERP允许的1至9位英文、数字、下划线或横线')
        employee=frappe.get_doc('Employee',p['employeeId'])
        if employee.status!='Active':raise ValueError('只能配置在职人员')
        current=employee.get('custom_miwa_member_id')
        if current and current!=member:raise ValueError('该ERP人员已关联其他会员，请先核对人员档案')
        old_prefix=employee.get('custom_miwa_item_prefix')
        if old_prefix and old_prefix!=prefix and frappe.db.exists('MIWA Item Code Reservation',{'item_prefix':old_prefix}):
            raise ValueError('此前缀已有正式预留，不能直接更改；历史编号必须保留')
        employee.custom_miwa_member_id=member;employee.custom_miwa_item_prefix=prefix;employee.save(ignore_permissions=True)
        result={'memberId':member,'prefix':prefix,'employeeId':employee.name}
    elif kind=='formal_number':
        selection=p['selectionId'];member=p['memberId'];table='MIWA Item Code Reservation'
        old=frappe.db.get_value(table,{'selection_id':selection},['item_code','member_id'],as_dict=True)
        if old:result={'code':old.item_code,'memberId':old.member_id,'reused':True}
        else:
            employee=frappe.db.get_value('Employee',{'custom_miwa_member_id':member,'status':'Active'},['name','custom_miwa_item_prefix'],as_dict=True)
            if not employee or not employee.custom_miwa_item_prefix:raise ValueError('员工货号前缀尚未配置，请管理员在人才之家完善')
            prefix=employee.custom_miwa_item_prefix
            # A confirmed matching source may link an existing Item instead of creating another.
            source=str(p.get('sourceUrl') or '')
            existing=[]
            if source:
                offer=re.search(r'1688\.com/offer/(\d+)',source)
                if offer:
                    candidates=frappe.get_all('Item',filters={'custom_采购链接url':['like','%'+offer.group(1)+'%']},fields=['item_code','custom_采购链接url'])
                    existing=[r.item_code for r in candidates if re.search(r'1688\.com/offer/'+re.escape(offer.group(1))+r'(?:\D|$)',r.custom_采购链接url or '')]
                else:existing=frappe.get_all('Item',filters={'custom_采购链接url':source},pluck='item_code')
            if len(existing)>1:raise ValueError('ERP存在多个同源商品，请管理员核对，不自动合并')
            if existing:code=existing[0]
            else:
                codes=frappe.get_all('Item',filters={'item_code':['like',prefix+'%']},pluck='item_code')
                codes+=frappe.get_all(table,filters={'item_code':['like',prefix+'%']},pluck='item_code')
                codes+=p.get('existingCodes',[])
                pattern=re.compile(re.escape(prefix)+r'(\d+)',re.IGNORECASE)
                maximum=max([int(m.group(1)) for c in codes if (m:=pattern.fullmatch(c))] or [0])
                series='MIWA-ITEM-'+prefix+'-'
                frappe.db.sql('INSERT IGNORE INTO tabSeries (name,current) VALUES (%s,0)',(series,))
                frappe.db.sql('UPDATE tabSeries SET current=GREATEST(current,%s) WHERE name=%s',(maximum,series))
                code=prefix+getseries(series,3)
                if len(code)>12:raise ValueError('流水号超过ERP当前12位货号限制，请管理员核对规则')
            reserved=frappe.db.get_value(table,{'item_code':code},['selection_id','source_system'],as_dict=True)
            if reserved and reserved.source_system!='erp':raise ValueError('该正式货号已关联其他选品，请管理员核对')
            if not reserved:
                frappe.get_doc(dict(doctype=table,selection_id=selection,selection_no=p.get('selectionNo'),member_id=member,item_prefix=prefix,item_code=code,source_url=source,existing_item=bool(existing))).insert(ignore_permissions=True)
            result={'code':code,'memberId':member,'existingItem':bool(existing),'reused':False}
    else:raise ValueError('未知编号操作')
    frappe.db.commit();print(json.dumps({'status':'succeeded','result':result},ensure_ascii=False))
except Exception as e:
    frappe.db.rollback();print(json.dumps({'status':'failed','result':{'message':str(e),'retryable':isinstance(e,(frappe.DuplicateEntryError,frappe.UniqueValidationError))}},ensure_ascii=False))
finally:
    if locked:frappe.db.sql("SELECT RELEASE_LOCK('miwa-aione-item-number')")
    frappe.destroy()
