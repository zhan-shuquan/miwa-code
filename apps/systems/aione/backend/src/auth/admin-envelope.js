import {createPrivateKey,createPublicKey,privateDecrypt,constants,createDecipheriv,createHash} from 'node:crypto';

export function createAdminEnvelope(privatePem) {
  // Provision through the existing cloud secret mechanism, never an employee field.
  const key=createPrivateKey(privatePem);
  if(key.asymmetricKeyType!=='rsa'||key.asymmetricKeyDetails.modulusLength<3072)throw Error('Employee auth management key must be RSA 3072 or stronger');
  const publicPem=createPublicKey(key).export({type:'spki',format:'pem'}).toString();
  const keyId=createHash('sha256').update(publicPem).digest('hex');
  function decrypt(envelope,requestId) {
    if(!envelope||envelope.keyId!==keyId||JSON.stringify(envelope).length>8192)throw Error('Invalid credential envelope');
    const unwrap=privateDecrypt({key,padding:constants.RSA_PKCS1_OAEP_PADDING,oaepHash:'sha256'},Buffer.from(envelope.wrappedKey||'','base64'));
    if(unwrap.length!==32)throw Error('Invalid credential key');
    const iv=Buffer.from(envelope.iv||'','base64'),tag=Buffer.from(envelope.tag||'','base64');
    if(iv.length!==12||tag.length!==16)throw Error('Invalid credential envelope');
    const decipher=createDecipheriv('aes-256-gcm',unwrap,iv);
    decipher.setAAD(Buffer.from(requestId));decipher.setAuthTag(tag);
    try{return JSON.parse(Buffer.concat([decipher.update(Buffer.from(envelope.ciphertext||'','base64')),decipher.final()]).toString('utf8'));}
    finally{unwrap.fill(0);}
  }
  return {publicPem,keyId,decrypt};
}
