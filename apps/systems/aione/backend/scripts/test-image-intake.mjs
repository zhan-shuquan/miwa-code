import assert from 'node:assert/strict';
import sharp from 'sharp';
import { randomBytes, createHash } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import { aioneApi, aioneImageBlobInfo } from '../../js/services/aione-api-client.js';
import { publicIPv4, fetchSelectionImage } from '../src/services/selection-remote-image.js';

for (const ip of ['127.0.0.1','10.1.2.3','172.16.1.2','192.168.1.1','169.254.169.254','100.100.100.200','0.0.0.0','224.0.0.1','198.18.0.1','192.0.2.1','198.51.100.2','203.0.113.1','::1']) assert.equal(publicIPv4(ip),false,ip);
assert.equal(publicIPv4('8.8.8.8'),true);
for (const url of ['http://127.0.0.1/a.png','http://2130706433/a.png','http://169.254.169.254/latest/meta-data','https://user:pass@example.com/a.png','file:///C:/test.png','https://example.com:8443/a.png']) await assert.rejects(fetchSelectionImage(url,100));

const origin='http://127.0.0.1:8765', prefix='/api/v1/selection-workspace', nativeFetch=globalThis.fetch;
async function login(account) { const r=await nativeFetch(origin+'/__preview/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({account})});assert.equal(r.status,200);return r.headers.get('set-cookie').split(';')[0]; }
let cookie=await login('employeeA'), expiredOnce=false, registrations=0;
globalThis.window={location:{hostname:'127.0.0.1',origin},AIONE_SELECTION_PREVIEW:true};
globalThis.fetch=async(url,options={})=>{
  if(String(url).startsWith('blob:')) return nativeFetch(url,options);
  assert.equal(new URL(url).origin,origin);
  assert(Buffer.byteLength(options.body||'')<4*1024*1024);
  if(String(url).endsWith('/upload-transport')&&options.method==='POST') registrations++;
  if(!expiredOnce&&options.method==='PUT'&&String(url).includes('/upload-transport/')) { expiredOnce=true;return new Response(JSON.stringify({message:'上传已过期或无权限'}),{status:404}); }
  // Reproduce the hosted proxy decoding : in the route, but not JSON bodies.
  return nativeFetch(String(url).replace(/%3A/gi,':'),{...options,headers:{...options.headers,cookie}});
};
try {
  const png=await sharp(randomBytes(1200*1200*3),{raw:{width:1200,height:1200,channels:3}}).png().toBuffer();
  await writeFile(new URL('../../../../../.local/image-intake-isolated.png',import.meta.url),png);
  const record=await aioneApi(prefix+'/records',{method:'POST',body:JSON.stringify({data:{custom_商品长标题中文:'隔离图片录入测试 '+Date.now()}})});
  const path=prefix+'/records/'+encodeURIComponent(record.id);
  const image=await aioneApi(path+'/assets',{method:'POST',body:JSON.stringify({filename:'isolated.png',base64:png.toString('base64')})});
  assert(expiredOnce);assert.equal(registrations,2,'renew exactly once');
  const saved=await aioneApi(path);assert.equal(saved.assets.length,1);
  const blob=await aioneImageBlobInfo(path+'/assets/'+image.id);
  const restored=Buffer.from(await(await nativeFetch(blob.url)).arrayBuffer());URL.revokeObjectURL(blob.url);
  assert.equal(createHash('sha256').update(restored).digest('hex'),createHash('sha256').update(png).digest('hex'));
  let expectedAssets=1;
  if(process.env.REMOTE_IMAGE_URL) {
    const imported=await aioneApi(path+'/assets',{method:'POST',body:JSON.stringify({sourceUrl:process.env.REMOTE_IMAGE_URL})});
    const stored=await aioneImageBlobInfo(path+'/assets/'+imported.id);
    assert(stored.size>0);URL.revokeObjectURL(stored.url);
    expectedAssets=2;
  }
  await assert.rejects(aioneApi(path+'/assets',{method:'POST',body:JSON.stringify({sourceUrl:'http://127.0.0.1/private.png'})}),e=>e.status===422);
  assert.equal((await aioneApi(path)).assets.length,expectedAssets,'failed URL preserves attachments');
  await assert.rejects(aioneApi(path+'/assets',{method:'POST',body:JSON.stringify({filename:'bad.png',base64:Buffer.from('not-image').toString('base64')})}),e=>e.status===400);
  cookie=await login('employeeB');
  await assert.rejects(aioneApi(path+'/assets',{method:'POST',body:JSON.stringify({sourceUrl:'http://127.0.0.1/private.png'})}),e=>e.status===404);
  await assert.rejects(aioneApi(path+'/assets/'+image.id),e=>e.status===404);
  console.log(JSON.stringify({status:'PASS',record:record.id,originalBytes:png.length,proxyDecodedPath:true,expiredCredentialRenewed:true,originalHashPreserved:true,failedUploadPreservesData:true,employeeIsolation:true,ssrfBlocked:true}));
} finally {globalThis.fetch=nativeFetch;}
