import {aioneApi} from '../services/aione-api-client.js';
import {authConfig} from '../config/auth-config.js';

const asset=path=>new URL('../../'+path,import.meta.url).href;
const request=(path,body)=>aioneApi('/api/v1/auth/'+path,{method:'POST',headers:{'x-aione-request':'1'},body:JSON.stringify(body)});
const session=()=>aioneApi('/api/v1/auth/session');

export async function resolveEmployeeLogin() {
  let current,initialError='';
  try {current=await session();} catch(e) {if(e.status!==401)initialError='认证服务暂时不可用，请稍后重试登录。';}
  if(!current) {
    // Preserve an existing administrator login by exchanging a valid legacy token.
    // Server still requires the existing Google subject binding; no email auto-link.
    try {
      const old=JSON.parse(sessionStorage.getItem('aione.preview.session.v3')||'null');
      if(old?.googleCredential && Number(old.googleExpiresAt)>Date.now()) {
        await request('google',{credential:old.googleCredential});current=await session();
      }
    }catch{} // A rejected/expired legacy session returns to the regular login form.
  }
  if(current?.purpose==='business')return current.identity;
  const host=document.createElement('div');host.id='aione-preview-auth-host';
  const response=await fetch(asset('components/auth/employee-login.html'),{cache:'no-store'});
  if(!response.ok)throw Error('登录页面暂时不可用');
  host.innerHTML=await response.text();document.body.appendChild(host);
  host.querySelector('[data-login-logo]').src=asset('assets/brand/miwa-commerce-logo.png');
  const form=host.querySelector('form'),status=host.querySelector('[role=status]');
  const password=form.elements.password,account=form.elements.account,remember=form.elements.remember;
  let activation=current?.purpose==='activate',busy=false;
  const statusText=text=>{status.textContent=text;};
  if(initialError)statusText(initialError);
  const showActivation=()=>{
    activation=true;host.querySelector('[data-account-row]').hidden=true;
    account.required=false;
    host.querySelector('[data-remember-row]').hidden=true;
    host.querySelector('[data-google-panel]').hidden=true;
    host.querySelector('[data-new-password-row]').hidden=false;
    form.elements.newPassword.required=true;
    host.querySelector('[data-password-label]').textContent='临时密码';
    form.querySelector('[type=submit]').textContent='设置个人密码';
    statusText('首次登录须设置个人密码，完成后重新登录。');
  };
  if(activation)showActivation();
  host.querySelector('[data-show-password]').onclick=event=>{
    const visible=password.type==='password';password.type=visible?'text':'password';
    event.currentTarget.setAttribute('aria-pressed',String(visible));
    event.currentTarget.setAttribute('aria-label',visible?'隐藏密码':'显示密码');
  };
  host.querySelector('[data-forgot]').onclick=()=>statusText('请联系ERP管理员重置AIONE密码；无需提供您的个人邮箱密码。');
  return new Promise(resolve=>{
    const finish=async()=>{
      const result=await session();
      if(result.purpose==='activate'){showActivation();return;}
      password.value='';form.elements.newPassword.value='';host.remove();resolve(result.identity);
    };
    form.addEventListener('submit',async event=>{
      event.preventDefault();if(busy)return;busy=true;
      const button=form.querySelector('[type=submit]');button.disabled=true;
      try {
        if(activation) {
          await request('password',{currentPassword:password.value,newPassword:form.elements.newPassword.value});
          password.value='';form.elements.newPassword.value='';
          // A new sign-in proves the new credential and starts a fresh session.
          location.reload();return;
        }
        statusText('正在登录…');
        await request('login',{account:account.value,password:password.value,remember:remember.checked});
        await finish();
      }catch(e){statusText(e.message||'登录失败，请稍后重试');}
      finally{busy=false;button.disabled=false;}
    });
    host.querySelector('[data-google-start]').onclick=async event=>{
      const button=event.currentTarget;button.disabled=true;statusText('正在加载Google登录…');
      try {
        if(!window.google?.accounts?.id)await new Promise((ok,no)=>{
          const script=document.createElement('script');script.src=authConfig.googleScriptUrl;script.async=true;
          const timer=setTimeout(()=>no(Error('Google暂时无法访问，请使用员工编号或邮箱登录')),10000);
          script.onload=()=>{clearTimeout(timer);ok();};script.onerror=()=>{clearTimeout(timer);no(Error('Google暂时无法访问，请使用员工编号或邮箱登录'));};document.head.appendChild(script);
        });
        window.google.accounts.id.initialize({client_id:authConfig.googleClientId,auto_select:false,callback:async result=>{
          try{await request('google',{credential:result.credential,remember:remember.checked});await finish();}
          catch(e){statusText(e.message||'Google身份验证失败');}
        }});
        window.google.accounts.id.renderButton(host.querySelector('[data-google-button]'),{theme:'outline',size:'large',text:'signin_with',width:280});
        button.hidden=true;statusText('请选择已绑定的Google账号');
      }catch(e){statusText(e.message);button.disabled=false;}
    };
  });
}

export async function changeEmployeePassword(currentPassword,newPassword) {
  return request('password',{currentPassword,newPassword});
}
export async function logoutEmployeeSession() {return request('logout',{});}
