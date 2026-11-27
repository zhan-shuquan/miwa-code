import { readFile, mkdir, writeFile, link, unlink } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { join } from 'node:path';
import { quickWorkbook, skuWorkbook } from '../src/services/selection-file-contract.js';
import { saveProductFiles, digest, productDirectory } from './product-file-store.mjs';
import { backfillSkuWorkbook } from '../src/services/selection-sku-backfill.js';

export async function executeProductFiles(command, { erp, api }) {
  const payload = command.payload;
  const prepared = await erp('erp-selection-product-files.py', { payload });
  if (prepared.status !== 'succeeded') return prepared;
  const config = prepared.result;
  const stateRoot = process.env.AIONE_PRODUCT_FILE_STATE;
  if (!stateRoot) throw Error('请配置独立于云盘的商品文件任务缓存目录');
  await mkdir(stateRoot,{recursive:true});
  if (!/^[a-f0-9-]{36}$/i.test(command.id)) throw Error('商品文件任务编号无效');
  if(payload.status==='submitted' && config.erpSkus?.length) {
    const folder=await productDirectory(config,payload.data.item_code,config.prefix);
    let original;
    try{original=await readFile(join(folder,'SKU.xlsx'));}catch(e){if(e.code!=='ENOENT')throw e;}
    if(original){
      const originalManifest=await readFile(join(folder,'aione-manifest.json'));
      const manifest=JSON.parse(originalManifest);
      if(manifest.selectionId!==payload.selectionId)throw Error('SKU表关联另一选品，未覆盖');
      const patched=await backfillSkuWorkbook(original,config.erpSkus,{offerId:String(payload.data.sourceUrl||'').match(/\/offer\/(\d+)\.html/)?.[1]});
      const hash=digest(patched.bytes);
      const entry=manifest.assets.find(a=>a.name==='SKU.xlsx');
      if(!entry)throw Error('商品清单缺少SKU表');
      entry.sha256=hash;
      const manifestBytes=Buffer.from(JSON.stringify(manifest,null,2));
      const result=await saveProductFiles({...config,stateRoot},{selectionId:payload.selectionId,code:payload.data.item_code,prefix:config.prefix,status:payload.status,version:Math.max(Number(payload.version),Number(manifest.version)),reservationVerified:config.reservationVerified,files:[
        {name:'SKU.xlsx',role:'workbook',bytes:patched.bytes,sha256:hash,expectedSha256:digest(original)},
        {name:'aione-manifest.json',role:'manifest',bytes:manifestBytes,sha256:digest(manifestBytes),expectedSha256:digest(originalManifest)},
      ]});
      if(result.state!=='saved')return {status:'failed',result};
      const ack=await erp('erp-selection-product-files.py',{action:'acknowledge',payload,result});
      if(ack.status!=='succeeded')return {status:'failed',result:{...result,state:'verification_failed',message:ack.result.message}};
      return {status:'succeeded',result:{...result,erpVerified:ack.result.verified,skuMappings:patched.mappings,skuCellsUpdated:patched.updated}};
    }
  }
  const cache = join(stateRoot,command.id+'.json');
  const files = [];
  const add = (name, role, content, purpose) => {
    const bytes = Buffer.from(content);
    files.push({ name, role, bytes, sha256:digest(bytes), ...(purpose ? {purpose} : {}) });
  };
  let cached;
  try { cached = JSON.parse(await readFile(cache,'utf8')); } catch(e) { if(e.code !== 'ENOENT') throw e; }
  if (cached) {
    if(cached.selectionId !== payload.selectionId) throw Error('商品文件任务缓存关联不一致');
    for(const f of cached.files) files.push({...f,bytes:Buffer.from(f.base64,'base64')});
  } else {
  add(payload.data.item_code+'.xlsx', 'workbook', await quickWorkbook(payload.data, await readFile(join(config.root,config.template))));
  add('SKU.xlsx', 'workbook', await skuWorkbook(payload.data,config.erpSkus));
  for (const [i,a] of payload.assets.entries()) {
    const bytes = await api('/connector/commands/'+command.id+'/assets/'+a.id, undefined, true);
    if (digest(bytes) !== a.sha256) throw Error('商品参考图片已变化，未写入本地目录');
    const extension = {'image/png':'png','image/jpeg':'jpg','image/webp':'webp'}[a.content_type];
    if (!extension) throw Error('商品图片格式不支持');
    // Same reference names as the existing AIONE package, flattened without image subfolders.
    const name = a.role === 'auxiliary' ? 'aux-'+a.id+'.'+extension : String(i+1).padStart(3,'0')+'-'+a.id+'.'+extension;
    add(name, 'reference', bytes, a.role === 'auxiliary' ? 'auxiliary' : undefined);
  }
  const skuImages=new Map();
  for(const [index,sku] of (payload.data.skus||[]).entries()) {
    if(sku.selected===false || !sku.supplierImageUrl)continue;
    let bytes=skuImages.get(sku.supplierImageUrl);
    if(!bytes) {
      const image=await api('/connector/commands/'+command.id+'/sku-images/'+index);
      bytes=Buffer.from(image.base64,'base64');
      skuImages.set(sku.supplierImageUrl,bytes);
    }
    // Existing AutoDesign source resolver supports supplier SKU filenames and its
    // supplier-URL cache convention; neither is a publish-ready item_code filename.
    const name=/^[A-Za-z0-9_-]{1,100}$/.test(sku.supplierSkuId||'') ? sku.supplierSkuId+'.jpg' : 'supplier-'+digest(sku.supplierImageUrl)+'.jpg';
    const existing=files.find(f=>f.name===name);
    if(existing && existing.sha256!==digest(bytes))throw Error('SKU参考图片文件名冲突');
    if(!existing)add(name,'reference',bytes);
  }
  add('aione-manifest.json','manifest',JSON.stringify({
    selectionId:payload.selectionId,selectionNo:payload.selectionNo,itemCode:payload.data.item_code,version:payload.version,
    data:payload.data,assets:files.map(({name,role,sha256,purpose})=>({name,role,sha256,...(purpose ? {purpose} : {})})),
    allowPublish:false,allowPaidAI:false,allowEmail:false,
  },null,2));
  // Cache complete immutable bytes before the first product write. XLSX ZIP timestamps
  // must not turn a network retry into a false content conflict.
  const temporary = join(stateRoot,randomUUID()+'.tmp');
  await writeFile(temporary,JSON.stringify({selectionId:payload.selectionId,files:files.map(({bytes,...f})=>({...f,base64:bytes.toString('base64')}))}),{flag:'wx'});
  try { await link(temporary,cache); }
  catch(e) {
    if(e.code !== 'EEXIST') throw e;
    await unlink(temporary);
    return executeProductFiles(command,{erp,api});
  }
  finally { await unlink(temporary).catch(e=>{if(e.code!=='ENOENT')throw e;}); }
  }
  const result = await saveProductFiles({...config,stateRoot}, {
    selectionId:payload.selectionId, code:payload.data.item_code, prefix:config.prefix,
    status:payload.status,version:payload.version,reservationVerified:config.reservationVerified,files,
  });
  if (result.state !== 'saved') return {status:'failed',result};
  const ack = await erp('erp-selection-product-files.py',{action:'acknowledge',payload,result});
  if (ack.status !== 'succeeded') return {status:'failed',result:{...result,state:'verification_failed',message:ack.result.message}};
  return {status:'succeeded',result:{...result,erpVerified:ack.result.verified}};
}
