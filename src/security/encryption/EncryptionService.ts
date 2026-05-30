import crypto from 'react-native-quick-crypto';
import { EncryptedPayload } from '../models';
import { Buffer } from '@craftzdog/react-native-buffer';

// Fallback to global Buffer if available, else standard requires
const SafeBuffer = typeof Buffer !== 'undefined' ? Buffer : require('buffer').Buffer;

const ALGORITHM = 'aes-256-gcm';

export class EncryptionService {
  /**
   * Generates a secure random 32-byte (256-bit) AES key.
   * Returns a base64 encoded string.
   */
  static generateAESKey(): string {
    const key = crypto.randomBytes(32);
    return key.toString('base64');
  }

  static encryptString(text: string, base64Key: string): EncryptedPayload {
    const key = SafeBuffer.from(base64Key, 'base64');
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    
    let encrypted = cipher.update(text, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    
    const authTag = cipher.getAuthTag();

    return {
      ciphertext: encrypted,
      iv: iv.toString('base64'),
      authTag: authTag.toString('base64'),
    };
  }

  static decryptString(payload: EncryptedPayload, base64Key: string): string {
    const key = SafeBuffer.from(base64Key, 'base64');
    const iv = SafeBuffer.from(payload.iv, 'base64');
    const authTag = SafeBuffer.from(payload.authTag, 'base64');

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(payload.ciphertext, 'base64', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  static encryptJSON(payload: object, base64Key: string): EncryptedPayload {
    return this.encryptString(JSON.stringify(payload), base64Key);
  }

  static decryptJSON<T>(payload: EncryptedPayload, base64Key: string): T {
    const decryptedString = this.decryptString(payload, base64Key);
    return JSON.parse(decryptedString) as T;
  }
}
