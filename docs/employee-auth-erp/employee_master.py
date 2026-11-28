"""ERP Employee is the only employee master. AIONE consumes this allowlisted projection."""
import hashlib
import json
import base64
from io import BytesIO
import frappe

MEMBER_FIELD = 'custom_miwa_member_id'
PREFIX_FIELD = 'custom_miwa_item_prefix'
FIELDS = {'employeeId':'name','memberId':MEMBER_FIELD,'name':'employee_name',
          'avatar':'image','company':'company','branch':'branch','department':'department',
          'designation':'designation','employmentType':'employment_type','grade':'grade',
          'status':'status','prefix':PREFIX_FIELD,'updatedAt':'modified'}

def require_directory_access():
    if frappe.session.user == 'Guest':
        frappe.throw('Authentication required', frappe.AuthenticationError)
    if 'System Manager' not in frappe.get_roles() or not frappe.has_permission('Employee','read'):
        frappe.throw('Employee directory requires System Manager', frappe.PermissionError)

def employee_avatar(value):
    """Cache only the employee's existing local portrait, never fetch external URLs."""
    if not value or not value.startswith(('/files/', '/private/files/')):
        return None
    file_name=frappe.db.get_value('File',{'file_url':value},'name')
    if not file_name:return None
    file=frappe.get_doc('File',file_name)
    if (file.file_size or 0)>20*1024*1024:return None
    try:
        from PIL import Image, ImageOps
        with Image.open(BytesIO(file.get_content())) as original:
            portrait=ImageOps.exif_transpose(original).convert('RGB')
            portrait.thumbnail((256,256))
            out=BytesIO();portrait.save(out,format='JPEG',quality=80)
            return 'data:image/jpeg;base64,'+base64.b64encode(out.getvalue()).decode()
    except (OSError,ValueError):
        return None

def projection(row):
    result={key:row.get(field) for key,field in FIELDS.items()}
    result['avatar']=employee_avatar(result['avatar'])
    result['updatedAt']=str(result['updatedAt'])
    result['version']=hashlib.sha256(json.dumps(result,sort_keys=True,default=str).encode()).hexdigest()
    return result

@frappe.whitelist()
def directory():
    """Privileged integration endpoint; no payroll, IDs, contacts or bank details."""
    require_directory_access()
    meta=frappe.get_meta('Employee')
    rows=frappe.get_all('Employee',fields=[f for f in FIELDS.values() if meta.has_field(f) or f in ('name','modified')],order_by='name')
    items=[projection(row) for row in rows]
    for item in items:
        item['businessPermissions']=business_permissions(item['employeeId'])
        from miwa_ai.employee_auth import projection as auth_projection
        auth=auth_projection(frappe.get_doc('Employee',item['employeeId']))
        item.update(auth)
        item['loginEmails']=[auth['loginEmail']] if auth['loginEmailVerified'] else []
        item['version']=hashlib.sha256(json.dumps(item,sort_keys=True,default=str).encode()).hexdigest()
    return {'schemaVersion':1,'identitySchemaVersion':1,'authSchemaVersion':1,'permissionsSchemaVersion':1,'memberCorrections':__import__('miwa_ai.member_correction',fromlist=['outgoing']).outgoing(),'employees':items,'capturedAt':frappe.utils.now_datetime().isoformat(),
            'version':hashlib.sha256(json.dumps(items,sort_keys=True,default=str).encode()).hexdigest()}

@frappe.whitelist()
def profile(member_id=None):
    if frappe.session.user == 'Guest':
        frappe.throw('Authentication required',frappe.AuthenticationError)
    if 'System Manager' in frappe.get_roles():
        require_directory_access()
        filters={MEMBER_FIELD:str(member_id)} if member_id else {'user_id':frappe.session.user}
    else:
        filters={'user_id':frappe.session.user}
    rows=frappe.get_all('Employee',filters=filters,fields=list(FIELDS.values()),limit_page_length=2)
    if len(rows)!=1 or (member_id and rows[0].get(MEMBER_FIELD)!=str(member_id)):
        frappe.throw('Employee profile unavailable for this identity',frappe.PermissionError)
    return projection(rows[0])

def validate_identity(doc, method=None):
    """Keep identity links stable; explicit member/prefix values only, no inference."""
    for field in (MEMBER_FIELD,PREFIX_FIELD):
        value=(doc.get(field) or '').strip()
        doc.set(field,value or None)
        if value and frappe.db.exists('Employee',{field:value,'name':['!=',doc.name]}):
            frappe.throw('美和会员号及员工货号前缀必须唯一')
    from miwa_ai.member_correction import validate_employee
    validate_employee(doc)
    from miwa_ai.employee_auth import validate as validate_auth
    validate_auth(doc, method)
    previous=doc.get_doc_before_save()
    if (previous and previous.get(ROLE_PROFILE_FIELD)!=doc.get(ROLE_PROFILE_FIELD)) or (not previous and doc.get(ROLE_PROFILE_FIELD)):
        if 'System Manager' not in frappe.get_roles():
            frappe.throw('仅系统管理员可调整AIONE业务角色配置',frappe.PermissionError)
    if previous and previous.get(MEMBER_FIELD) and previous.get(MEMBER_FIELD)!=doc.get(MEMBER_FIELD):
        frappe.throw('已建立的美和会员号属于稳定业务身份；请使用经过审核的身份纠错流程，不能直接替换。')
    if previous and previous.get(PREFIX_FIELD)!=doc.get(PREFIX_FIELD) and previous.get(PREFIX_FIELD):
        if frappe.db.exists('DocType','MIWA Item Code Reservation') and frappe.db.exists('MIWA Item Code Reservation',{'member_id':previous.get(MEMBER_FIELD)}):
            frappe.throw('该员工已有正式货号预留；修改前缀需先审核历史编号，不影响已生成货号。')

def install():
    """Idempotent additive migration; never populate or infer real identity values."""
    from miwa_ai.selection_numbering_schema import install as install_numbering
    install_numbering()
    install_business_permissions()
    from miwa_ai.member_correction import install as install_corrections
    install_corrections()

# Reuse native Role Profile / Has Role; these roles do not grant ERP Desk access.
ROLE_PROFILE_FIELD = 'custom_miwa_aione_role_profile'
BUSINESS_ROLES = {
    'research': 'AIONE-选品研究',
    'collect': 'AIONE-选品收集',
    'assign': 'AIONE-选品分配',
    'manage': 'AIONE-选品管理全部',
    'manageGrants': 'AIONE-选品授权管理',
}

def business_permissions(employee_id):
    meta=frappe.get_meta('Employee')
    profile=frappe.db.get_value('Employee',employee_id,ROLE_PROFILE_FIELD) if meta.has_field(ROLE_PROFILE_FIELD) else None
    if not profile:
        return None
    roles={r.role for r in frappe.get_doc('Role Profile',profile).roles}
    enabled=set(frappe.get_all('Role',filters={'name':['in',list(roles)],'disabled':0},pluck='name')) if roles else set()
    return {key:role in enabled for key,role in BUSINESS_ROLES.items()}

def install_business_permissions():
    """Additive employee-only setup. No employee assignments or product changes."""
    from frappe.custom.doctype.custom_field.custom_field import create_custom_fields
    for name in BUSINESS_ROLES.values():
        if not frappe.db.exists('Role',name):
            frappe.get_doc({'doctype':'Role','role_name':name,'desk_access':0,'is_custom':1}).insert(ignore_permissions=True)
    profiles={
        'AIONE-普通选品员工':['research','collect'],
        'AIONE-选品管理员':['research','collect','assign','manage','manageGrants'],
        'AIONE-无选品权限':[],
    }
    for name,keys in profiles.items():
        if not frappe.db.exists('Role Profile',name):
            frappe.get_doc({'doctype':'Role Profile','role_profile':name,'roles':[{'role':BUSINESS_ROLES[k]} for k in keys]}).insert(ignore_permissions=True)
    if not frappe.get_meta('Employee').has_field(ROLE_PROFILE_FIELD):
        create_custom_fields({'Employee':[dict(fieldname=ROLE_PROFILE_FIELD,label='AIONE业务角色配置',fieldtype='Link',options='Role Profile',permlevel=9,insert_after=PREFIX_FIELD,
            description='由系统管理员维护并自动同步AIONE。普通员工选择AIONE-普通选品员工；撤销选择AIONE-无选品权限。未接管的历史授权保持不变；接管后清空同样撤销。')]})

