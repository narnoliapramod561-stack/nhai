import { EnrollmentPackage, EnrollmentResult } from './EnrollmentTypes';
import { IdentityCacheService } from '../../identity/IdentityCacheService';
import { CachedIdentity } from '../../identity/IdentityTypes';
import { EncryptedPayload } from '../../security/models';
import { EnrollmentSignatureService } from './EnrollmentSignatureService';

/**
 * Architectural service for processing enrollment packages from the Datalake.
 * Implements the full validation → store pipeline.
 * 
 * NO network implementation. This service is called AFTER the package
 * has already been received (e.g., via a future download sync job).
 */
export class EnrollmentSyncService {
  private identityCache = new IdentityCacheService();

  /**
   * Processes a single enrollment package through the full pipeline.
   * 
   * Flow:
   *   Receive Package → Validate Structure → Validate Signature (TODO)
   *   → Decrypt (TODO) → Store Identity → Update Version
   */
  async processEnrollment(pkg: EnrollmentPackage): Promise<EnrollmentResult> {
    // Step 1: Validate Structure
    const validationError = this.validateStructure(pkg);
    if (validationError) {
      return {
        employeeId: pkg.employeeId ?? 'UNKNOWN',
        success: false,
        errorMessage: validationError,
        failedStep: 'VALIDATION',
      };
    }

    // Step 2: Validate Signature
    const signatureValid = await this.validateSignature(pkg);
    if (!signatureValid) {
      return {
        employeeId: pkg.employeeId,
        success: false,
        errorMessage: 'Signature verification failed',
        failedStep: 'SIGNATURE',
      };
    }

    // Step 3: Parse the encrypted embedding payload
    let encryptedPayload: EncryptedPayload;
    try {
      encryptedPayload = JSON.parse(pkg.encryptedEmbedding);
    } catch {
      return {
        employeeId: pkg.employeeId,
        success: false,
        errorMessage: 'Failed to parse encrypted embedding payload',
        failedStep: 'DECRYPTION',
      };
    }

    // Step 4: Store Identity
    try {
      const identity: CachedIdentity = {
        employeeId: pkg.employeeId,
        projectId: pkg.projectId,
        embeddingVersion: pkg.embeddingVersion,
        lastSyncTimestamp: new Date().toISOString(),
        isActive: true,
      };

      // Check if this employee already exists — update if so, create if not
      const existing = await this.identityCache.getIdentity(pkg.employeeId);
      if (existing) {
        await this.identityCache.updateIdentity(identity, encryptedPayload);
      } else {
        await this.identityCache.storeIdentity(identity, encryptedPayload);
      }
    } catch (error) {
      return {
        employeeId: pkg.employeeId,
        success: false,
        errorMessage: `Storage failed: ${(error as Error).message}`,
        failedStep: 'STORAGE',
      };
    }

    return {
      employeeId: pkg.employeeId,
      success: true,
    };
  }

  /**
   * Processes a batch of enrollment packages sequentially.
   */
  async processBatch(packages: EnrollmentPackage[]): Promise<EnrollmentResult[]> {
    const results: EnrollmentResult[] = [];
    for (const pkg of packages) {
      const result = await this.processEnrollment(pkg);
      results.push(result);
    }
    return results;
  }

  // --- Private Validation ---

  private validateStructure(pkg: EnrollmentPackage): string | null {
    if (!pkg.employeeId || typeof pkg.employeeId !== 'string') {
      return 'Missing or invalid employeeId';
    }
    if (!pkg.projectId || typeof pkg.projectId !== 'string') {
      return 'Missing or invalid projectId';
    }
    if (!pkg.embeddingVersion || typeof pkg.embeddingVersion !== 'string') {
      return 'Missing or invalid embeddingVersion';
    }
    if (!pkg.encryptedEmbedding || typeof pkg.encryptedEmbedding !== 'string') {
      return 'Missing or invalid encryptedEmbedding';
    }
    if (!pkg.signature || typeof pkg.signature !== 'string') {
      return 'Missing or invalid signature';
    }
    return null;
  }

  /**
   * Cryptographically verifies the enrollment package signature.
   */
  private async validateSignature(pkg: EnrollmentPackage): Promise<boolean> {
    const signatureService = new EnrollmentSignatureService();
    
    // The payload that the server signed (e.g., employeeId + projectId + encryptedEmbedding)
    const payloadToVerify = `${pkg.employeeId}:${pkg.projectId}:${pkg.encryptedEmbedding}`;
    
    const result = await signatureService.verify(payloadToVerify, pkg.signature);
    
    if (!result.isValid) {
      console.warn(`Signature validation failed: ${result.reason}`);
    }
    
    return result.isValid;
  }
}
