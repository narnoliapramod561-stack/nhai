import { EmployeeRepository } from '../database/repositories/EmployeeRepository';
import { Employee } from '../database/models/Employee';
import SecurityService from '../security/SecurityService';
import { CachedIdentity, StoredIdentity } from './IdentityTypes';
import { EncryptedPayload } from '../security/models';

/**
 * Service layer managing the local identity cache.
 * Reads/writes to the existing Employee table via EmployeeRepository.
 * Embeddings are always stored encrypted via SecurityService.
 */
export class IdentityCacheService {
  private employeeRepo = new EmployeeRepository();

  /**
   * Retrieves a cached identity by employee ID.
   * Does NOT decrypt the embedding — that is done on-demand during matching.
   */
  async getIdentity(employeeId: string): Promise<CachedIdentity | null> {
    const employee = await this.employeeRepo.getEmployeeById(employeeId);
    if (!employee) return null;

    return this.toCachedIdentity(employee);
  }

  /**
   * Stores a new identity with its encrypted embedding.
   */
  async storeIdentity(
    identity: CachedIdentity,
    encryptedEmbedding: EncryptedPayload
  ): Promise<void> {
    const now = new Date().toISOString();
    const employee: Employee = {
      employee_id: identity.employeeId,
      project_id: identity.projectId,
      embedding_hash: JSON.stringify(encryptedEmbedding),
      embedding_version: parseInt(identity.embeddingVersion, 10) || 1,
      last_sync_timestamp: identity.lastSyncTimestamp,
      last_used_at: now,
      created_at: now,
      updated_at: now,
    };

    await this.employeeRepo.createEmployee(employee);
  }

  /**
   * Updates an existing identity's metadata and/or embedding.
   */
  async updateIdentity(
    identity: CachedIdentity,
    encryptedEmbedding?: EncryptedPayload
  ): Promise<void> {
    const existing = await this.employeeRepo.getEmployeeById(identity.employeeId);
    if (!existing) {
      throw new Error(`Identity not found: ${identity.employeeId}`);
    }

    const now = new Date().toISOString();
    const updated: Employee = {
      ...existing,
      project_id: identity.projectId,
      embedding_version: parseInt(identity.embeddingVersion, 10) || existing.embedding_version,
      last_sync_timestamp: identity.lastSyncTimestamp,
      updated_at: now,
    };

    if (encryptedEmbedding) {
      updated.embedding_hash = JSON.stringify(encryptedEmbedding);
    }

    await this.employeeRepo.updateEmployee(updated);
  }

  /**
   * Soft-deactivates an identity by clearing its last_used_at timestamp.
   * The row is NOT deleted — it remains for audit purposes.
   */
  async deactivateIdentity(employeeId: string): Promise<void> {
    const existing = await this.employeeRepo.getEmployeeById(employeeId);
    if (!existing) return;

    const updated: Employee = {
      ...existing,
      last_used_at: null,
      updated_at: new Date().toISOString(),
    };

    await this.employeeRepo.updateEmployee(updated);
  }

  /**
   * Decrypts and returns the raw 192-d embedding for a given employee.
   */
  async decryptEmbedding(employeeId: string): Promise<Float32Array | null> {
    const employee = await this.employeeRepo.getEmployeeById(employeeId);
    if (!employee || !employee.embedding_hash) return null;

    const payload: EncryptedPayload =
      typeof employee.embedding_hash === 'string'
        ? JSON.parse(employee.embedding_hash)
        : (employee.embedding_hash as unknown as EncryptedPayload);

    const decrypted = await SecurityService.decryptPayload<number[]>(payload, true);
    return new Float32Array(decrypted as number[]);
  }

  /**
   * Marks an identity as recently used (for LRU tracking).
   */
  async markAsUsed(employeeId: string): Promise<void> {
    const existing = await this.employeeRepo.getEmployeeById(employeeId);
    if (!existing) return;

    const updated: Employee = {
      ...existing,
      last_used_at: new Date().toISOString(),
    };

    await this.employeeRepo.updateEmployee(updated);
  }

  // --- Private Helpers ---

  private toCachedIdentity(e: Employee): CachedIdentity {
    return {
      employeeId: e.employee_id,
      projectId: e.project_id,
      embeddingVersion: String(e.embedding_version),
      lastSyncTimestamp: e.last_sync_timestamp ?? '',
      isActive: e.last_used_at != null,
    };
  }
}
