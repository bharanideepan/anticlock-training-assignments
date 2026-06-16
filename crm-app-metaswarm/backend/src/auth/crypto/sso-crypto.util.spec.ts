import { encryptSsoCert, decryptSsoCert } from './sso-crypto.util';

const KEY_HEX = 'a'.repeat(64); // 32 bytes as hex

describe('sso-crypto.util', () => {
  describe('encryptSsoCert + decryptSsoCert (round-trip)', () => {
    it('encrypts and decrypts a PEM cert string', () => {
      const original = '-----BEGIN CERTIFICATE-----\nMIIB...\n-----END CERTIFICATE-----';
      const encrypted = encryptSsoCert(original, KEY_HEX);
      const decrypted = decryptSsoCert(encrypted, KEY_HEX);
      expect(decrypted).toBe(original);
    });

    it('produces different ciphertext on each call (random IV)', () => {
      const cert = 'test-cert-value';
      const enc1 = encryptSsoCert(cert, KEY_HEX);
      const enc2 = encryptSsoCert(cert, KEY_HEX);
      expect(enc1).not.toBe(enc2);
    });

    it('encrypted output has three colon-separated parts (iv:ciphertext:authTag)', () => {
      const encrypted = encryptSsoCert('cert', KEY_HEX);
      const parts = encrypted.split(':');
      expect(parts).toHaveLength(3);
      expect(parts[0]).toHaveLength(24); // 12-byte IV as hex = 24 chars
    });
  });

  describe('decryptSsoCert', () => {
    it('throws if the encrypted format is invalid (not 3 parts)', () => {
      expect(() => decryptSsoCert('invalid-format', KEY_HEX)).toThrow(
        'Invalid encrypted cert format',
      );
    });

    it('throws if the encrypted format has too many parts', () => {
      expect(() => decryptSsoCert('a:b:c:d', KEY_HEX)).toThrow('Invalid encrypted cert format');
    });
  });
});
