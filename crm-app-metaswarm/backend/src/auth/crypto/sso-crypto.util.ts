import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const ALGO = 'aes-256-gcm';
const ENCODING = 'hex' as const;

export function encryptSsoCert(cert: string, keyHex: string): string {
  const key = Buffer.from(keyHex, ENCODING);
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGO, key, iv);
  const encrypted = Buffer.concat([cipher.update(cert, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [iv.toString(ENCODING), encrypted.toString(ENCODING), authTag.toString(ENCODING)].join(':');
}

export function decryptSsoCert(encryptedCert: string, keyHex: string): string {
  const parts = encryptedCert.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted cert format');
  }
  const [ivHex, encryptedHex, authTagHex] = parts;
  const key = Buffer.from(keyHex, ENCODING);
  const decipher = createDecipheriv(ALGO, key, Buffer.from(ivHex, ENCODING));
  decipher.setAuthTag(Buffer.from(authTagHex, ENCODING));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encryptedHex, ENCODING)),
    decipher.final(),
  ]);
  return decrypted.toString('utf8');
}
