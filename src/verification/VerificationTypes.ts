/**
 * DTOs for the verification transaction layer.
 */

/**
 * Represents a single verification event (a completed biometric match attempt).
 * Maps onto the existing Attendance table without schema changes.
 */
export interface VerificationTransaction {
  transactionId: string;
  employeeId: string;
  timestamp: string;
  latitude: number;
  longitude: number;
  matchScore: number;
  qualityScore: number;
  livenessPassed: boolean;
  embeddingVersion: string;
}

/**
 * Summary used for explainability / debugging / audit trail.
 */
export interface VerificationSummary {
  matchScore: number;
  qualityScore: number;
  livenessPassed: boolean;
  decision: string;
  verificationTimeMs: number;
}
