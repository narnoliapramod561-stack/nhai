/**
 * Datalake 3.0 Sync Contracts.
 * These represent the exact payload shapes required by the backend APIs.
 * NO axios. NO fetch. Only data contracts.
 */

/**
 * The final payload shape that will be POST'ed to the Datalake attendance endpoint.
 */
export interface AttendanceSyncPayload {
  transactionId: string;
  employeeId: string;
  timestamp: string;
  gps: {
    latitude: number;
    longitude: number;
  };
  matchScore: number;
  qualityScore: number;
  livenessPassed: boolean;
  embeddingVersion: string;
}

/**
 * Batch sync wrapper for sending multiple transactions in a single request.
 */
export interface BatchSyncPayload {
  batchId: string;
  deviceId: string;
  projectId: string;
  payloads: AttendanceSyncPayload[];
  submittedAt: string;
}
