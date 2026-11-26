import { randomUUID, createHash } from 'node:crypto';
import { uploadJsonLimit } from './selection-upload-policy.js';
import { fail } from './selection-workspace-contract.js';

export const CHUNK_BYTES = 2 * 1024 * 1024;
export const transportPath = path => /^\/records\/[^/?]+\/assets$/.test(path) || ['/pool/collect', '/pool/preflight'].includes(path);
const uuid = value => /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(value || '');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');

// Mounted only after normal identity and active-employee authorization. Final
// requests still pass through the original business permission/validation code.
export function mountUploadTransport(router, { pool, tx, actor }) {
  const run = fn => async (req, res, next) => { try { await fn(req, res); } catch (e) { next(e); } };
  router.post('/upload-transport', run(async (req, res) => {
    const { path, size, sha256 } = req.body;
    if (!transportPath(path) || !Number.isInteger(size) || size < 1 || size > uploadJsonLimit || !/^[a-f0-9]{64}$/.test(sha256 || '')) fail('上传请求无效或超过允许大小', 400);
    const id = randomUUID(), owner = actor(req);
    await tx(async c => {
      await c.query('SELECT pg_advisory_xact_lock(hashtext($1))', ['upload:' + owner]);
      await c.query('DELETE FROM selection_upload_transport WHERE expires_at < now()');
      const count = await c.query('SELECT count(*)::int AS n FROM selection_upload_transport WHERE owner_id=$1', [owner]);
      if (count.rows[0].n >= 3) fail('请先完成当前上传，或稍后重试', 429);
      await c.query('INSERT INTO selection_upload_transport(id,owner_id,path,size_bytes,sha256) VALUES($1,$2,$3,$4,$5)', [id, owner, path, size, sha256]);
    });
    res.json({ id, chunkBytes: CHUNK_BYTES });
  }));
  router.put('/upload-transport/:id/:position', run(async (req, res) => {
    if (!uuid(req.params.id) || !/^\d+$/.test(req.params.position)) fail('上传分片无效', 400);
    const position = Number(req.params.position), base64 = req.body.base64;
    if (typeof base64 !== 'string' || base64.length > Math.ceil(CHUNK_BYTES / 3) * 4 || !/^[A-Za-z0-9+/]+={0,2}$/.test(base64)) fail('上传分片无效', 400);
    const bytes = Buffer.from(base64, 'base64');
    await tx(async c => {
      const record = (await c.query('SELECT * FROM selection_upload_transport WHERE id=$1 AND owner_id=$2 AND expires_at>now() FOR UPDATE', [req.params.id, actor(req)])).rows[0];
      if (!record) fail('上传已过期或无权限', 404);
      const expected = Math.min(CHUNK_BYTES, record.size_bytes - position * CHUNK_BYTES);
      if (expected <= 0 || bytes.length !== expected || base64 !== bytes.toString('base64')) fail('上传分片长度无效', 400);
      const previous = (await c.query('SELECT bytes FROM selection_upload_chunks WHERE upload_id=$1 AND position=$2', [record.id, position])).rows[0];
      if (previous && !previous.bytes.equals(bytes)) fail('重复分片内容不一致', 409);
      await c.query('INSERT INTO selection_upload_chunks(upload_id,position,bytes) VALUES($1,$2,$3) ON CONFLICT DO NOTHING', [record.id, position, bytes]);
    });
    res.json({ ok: true });
  }));
  router.delete('/upload-transport/:id', run(async (req, res) => {
    if (!uuid(req.params.id)) fail('上传标识无效', 400);
    await pool.query('DELETE FROM selection_upload_transport WHERE id=$1 AND owner_id=$2', [req.params.id, actor(req)]);
    res.json({ ok: true });
  }));
  router.use(async (req, res, next) => {
    try {
      const id = req.body?.uploadTransportId;
      if (!id) return next();
      if (req.method !== 'POST' || !transportPath(req.path) || !uuid(id)) fail('上传目标无效', 400);
      req.body = await tx(async c => {
        const record = (await c.query('SELECT * FROM selection_upload_transport WHERE id=$1 AND owner_id=$2 AND path=$3 AND expires_at>now() FOR UPDATE', [id, actor(req), req.path])).rows[0];
        if (!record) fail('上传已过期或无权限', 404);
        const parts = (await c.query('SELECT position,bytes FROM selection_upload_chunks WHERE upload_id=$1 ORDER BY position', [id])).rows;
        if (parts.length !== Math.ceil(record.size_bytes / CHUNK_BYTES) || parts.some((p, i) => p.position !== i)) fail('上传尚未完成', 409);
        const bytes = Buffer.concat(parts.map(p => p.bytes));
        if (bytes.length !== record.size_bytes || sha(bytes) !== record.sha256) fail('上传完整性校验失败', 409);
        let body; try { body = JSON.parse(bytes.toString('utf8')); } catch { fail('上传内容不是有效JSON', 400); }
        if (!body || typeof body !== 'object' || Array.isArray(body) || body.uploadTransportId) fail('上传内容无效', 400);
        return body;
      });
      next();
    } catch (e) { next(e); }
  });
}
