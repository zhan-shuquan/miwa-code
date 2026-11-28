import {aioneApi} from '../services/aione-api-client.js';
import {authConfig} from '../config/auth-config.js';
import {changeEmployeePassword,logoutEmployeeSession} from './employee-login.js';

export async function initEmployeeAccount(host) {
  const employee=await aioneApi('/api/v1/auth/profile');
  host.innerHTML=`<section class="sw"><header class="sw-heading"><h1>个人设置</h1></header><section class="sw-card"><div data-profile class="sw-profile-grid"></div></section><section class="sw-card"><h2>修改个人密码</h2><form class="employee-login-form" style="max-width:440px"><label>当前密码<input name="currentPassword" type="password" autocomplete="current-password" required maxlength="128"></label><label>新密码<input name="newPassword" type="password" autocomplete="new-password" required minlength="15" maxlength="128"></label><button type="submit" class="employee-login-submit">修改密码</button><p role="status" aria-live="polite"></p></form><button type="button" data-logout>退出登录</button></section><section class="sw-card" data-google-binding hidden><h2>绑定Google账号</h2><p>请验证管理员授权绑定到本员工身份的Google账号。</p><button type="button" data-google-start>验证Google账号</button><div data-google-button></div><p data-google-status role="status"></p></section></section>`;
  if(!document.getElementById('selection-workspace-css')){const link=document.createElement('link');link.id='selection-workspace-css';link.rel='stylesheet';link.href='./css/pages/selection-workspace.css';document.head.append(link);}
  const fields={memberId:'员工编号',name:'员工姓名',company:'所属公司',department:'所属部门',email:'绑定邮箱',businessRole:'业务角色'};
  const profile=host.querySelector('[data-profile]');
  for(const [key,label]of Object.entries(fields)){const div=document.createElement('div'),span=document.createElement('span'),strong=document.createElement('strong');span.textContent=label;strong.textContent=employee[key]||'—';div.append(span,strong);profile.append(div);}
  if(/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(employee.avatar||'')){const image=document.createElement('img');image.className='sw-profile-avatar';image.src=employee.avatar;image.alt='员工头像';profile.before(image);}
  const form=host.querySelector('form');
  form.onsubmit=async event=>{
    event.preventDefault();const button=form.querySelector('button');button.disabled=true;
    try{await changeEmployeePassword(form.elements.currentPassword.value,form.elements.newPassword.value);form.reset();location.reload();}
    catch(e){form.querySelector('[role=status]').textContent=e.message;}
    finally{button.disabled=false;}
  };
  host.querySelector('[data-logout]').onclick=async()=>{await logoutEmployeeSession();location.reload();};
  const ticket=new URLSearchParams(location.hash.split('?')[1]||'').get('googleBind');
  if(!ticket)return;
  host.querySelector('[data-google-binding]').hidden=false;
  host.querySelector('[data-google-start]').onclick=async event=>{
    const button=event.currentTarget,status=host.querySelector('[data-google-status]');button.disabled=true;
    try {
      if(!window.google?.accounts?.id)await new Promise((resolve,reject)=>{
        const script=document.createElement('script');script.src=authConfig.googleScriptUrl;script.async=true;
        const timer=setTimeout(()=>reject(Error('Google暂时无法访问，请稍后绑定')),10000);
        script.onload=()=>{clearTimeout(timer);resolve();};script.onerror=()=>{clearTimeout(timer);reject(Error('Google组件加载失败'));};document.head.append(script);
      });
      window.google.accounts.id.initialize({client_id:authConfig.googleClientId,auto_select:false,callback:async result=>{
        try{await aioneApi('/api/v1/auth/google-bind',{method:'POST',body:JSON.stringify({ticket,credential:result.credential})});status.textContent='Google身份绑定成功，员工编号及业务资料保持不变';history.replaceState(null,'',location.pathname+location.search+'#/employee-profile');}
        catch(e){status.textContent=e.message;}
      }});
      window.google.accounts.id.renderButton(host.querySelector('[data-google-button]'),{theme:'outline',size:'large',text:'signin_with',width:280});button.hidden=true;
    }catch(e){status.textContent=e.message;button.disabled=false;}
  };
}
