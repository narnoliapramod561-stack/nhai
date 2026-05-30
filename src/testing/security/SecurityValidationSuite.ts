import { ValidationSuite, ValidationResult } from '../ValidationTypes';
import SecurityService from '../../security/SecurityService';

export class SecurityValidationSuite implements ValidationSuite {
  name = 'Security Validation Suite';

  async run(): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];
    const runTest = async (testId: string, fn: () => Promise<void>) => {
      const start = Date.now();
      try {
        await fn();
        results.push({
          testId, category: 'Security', status: 'PASS', executionMs: Date.now() - start, details: 'Operation succeeded'
        });
      } catch (e: any) {
        results.push({
          testId, category: 'Security', status: 'FAIL', executionMs: Date.now() - start, details: e.message
        });
      }
    };

    const payload = { secret: 'hidden_data', vector: [0.1, 0.2, 0.3] };
    let encrypted: any;

    await runTest('sec_encrypt_payload', async () => {
      encrypted = await SecurityService.encryptPayload(payload);
      if (!encrypted.iv || !encrypted.ciphertext || !encrypted.authTag) {
        throw new Error('Invalid encrypted payload structure');
      }
    });

    await runTest('sec_decrypt_payload', async () => {
      const decrypted = await SecurityService.decryptPayload<typeof payload>(encrypted, true);
      if ((decrypted as typeof payload).secret !== payload.secret) throw new Error('Decryption mismatch');
    });

    await runTest('sec_tampered_payload', async () => {
      const tampered = { ...encrypted, ciphertext: encrypted.ciphertext.substring(0, encrypted.ciphertext.length - 1) + 'a' };
      try {
        await SecurityService.decryptPayload(tampered, true);
        throw new Error('Tampered payload was decrypted');
      } catch (e: any) {
        if (e.message.includes('Tampered payload')) throw e;
        // Expected
      }
    });

    await runTest('sec_corrupt_auth_tag', async () => {
      const corruptTag = { ...encrypted, authTag: encrypted.authTag.replace('a', 'b') };
      try {
        await SecurityService.decryptPayload(corruptTag, true);
        throw new Error('Corrupted auth tag was accepted');
      } catch (e: any) {
        if (e.message.includes('Corrupted auth tag')) throw e;
        // Expected
      }
    });

    return results;
  }
}
