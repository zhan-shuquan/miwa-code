// ERP Employee account controls; server permission checks remain authoritative.
frappe.ui.form.on('Employee', {
  refresh(frm) {
    if(frm.is_new() || !frappe.user_roles.includes('System Manager'))return;
    const method='miwa_ai.employee_auth.';
    const call=async(name,args={})=>{
      const result=await frappe.call({method:method+name,args:{employee:frm.doc.name,...args},freeze:true});
      return result.message;
    };
    const queued=result=>frappe.msgprint({title:'AIONE账号管理',message:result.message||'等待云端确认，请稍后刷新账号状态'});
    frm.add_custom_button('账号状态',async()=>{
      const state=await call('account_status');
      const d=new frappe.ui.Dialog({title:'AIONE员工账号状态',fields:[{fieldtype:'HTML',fieldname:'status'}]});
      const box=d.fields_dict.status.$wrapper[0];
      const rows=[['员工编号',frm.doc.custom_miwa_member_id],['员工姓名',frm.doc.employee_name],
        ['登录权限',state.loginEnabled?'启用':'停用'],['登录邮箱',state.loginEmail||'未选择首选个人/公司邮箱'],
        ['邮箱归属',state.loginEmailVerified?'已核验':'待核验'],['业务角色',frm.doc.custom_miwa_aione_role_profile||'沿用现有配置'],
        ['密码设置',state.credential.syncedAt?(state.credential.password_set?'已设置':'未设置'):'等待云端状态'],
        ['首次登录',state.credential.syncedAt?(state.credential.activated_at?'已激活':'待激活'):'等待云端状态'],
        ['最近登录',state.credential.syncedAt?(state.credential.last_login_at||'暂无'):'等待云端状态'],['Google绑定账号',state.credential.syncedAt?((state.credential.googleBindings||[]).join('、')||'未绑定'):'等待云端状态'],['状态同步时间',state.credential.syncedAt||'尚未收到云端状态']];
      for(const [label,value]of rows){const p=document.createElement('p');p.textContent=label+'：'+value;box.append(p);}
      for(const cmd of state.commands||[]){const p=document.createElement('p');p.textContent=cmd.creation+' '+cmd.action+' '+cmd.status;box.append(p);}
      d.show();
    },'AIONE账号');
    frm.add_custom_button(frm.doc.custom_miwa_aione_login_enabled?'停用登录':'开通登录',async()=>{
      const result=await call('set_login_enabled',{enabled:frm.doc.custom_miwa_aione_login_enabled?0:1});queued(result);await frm.reload_doc();
    },'AIONE账号');
    frm.add_custom_button('设置/重置临时密码',()=>{
      const d=new frappe.ui.Dialog({title:'设置安全临时密码',fields:[{fieldname:'temporary_password',label:'临时密码（15至128字符，24小时有效）',fieldtype:'Password',reqd:1}],primary_action_label:'提交重置',
        primary_action:async values=>{
          try{const result=await call('reset_password',values);d.set_value('temporary_password','');d.hide();queued(result);}
          finally{d.set_value('temporary_password','');}
        }});d.show();
    },'AIONE账号');
    frm.add_custom_button('强制退出所有会话',async()=>queued(await call('revoke_sessions')),'AIONE账号');
    frm.add_custom_button('授权绑定Google账号',async()=>{
      const result=await call('authorize_google_binding');
      const d=new frappe.ui.Dialog({title:'Google绑定授权',fields:[{fieldname:'link',label:'仅交给该员工本人的一次性链接',fieldtype:'Small Text',read_only:1},{fieldname:'instruction',fieldtype:'HTML'}]});
      d.set_value('link',result.link);d.fields_dict.instruction.$wrapper.text(result.instruction);d.show();
    },'AIONE账号');
    frm.add_custom_button('核验/更换登录邮箱',()=>{
      const d=new frappe.ui.Dialog({title:'核验员工邮箱归属',fields:[
        {fieldname:'field',label:'邮箱类型',fieldtype:'Select',options:'个人邮箱\n公司邮箱',default:'个人邮箱',reqd:1},
        {fieldname:'email',label:'新登录邮箱',fieldtype:'Data',options:'Email',reqd:1}],primary_action_label:'生成核验码',
        primary_action:async values=>{
          const result=await call('begin_email_verification',{field:values.field==='公司邮箱'?'company_email':'personal_email',email:values.email});d.hide();
          const verify=new frappe.ui.Dialog({title:'核对员工发来的验证邮件',fields:[
            {fieldname:'instruction',fieldtype:'HTML'},
            {fieldname:'received_code',label:'从员工验证邮件中收到的验证码',fieldtype:'Data',reqd:1},
            {fieldname:'evidence',label:'核验记录（收件时间、主题等，不填写密码）',fieldtype:'Small Text',reqd:1}],primary_action_label:'确认归属并绑定',
            primary_action:async proof=>{const ack=await call('confirm_email_verification',{ticket:result.ticket,...proof});verify.hide();queued(ack);await frm.reload_doc();}});
          verify.fields_dict.instruction.$wrapper.text('目标邮箱：'+result.email+'；验证码：'+result.code+'；15分钟有效。'+result.instruction);
          verify.show();
        }});d.show();
    },'AIONE账号');
  }
});
