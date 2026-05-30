/**
 * DTOs for the enrollment sync pipeline.
 * These represent the data contracts between the Datalake and the local device.
 */

/**
 * An enrollment package received from the backend.
 * Contains everything needed to register a worker's biometric identity locally.
 */
export interface EnrollmentPackage {
  employeeId: string;
  projectId: string;
  embeddingVersion: string;
  /** The AES-encrypted embedding blob. */
  encryptedEmbedding: string;
  /** HMAC or RSA signature for tamper verification. */
  signature: string;
}

/**
 * Result of processing a single enrollment package.
 */
export interface EnrollmentResult {
  employeeId: string;
  success: boolean;
  errorMessage?: string;
  /** Step at which the enrollment failed, if applicable. */
  failedStep?: 'VALIDATION' | 'SIGNATURE' | 'DECRYPTION' | 'STORAGE' | 'VERSION_UPDATE';
}
