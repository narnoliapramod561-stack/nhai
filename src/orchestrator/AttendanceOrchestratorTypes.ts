/**
 * Strict state definitions for the attendance verification flow.
 */
export enum AttendanceState {
  IDLE = 'IDLE',
  DETECTING_FACE = 'DETECTING_FACE',
  QUALITY_CHECK = 'QUALITY_CHECK',
  LIVENESS_CHECK = 'LIVENESS_CHECK',
  EMBEDDING_EXTRACTION = 'EMBEDDING_EXTRACTION',
  EMBEDDING_FUSION = 'EMBEDDING_FUSION',
  MATCHING = 'MATCHING',
  TRANSACTION_CREATION = 'TRANSACTION_CREATION',
  QUEUEING = 'QUEUEING',
  SUCCESS = 'SUCCESS',
  FAILURE = 'FAILURE'
}

/**
 * Breakdown of latency across all biometric and I/O subsystems.
 */
export interface AttendanceTimingMetrics {
  detectionMs: number;
  qualityMs: number;
  livenessMs: number;
  embeddingMs: number;
  fusionMs: number;
  matchingMs: number;
  transactionMs: number;
  queueMs: number;
  totalMs: number;
}

/**
 * The final output of the master orchestrator.
 */
export interface AttendanceResult {
  success: boolean;
  employeeId?: string;
  matchScore?: number;
  qualityScore?: number;
  livenessPassed: boolean;
  transactionId?: string;
  queued: boolean;
  failureReason?: string;
  executionTimeMs: number;
}
