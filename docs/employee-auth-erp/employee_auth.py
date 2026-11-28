"""ERP Employee account administration. Stage source; deploy only to ERP8081 after review."""
import base64
import hashlib
import json
import secrets
import uuid
from datetime import timezone
import frappe
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import padding
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

COMMAND = 'MIWA AIONE Account Command'
ENABLED = 'custom_miwa_aione_login_enabled'
VERIFIED = 'custom_miwa_aione_email_verified_hash'
PUBLIC_KEY = 'miwa_aione_auth_public_key'

def require_admin(employee):
    if frappe.session.user == 'Guest' or 'System Manager' not in frappe.get_roles():
        frappe.throw('仅系统管理员可以管理AIONE登录', frappe.PermissionError)
    doc = frappe.get_doc('Employee', employee)
    doc.check_permission('write')
    if not doc.get('custom_miwa_member_id'):
        frappe.throw('员工缺少现有稳定员工编号')
    return doc

def email_of(doc):
    field = {'Company Email': 'company_email', 'Personal Email': 'personal_email'}.get(doc.get('prefered_contact_email'))
    return str(doc.get(field) or '').strip().lower() if field else ''

def verified_email(doc):
    email = email_of(doc)
    return bool(email and doc.get(VERIFIED) == hashlib.sha256(email.encode()).hexdigest())

def projection(doc):
    return {'loginEnabled': bool(doc.get(ENABLED)), 'loginEmail': email_of(doc), 'loginEmailVerified': verified_email(doc)}

def validate(doc, method=None):
    # Serialize rare email-management writes so concurrent administrators cannot
    # both validate the same address against an outdated directory.
    frappe.db.sql('SELECT name FROM `tabEmployee` ORDER BY name FOR UPDATE')
    old = doc.get_doc_before_save()
    fields = [ENABLED, VERIFIED]
    if (old and any(doc.get(k) != old.get(k) for k in fields)) or (not old and any(doc.get(k) for k in fields)):
        if not getattr(frappe.flags, 'aione_account_admin', False):
            frappe.throw('请使用AIONE账号管理操作，不能直接修改登录控制字段', frappe.PermissionError)
    email = email_of(doc)
    if email:
        for other in frappe.get_all('Employee', filters={'name': ['!=', doc.name]}, fields=['name', 'company_email', 'personal_email', 'prefered_contact_email']):
            if email_of(other) == email:
                frappe.throw('该登录邮箱已被其他员工使用')
    if old and email_of(old) != email:
        doc.set(VERIFIED, None)

def queue(doc, action, envelope=None, request_id=None):
    request_id = request_id or uuid.uuid4().hex
    payload = dict(requestId=request_id, personId=doc.custom_miwa_member_id, action=action,
                   actor=frappe.session.user, createdAt=frappe.utils.now_datetime().replace(tzinfo=timezone.utc).isoformat())
    # Use an actual UTC timestamp, independent of ERP site timezone.
    from datetime import datetime
    payload['createdAt'] = datetime.now(timezone.utc).isoformat()
    if envelope: payload['envelope'] = envelope
    frappe.get_doc(dict(doctype=COMMAND, request_id=request_id, employee=doc.name, action=action,
                        requested_by=frappe.session.user, status='Pending', payload=json.dumps(payload))).insert(ignore_permissions=True)
    return {'requestId': request_id, 'status': 'Pending', 'message': '等待云端确认，尚未完成'}

@frappe.whitelist()
def set_login_enabled(employee, enabled):
    doc = require_admin(employee)
    target = frappe.utils.cint(enabled)
    if target not in (0, 1): frappe.throw('登录状态无效')
    if target and doc.status != 'Active': frappe.throw('只有在职员工可开通登录')
    frappe.flags.aione_account_admin = True
    try:
        doc.set(ENABLED, target); doc.save()
    finally: frappe.flags.aione_account_admin = False
    doc.add_comment('Info', 'AIONE登录权限：' + ('启用，等待同步' if target else '停用，等待云端撤销确认'))
    return queue(doc, 'revoke-sessions')

@frappe.whitelist()
def reset_password(employee, temporary_password):
    # Remove secrets from Frappe request context before any validation can log it.
    frappe.local.form_dict.pop('temporary_password', None)
    doc = require_admin(employee)
    if not doc.get(ENABLED) or doc.status != 'Active': frappe.throw('请先开通在职员工AIONE登录')
    if not isinstance(temporary_password, str) or not 15 <= len(temporary_password) <= 128:
        frappe.throw('临时密码须为15至128个字符')
    request_id, envelope = seal(doc, 'reset-password', dict(temporaryPassword=temporary_password))
    return queue(doc, 'reset-password', envelope, request_id)

def seal(doc, action, values):
    config = frappe.cache().get_value(PUBLIC_KEY)
    if not config: frappe.throw('认证管理通道尚未连接，请稍后重试')
    request_id = uuid.uuid4().hex
    key = AESGCM.generate_key(bit_length=256)
    iv = secrets.token_bytes(12)
    raw = json.dumps(dict(personId=doc.custom_miwa_member_id, action=action, **values), ensure_ascii=False).encode()
    encrypted = AESGCM(key).encrypt(iv, raw, request_id.encode())
    public_key = serialization.load_pem_public_key(config['publicPem'].encode())
    wrapped = public_key.encrypt(key, padding.OAEP(mgf=padding.MGF1(algorithm=hashes.SHA256()), algorithm=hashes.SHA256(), label=None))
    encoded = lambda value: base64.b64encode(value).decode()
    envelope = dict(keyId=config['keyId'], wrappedKey=encoded(wrapped), iv=encoded(iv), tag=encoded(encrypted[-16:]), ciphertext=encoded(encrypted[:-16]))
    return request_id, envelope

@frappe.whitelist()
def authorize_google_binding(employee):
    doc = require_admin(employee)
    if not doc.get(ENABLED) or doc.status != 'Active': frappe.throw('请先开通在职员工AIONE登录')
    ticket = secrets.token_urlsafe(32)
    request_id, envelope = seal(doc, 'authorize-google-binding', dict(ticket=ticket))
    result = queue(doc, 'authorize-google-binding', envelope, request_id)
    result['link'] = 'https://aione.miwa-happyhouse.com/#/employee-profile?googleBind=' + ticket
    result['instruction'] = '云端确认后，将链接安全交给员工本人；员工须先登录本人的AIONE账号，再验证拟绑定的Google账号。24小时有效。'
    return result

@frappe.whitelist()
def revoke_sessions(employee):
    return queue(require_admin(employee), 'revoke-sessions')

@frappe.whitelist()
def begin_email_verification(employee, field, email):
    doc = require_admin(employee)
    if field not in ('company_email', 'personal_email'): frappe.throw('请选择个人邮箱或公司邮箱')
    email = str(email or '').strip().lower()
    frappe.utils.validate_email_address(email, throw=True)
    if not email: frappe.throw('请输入邮箱')
    for other in frappe.get_all('Employee', filters={'name': ['!=', doc.name]}, fields=['name', 'company_email', 'personal_email', 'prefered_contact_email']):
        if email_of(other) == email: frappe.throw('该登录邮箱已被其他员工使用')
    code = secrets.token_hex(4).upper()
    ticket = uuid.uuid4().hex
    value = dict(employee=employee, field=field, email=email, actor=frappe.session.user, codeHash=hashlib.sha256(code.encode()).hexdigest())
    frappe.cache().set_value('aione-email-verification:' + ticket, value, expires_in_sec=900)
    return dict(ticket=ticket, code=code, email=email, expiresMinutes=15,
                instruction='请员工从此新邮箱向管理员发送验证码；核对实际发件地址与验证码后方可确认。')

@frappe.whitelist()
def confirm_email_verification(employee, ticket, received_code, evidence):
    doc = require_admin(employee)
    key = 'aione-email-verification:' + str(ticket)
    value = frappe.cache().get_value(key)
    if not value or value['employee'] != employee or value['actor'] != frappe.session.user:
        frappe.throw('验证已过期或不属于当前管理员')
    if not secrets.compare_digest(value['codeHash'], hashlib.sha256(str(received_code).strip().upper().encode()).hexdigest()):
        frappe.cache().delete_value(key)
        frappe.throw('验证码错误，请重新发起核验')
    if len(str(evidence or '').strip()) < 8: frappe.throw('请填写核验依据，例如收到验证邮件的日期及主题，不填写密码')
    doc.set(value['field'], value['email'])
    doc.set('prefered_contact_email', 'Company Email' if value['field'] == 'company_email' else 'Personal Email')
    frappe.flags.aione_account_admin = True
    try: doc.save()
    finally: frappe.flags.aione_account_admin = False
    # Validation intentionally clears previous verification before this confirmed value.
    doc.db_set(VERIFIED, hashlib.sha256(value['email'].encode()).hexdigest())
    doc.add_comment('Info', 'AIONE邮箱归属已人工核验：' + value['email'] + '；依据：' + str(evidence).strip())
    frappe.cache().delete_value(key)
    return queue(doc, 'revoke-sessions')

@frappe.whitelist()
def account_status(employee):
    doc = require_admin(employee)
    status = frappe.cache().get_value('aione-auth-status:' + doc.custom_miwa_member_id) or {}
    commands = frappe.get_all(COMMAND, filters={'employee': employee}, fields=['name', 'action', 'status', 'creation'], order_by='creation desc', limit_page_length=10)
    return dict(**projection(doc), credential=status, commands=commands)

def install():
    from frappe.custom.doctype.custom_field.custom_field import create_custom_fields
    create_custom_fields({'Employee':[
        dict(fieldname='custom_miwa_aione_account_section',label='AIONE账号管理',fieldtype='Section Break',insert_after='custom_miwa_aione_role_profile',permlevel=9),
        dict(fieldname=ENABLED,label='AIONE登录权限',fieldtype='Check',default='0',read_only=1,permlevel=9,insert_after='custom_miwa_aione_account_section'),
        dict(fieldname=VERIFIED,label='AIONE已核验邮箱摘要',fieldtype='Data',hidden=1,read_only=1,permlevel=9,insert_after=ENABLED),
    ]})
    if not frappe.db.exists('DocType', COMMAND):
        frappe.get_doc(dict(doctype='DocType',name=COMMAND,module='Miwa Ai',custom=1,autoname='field:request_id',track_changes=0,
          fields=[dict(fieldname='request_id',label='管理请求编号',fieldtype='Data',reqd=1,unique=1),
                  dict(fieldname='employee',label='员工',fieldtype='Link',options='Employee',reqd=1),
                  dict(fieldname='action',label='操作',fieldtype='Data',reqd=1),
                  dict(fieldname='requested_by',label='操作人',fieldtype='Data',reqd=1),
                  dict(fieldname='status',label='处理状态',fieldtype='Select',options='Pending\nSucceeded\nFailed',default='Pending'),
                  dict(fieldname='payload',label='加密管理请求',fieldtype='Long Text',hidden=1),
                  dict(fieldname='result',label='云端回执',fieldtype='Small Text')],
          permissions=[dict(role='System Manager',read=1)] )).insert(ignore_permissions=True)
