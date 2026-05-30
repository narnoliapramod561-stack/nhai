import { EncryptedPayload } from '../security/models';

/**
 * Represents a cached worker identity on the local device.
 * Maps directly onto the existing Employee table without schema changes.
 */
export interface CachedIdentity {
  employeeId: string;
  projectId: string;
  embeddingVersion: string;
  lastSyncTimestamp: string;
  isActive: boolean;
}

/**
 * Internal representation binding a CachedIdentity to its encrypted embedding data.
 * The raw embedding Float32Array is NEVER stored in plaintext on disk.
 */
export interface StoredIdentity extends CachedIdentity {
  /** The AES-encrypted embedding blob as stored in the Employee.embedding_hash column. */
  encryptedEmbedding: EncryptedPayload;
  lastUsedAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

/**
 * Cache statistics for monitoring identity storage health.
 */
export interface CacheStatistics {
  totalIdentities: number;
  activeIdentities: number;
  inactiveIdentities: number;
}
