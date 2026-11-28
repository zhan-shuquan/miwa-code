// A preview may address only a tagged revision of the same private CURRENT service.
// Cloud Run ID tokens keep the service audience, never the traffic-tag URL.
export function resolveBackendTarget(environment,currentBackendUrl){
 const keys={
  'feat/shared-settings-center-20261015':'AIONE_SETTINGS_PREVIEW_BACKEND_URL',
  'feat/product-center-erp-unified-20261017':'AIONE_PRODUCT_PREVIEW_BACKEND_URL'
 };
 const key=keys[environment.VERCEL_GIT_COMMIT_REF];
 const requested=String(key?environment[key]||'':'').trim();
 const eligible=environment.VERCEL_ENV==='preview'&&Boolean(key);
 if(!eligible||!requested)return {backendUrl:currentBackendUrl,tokenAudience:currentBackendUrl};
 const current=new URL(currentBackendUrl),url=new URL(requested);
 const expected=new RegExp('^candidate-[a-f0-9]{7,40}---'+current.hostname.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'$');
 if(url.protocol!=='https:'||!expected.test(url.hostname)||url.username||url.password||url.port||url.pathname!=='/'||url.search||url.hash)throw new Error('invalid_settings_preview_backend');
 if(key==='AIONE_PRODUCT_PREVIEW_BACKEND_URL'){
  const sha=String(environment.VERCEL_GIT_COMMIT_SHA||'');
  if(!/^[a-f0-9]{40}$/.test(sha)||!url.hostname.startsWith('candidate-'+sha.slice(0,7)+'---'))throw new Error('product_preview_commit_mismatch');
 }
 return {backendUrl:url.origin,tokenAudience:currentBackendUrl};
}
