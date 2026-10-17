// A preview may address only a tagged revision of the same private CURRENT service.
// Cloud Run ID tokens keep the service audience, never the traffic-tag URL.
export function resolveBackendTarget(environment,currentBackendUrl){
 const requested=String(environment.AIONE_SETTINGS_PREVIEW_BACKEND_URL||'').trim();
 const eligible=environment.VERCEL_ENV==='preview'&&environment.VERCEL_GIT_COMMIT_REF==='feat/shared-settings-center-20261015';
 if(!eligible||!requested)return {backendUrl:currentBackendUrl,tokenAudience:currentBackendUrl};
 const current=new URL(currentBackendUrl),url=new URL(requested);
 const expected=new RegExp('^candidate-[a-f0-9]{7,40}---'+current.hostname.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'$');
 if(url.protocol!=='https:'||!expected.test(url.hostname)||url.username||url.password||url.port||url.pathname!=='/'||url.search||url.hash)throw new Error('invalid_settings_preview_backend');
 return {backendUrl:url.origin,tokenAudience:currentBackendUrl};
}
