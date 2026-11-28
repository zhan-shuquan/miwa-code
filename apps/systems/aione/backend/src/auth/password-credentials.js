import { randomBytes, scrypt as derive, timingSafeEqual, createHash } from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(derive);
const parameters = Object.freeze({ N: 131072, r: 8, p: 1, maxmem: 160 * 1024 * 1024 });
const prefix = 'scrypt$131072$8$1';
// An absent credential still performs the same expensive derivation.
const dummy = `${prefix}$${Buffer.alloc(16).toString('hex')}$${Buffer.alloc(32).toString('hex')}`;
let active=0;
const waiting=[];
async function deriveBounded(password,salt) {
  // Current 512 MiB service must retain memory for business requests alongside
  // scrypt's 128 MiB workspace; queue rather than doubling that workspace.
  if(active>=1) {
    if(waiting.length>=16)throw Object.assign(new Error('认证服务繁忙，请稍后重试'),{status:503});
    await new Promise(resolve=>waiting.push(resolve));
  } else active++;
  try{return await scrypt(password,salt,32,parameters);}
  finally{if(waiting.length)waiting.shift()();else active--;}
}

export function validatePassword(password) {
  if (typeof password !== 'string' || [...password].length < 15 || [...password].length > 128 || Buffer.byteLength(password) > 512) {
    const error = new Error('密码须为15至128个字符');
    error.status = 400;
    throw error;
  }
  return password;
}

export async function hashPassword(password) {
  validatePassword(password);
  const salt = randomBytes(16);
  const result = await deriveBounded(password, salt);
  return `${prefix}$${salt.toString('hex')}$${result.toString('hex')}`;
}

export async function verifyPassword(password, encoded) {
  const valid = typeof encoded === 'string' && /^scrypt\$131072\$8\$1\$[a-f0-9]{32}\$[a-f0-9]{64}$/.test(encoded);
  const parts = (valid ? encoded : dummy).split('$');
  // Bound work and never permit attacker-controlled algorithm parameters.
  const bounded = typeof password === 'string' && Buffer.byteLength(password) <= 512 ? password : '';
  const result = await deriveBounded(bounded, Buffer.from(parts[4], 'hex'));
  return timingSafeEqual(result, Buffer.from(parts[5], 'hex')) && valid && bounded === password;
}

export const newSessionToken = () => randomBytes(32).toString('base64url');
export const tokenDigest = token => createHash('sha256').update(String(token)).digest('hex');
