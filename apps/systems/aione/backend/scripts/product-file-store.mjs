// Local connector storage only. No cloud calls, numbering, AI or publishing.
import { createHash, randomUUID } from 'node:crypto';
import { mkdir, lstat, realpath, readFile, open, link, unlink, rename } from 'node:fs/promises';
import { resolve, relative, basename, isAbsolute, join } from 'node:path';

export const digest = bytes => createHash('sha256').update(bytes).digest('hex');
function validName(name) {
  if (typeof name !== 'string' || name !== basename(name) || /[\\/:]/.test(name) || !name || name.startsWith('.') || /[<>"|?*\x00-\x1f]/.test(name) || /[. ]$/.test(name) || /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(?:\.|$)/i.test(name))
    throw Error('商品文件名无效或包含子目录');
}
function beneath(root, path) {
  const rel = relative(root, path);
  if (rel === '..' || rel.startsWith('..\\') || rel.startsWith('../') || isAbsolute(rel))
    throw Error('商品文件路径超出已配置目录');
}
async function directory(path, root) {
  if ((await lstat(path)).isSymbolicLink()) throw Error('商品目录不能是符号链接');
  const actual = await realpath(path);
  beneath(root, actual);
  if (!(await lstat(actual)).isDirectory()) throw Error('商品路径不是目录');
  return actual;
}

/** Explicit ERP-managed mapping, never extract employee identities from folder names. */
export async function productDirectory({ root, prefixDirectories }, code, prefix) {
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(code) || !prefix || !code.toLowerCase().startsWith(prefix.toLowerCase()))
    throw Error('正式货号与目录前缀配置不一致');
  const base = await realpath(root);
  const configured = prefixDirectories?.[prefix];
  if (!configured) throw Error('请管理员配置该货号前缀的商品目录');
  if (isAbsolute(configured) || configured !== basename(configured) || /[\\/:]/.test(configured) || ['.', '..'].includes(configured))
    throw Error('员工目录配置必须是商品根目录下的单层目录');
  const parent = await directory(resolve(base, configured), base);
  const target = join(parent, code);
  await mkdir(target, { recursive: false }).catch(e => { if (e.code !== 'EEXIST') throw e; });
  return directory(target, base);
}

/** Write bytes completely before exposing the final filename. Never replace an existing file. */
async function createFile(folder, name, bytes, sha256, managed) {
  validName(name);
  if (digest(bytes) !== sha256) throw Error('商品文件内容校验失败：' + name);
  const destination = join(folder, name);
  try {
    if ((await lstat(destination)).isSymbolicLink()) throw Error('商品文件不能是符号链接');
    const existing = await readFile(destination);
    if (digest(existing) === sha256) return { name, sha256, state: 'reused' };
    if (managed?.sha256 === digest(existing)) {
      // Only the same selection's recorded bytes can be replaced. Keep a complete
      // immutable prior version outside both synchronized trees before replacement.
      await mkdir(managed.backupRoot,{recursive:true});
      const backup=join(managed.backupRoot,managed.sha256+'-'+name);
      try { const fd=await open(backup,'wx');try{await fd.writeFile(existing);await fd.sync();}finally{await fd.close();} }
      catch(e){if(e.code!=='EEXIST')throw e;if(digest(await readFile(backup))!==managed.sha256)throw Error('商品文件历史备份校验失败');}
      const temporary=join(folder,'.miwa-write-'+randomUUID());
      try {
        const fd=await open(temporary,'wx');try{await fd.writeFile(bytes);await fd.sync();}finally{await fd.close();}
        if(digest(await readFile(destination))!==managed.sha256)throw Error('商品文件在保存期间被修改，请核对冲突');
        await rename(temporary,destination);
      } finally {await unlink(temporary).catch(e=>{if(e.code!=='ENOENT')throw e;});}
      return {name,sha256,state:'updated',previousSha256:managed.sha256,backup};
    }
    return { name, sha256, state: 'conflict', message: '已有同名文件内容不同，已保留原文件，需核对后处理' };
  } catch (e) { if (e.code !== 'ENOENT') throw e; }
  const temporary = join(folder, '.miwa-write-' + randomUUID());
  try {
    const fd = await open(temporary, 'wx');
    try { await fd.writeFile(bytes); await fd.sync(); } finally { await fd.close(); }
    // Atomic exclusive name publication: concurrent execution cannot overwrite a winner.
    try { await link(temporary, destination); }
    catch (e) {
      if (e.code !== 'EEXIST') throw e;
      return createFile(folder, name, bytes, sha256, managed);
    }
    return { name, sha256, state: 'created' };
  } finally { await unlink(temporary).catch(e => { if (e.code !== 'ENOENT') throw e; }); }
}

export async function saveProductFiles(config, request) {
  if (!['confirmed', 'submitted'].includes(request.status) || !request.selectionId || !request.reservationVerified)
    throw Error('仅允许已确认且经ERP核对预留货号的选品保存商品文件');
  const files = request.files || [];
  if (!files.length || new Set(files.map(f => f.name.toLowerCase())).size !== files.length)
    throw Error('商品文件清单为空或存在重复文件名');
  // Validate everything before creating a product directory.
  for (const f of files) {
    validName(f.name);
    if (!Buffer.isBuffer(f.bytes) || f.bytes.length > 25 * 1024 * 1024 || digest(f.bytes) !== f.sha256)
      throw Error('商品文件内容或大小校验失败');
    if (!['workbook', 'reference', 'manifest'].includes(f.role)) throw Error('此流程不能写入正式美工成品');
    if (f.role === 'reference' && f.name.toLowerCase().startsWith(request.code.toLowerCase() + '_'))
      throw Error('参考图片不能使用可发布图片文件名');
  }
  const folder = await productDirectory(config, request.code, request.prefix);
  let release=async()=>{};
  if(config.stateRoot) {
    await mkdir(config.stateRoot,{recursive:true});
    const lock=join(config.stateRoot,'lock-'+digest(folder)+'.json');
    let held=false;
    for(let attempt=0;attempt<30;attempt++) {
      try {
        const fd=await open(lock,'wx');
        try{await fd.writeFile(JSON.stringify({pid:process.pid,createdAt:Date.now()}));}finally{await fd.close();}
        held=true;release=()=>unlink(lock);break;
      } catch(e) {
        if(e.code!=='EEXIST')throw e;
        try {
          const owner=JSON.parse(await readFile(lock,'utf8'));
          try{process.kill(owner.pid,0);}catch(p){if(p.code==='ESRCH'){await unlink(lock);continue;}}
        } catch(p){if(p.code==='ENOENT')continue;}
        await new Promise(r=>setTimeout(r,100));
      }
    }
    if(!held)throw Error('正在保存商品资料，请稍后重试');
  }
  try {
  const owned=new Map();
  if(config.stateRoot) {
    try {
      const bytes=await readFile(join(folder,'aione-manifest.json'));
      const manifest=JSON.parse(bytes);
      if(manifest.selectionId!==request.selectionId)throw Error('本地商品目录已关联另一选品，未覆盖');
      if(Number(manifest.version)>Number(request.version))throw Error('本地商品资料版本较新，旧任务不得覆盖');
      for(const entry of manifest.assets||[])if(entry.role==='workbook')owned.set(entry.name,entry.sha256);
      owned.set('aione-manifest.json',digest(bytes));
    } catch(e){if(e.code!=='ENOENT')throw e;}
  }
  const conflicts=[];
  for(const f of files) {
    try {
      const path=join(folder,f.name);
      if((await lstat(path)).isSymbolicLink())throw Error('商品文件不能是符号链接');
      const hash=digest(await readFile(path));
      if(f.expectedSha256 && f.expectedSha256!==hash)throw Error('正在保存商品资料，文件已变化，请稍后重试');
      // Internal, narrowly merged workbook updates use a compare-and-swap hash.
      // The caller derives the bytes from the current file, never from an API payload.
      if(f.name==='SKU.xlsx' && f.role==='workbook' && f.expectedSha256===hash)owned.set(f.name,hash);
      if(hash!==f.sha256 && hash!==owned.get(f.name))conflicts.push({name:f.name,state:'conflict',message:'已有文件被人工或云端修改，未覆盖'});
    }catch(e){if(e.code!=='ENOENT')throw e;}
  }
  if(conflicts.length)return {selectionId:request.selectionId,code:request.code,folder,state:'conflict',files:conflicts,wps:'unverified',googleDrive:'unverified',allowPaidAI:false,allowPublish:false};
  const results = [];
  for (const f of files) {
    if(f.role==='manifest' && results.some(r=>r.state==='conflict'))continue;
    results.push(await createFile(folder, f.name, f.bytes, f.sha256,owned.has(f.name)?{
      sha256:owned.get(f.name),backupRoot:join(config.stateRoot,'versions',digest(request.selectionId)),
    }:null));
  }
  return {
    selectionId: request.selectionId, code: request.code, folder,
    state: results.some(f => f.state === 'conflict') ? 'conflict' : 'saved', files: results,
    wps: 'unverified', googleDrive: 'unverified', allowPaidAI: false, allowPublish: false,
  };
  } finally {await release();}
}
