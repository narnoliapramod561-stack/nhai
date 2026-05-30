import { VerificationTransaction } from '../../verification/VerificationTypes';
import { AttendanceSyncPayload, BatchSyncPayload } from './DatalakeContracts';

/**
 * Converts internal VerificationTransaction DTOs into the
 * Datalake 3.0 AttendanceSyncPayload format.
 * 
 * Pure data transformation — NO network calls.
 */
export class SyncPayloadBuilder {
  /**
   * Converts a single VerificationTransaction to a Datalake-compatible payload.
   */
  static buildPayload(txn: VerificationTransaction): AttendanceSyncPayload {
    return {
      transactionId: txn.transactionId,
      employeeId: txn.employeeId,
      timestamp: txn.timestamp,
      gps: {
        latitude: txn.latitude,
        longitude: txn.longitude,
      },
      matchScore: txn.matchScore,
      qualityScore: txn.qualityScore,
      livenessPassed: txn.livenessPassed,
      embeddingVersion: txn.embeddingVersion,
    };
  }

  /**
   * Wraps multiple payloads into a batch for efficient bulk upload.
   */
  static buildBatch(
    transactions: VerificationTransaction[],
    deviceId: string,
    projectId: string
  ): BatchSyncPayload {
    return {
      batchId: `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      deviceId,
      projectId,
      payloads: transactions.map(this.buildPayload),
      submittedAt: new Date().toISOString(),
    };
  }
}
