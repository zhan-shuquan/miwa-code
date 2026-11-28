import {Router} from 'express';
import {OAuth2Client} from 'google-auth-library';
import {createEmployeeAuthService} from '../auth/employee-auth-service.js';

export const SESSION_COOKIE='__Host-aione-session';
export function sessionCookie(header) {
  const values=String(header||'').split(';').map(x=>x.trim()).filter(x=>x.startsWith(SESSION_COOKIE+'='));
  return values.length===1?values[0].slice(SESSION_COOKIE.length+1):'';
}
export function createEmployeeAuthHttp(pool,{origins,googleClientId,verifyGoogle}={}) {
  const service=createEmployeeAuthService(pool), router=Router();
  const allowed=new Set(origins||['https://aione.miwa-happyhouse.com']);
  const google=new OAuth2Client();
  const verify=verifyGoogle||async function(token) {
    if(!googleClientId)throw Error('Google authentication unavailable');
    const ticket=await google.verifyIdToken({idToken:token,audience:googleClientId});
    return ticket.getPayload();
  };
  function writeCookie(res,result) {
    res.append('Set-Cookie',`${SESSION_COOKIE}=${result.token}; Path=/; HttpOnly; Secure; SameSite=Lax${result.remember?'; Max-Age='+result.seconds:''}`);
  }
  function clearCookie(res) {res.append('Set-Cookie',`${SESSION_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`);}
  function sameOrigin(req,res,next) {
    if(!['GET','HEAD','OPTIONS'].includes(req.method) && (!allowed.has(req.get('origin')) || req.get('x-aione-request')!=='1'))return res.status(403).json({message:'请求来源校验失败'});
    next();
  }
  router.use((_req,res,next)=>{res.set('Cache-Control','no-store');next();});
  router.use(sameOrigin);
  const handle=fn=>async(req,res)=>{try{await fn(req,res);}catch(e){res.status(e.status||503).json({message:e.status?e.message:'认证服务暂时不可用，请稍后重试'});}};
  router.post('/login',handle(async(req,res)=>{
    // Address must be set by the trusted reverse proxy; never accept arbitrary XFF.
    const proxyAddress=req.get('x-aione-proxy')==='vercel-wif-v1'?req.get('x-aione-client-address'):null;
    const result=await service.login({...req.body,address:proxyAddress||req.socket.remoteAddress||'unknown'});
    writeCookie(res,result);res.json({purpose:result.purpose});
  }));
  router.post('/google',handle(async(req,res)=>{
    let payload;try{payload=await verify(req.body?.credential);}catch{throw Object.assign(Error('Google登录验证失败'),{status:401});}
    if(!payload?.sub||!payload?.email||payload.email_verified!==true)throw Object.assign(Error('Google登录验证失败'),{status:401});
    const result=await service.googleLogin({subject:payload.sub,issuedAt:payload.iat,remember:req.body?.remember===true});
    writeCookie(res,result);res.json({purpose:result.purpose});
  }));
  router.get('/session',handle(async(req,res)=>{
    const current=await service.session(sessionCookie(req.get('cookie')),{allowActivation:true});
    if(!current)return res.status(401).json({message:'请登录'});
    // No business/profile data until temporary-password activation is complete.
    res.json(current.purpose==='activate'?{purpose:'activate'}:{purpose:'business',identity:current.identity});
  }));
  router.post('/google-bind',handle(async(req,res)=>{
    let payload;try{payload=await verify(req.body?.credential);}catch{throw Object.assign(Error('Google身份验证失败'),{status:401});}
    if(!payload?.sub||!payload?.email||payload.email_verified!==true)throw Object.assign(Error('Google身份验证失败'),{status:401});
    await service.bindGoogle(sessionCookie(req.get('cookie')),{ticket:req.body?.ticket,subject:payload.sub,email:payload.email});
    res.json({ok:true});
  }));
  router.get('/profile',handle(async(req,res)=>{
    const current=await service.session(sessionCookie(req.get('cookie')));
    if(!current)return res.status(401).json({message:'请登录'});
    const e=current.employee;
    const grants=(await pool.query("SELECT value FROM selection_workspace_config WHERE key='pool-grants'")).rows[0]?.value?.[e.memberId]||{};
    res.json({memberId:e.memberId,name:e.name,company:e.company,department:e.department,avatar:e.avatar,
      email:e.loginEmail||'',businessRole:grants.manage?'选品管理员':(grants.research||grants.collect)?'普通选品员工':'无选品权限'});
  }));
  router.post('/password',handle(async(req,res)=>{
    await service.changePassword(sessionCookie(req.get('cookie')),req.body||{});
    clearCookie(res);res.json({message:'密码已修改，请重新登录'});
  }));
  router.post('/logout',handle(async(req,res)=>{
    await service.logout(sessionCookie(req.get('cookie')));clearCookie(res);res.json({ok:true});
  }));
  async function authenticate(req,res,next) {
    if(req.method==='OPTIONS'||!req.path.startsWith('/api/'))return next();
    const current=await service.session(sessionCookie(req.get('cookie')));
    if(!current)return res.status(401).json({message:'登录已失效，请重新登录'});
    req.aioneIdentity=current.identity;
    return sameOrigin(req,res,next);
  }
  return {router,authenticate,service};
}
