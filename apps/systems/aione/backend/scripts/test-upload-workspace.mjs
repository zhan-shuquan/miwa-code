import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { aioneApi, aioneImageBlobInfo } from '../../js/services/aione-api-client.js';
const origin = 'http://127.0.0.1:8765';
const nativeFetch = globalThis.fetch;
const login = await nativeFetch(origin + '/__preview/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({account:'employee'})});
const cookie=login.headers.get('set-cookie').split(';')[0];
globalThis.window={location:{hostname:'127.0.0.1',origin},AIONE_SELECTION_PREVIEW:true};
let largest=0;
globalThis.fetch=async(url,options={})=>{
  if(String(url).startsWith('blob:'))return nativeFetch(url,options);
  assert.equal(new URL(url).origin,origin);
  const size=Buffer.byteLength(options.body || '');largest=Math.max(largest,size);assert(size<=4*1024*1024,'Proxy request limit exceeded');
  return nativeFetch(url,{...options,headers:{...options.headers,cookie}});
};
try {
  const prefix='/api/v1/selection-workspace';
  const data=await readFile(new URL('../../../../../.local/readiness-upload-14mb.png',import.meta.url));
  const draft=await aioneApi(prefix+'/records',{method:'POST',body:JSON.stringify({data:{custom_商品长标题中文:'临时隔离上传验收 '+Date.now()}})});
  const path=prefix+'/records/'+encodeURIComponent(draft.id);
  const asset=await aioneApi(path+'/assets',{method:'POST',body:JSON.stringify({filename:'readiness-upload.png',base64:data.toString('base64')})});
  const saved=await aioneApi(path);
  assert(saved.assets.some(a=>a.id===asset.id));
  const image=await aioneImageBlobInfo(path+'/assets/'+asset.id);
  const bytes=Buffer.from(await (await nativeFetch(image.url)).arrayBuffer());URL.revokeObjectURL(image.url);
  assert.equal(bytes.length,data.length);assert.equal(createHash('sha256').update(bytes).digest('hex'),createHash('sha256').update(data).digest('hex'));
  await assert.rejects(aioneApi(path+'/assets',{method:'POST',body:JSON.stringify({filename:'same-market.png',base64:data.toString('base64'),kind:'market'})}),e=>e.status===409);
  console.log(JSON.stringify({status:'PASS',record:draft.id,asset:asset.id,originalBytes:data.length,largestRequestBytes:largest,originalHashPreserved:true,marketProductIsolation:true}));
} finally { globalThis.fetch=nativeFetch; }
