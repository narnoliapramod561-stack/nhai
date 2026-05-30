import { AttendanceRepository } from '../database/repositories/AttendanceRepository';
import { Attendance } from '../database/models/Attendance';
import { VerificationTransaction } from './VerificationTypes';
import DatabaseService from '../database/DatabaseService';

/**
 * Service managing the lifecycle of verification transactions.
 * Stores transactions in the existing Attendance table.
 * NO schema changes.
 */
export class VerificationTransactionService {
  private attendanceRepo = new AttendanceRepository();

  /**
   * Creates and persists a verification transaction.
   * Maps the VerificationTransaction DTO onto the Attendance table columns.
   */
  async createTransaction(txn: VerificationTransaction): Promise<void> {
    const attendance: Attendance = {
      attendance_id: txn.transactionId,
      employee_id: txn.employeeId,
      timestamp: txn.timestamp,
      gps_lat: txn.latitude,
      gps_lon: txn.longitude,
      verification_score: txn.matchScore,
      status: txn.livenessPassed ? 'VERIFIED' : 'REJECTED',
      sync_status: 'PENDING',
      created_at: new Date().toISOString(),
    };

    await this.attendanceRepo.createAttendance(attendance);
  }

  /**
   * Serializes a VerificationTransaction to a JSON string.
   * Used for offline queue payloads and debugging.
   */
  serializeTransaction(txn: VerificationTransaction): string {
    return JSON.stringify({
      transactionId: txn.transactionId,
      employeeId: txn.employeeId,
      timestamp: txn.timestamp,
      latitude: txn.latitude,
      longitude: txn.longitude,
      matchScore: txn.matchScore,
      qualityScore: txn.qualityScore,
      livenessPassed: txn.livenessPassed,
      embeddingVersion: txn.embeddingVersion,
    });
  }

  /**
   * Creates a transaction AND enqueues it for sync in a single logical atomic operation.
   * If either insert fails, the entire transaction is rolled back.
   * Returns the transaction ID for tracking.
   */
  async queueTransaction(txn: VerificationTransaction): Promise<string> {
    const queueId = `sq_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();

    await DatabaseService.runInTransaction(async (tx) => {
      // 1. Persist to Attendance table
      // Note: we use `tx.executeAsync` inside `runInTransaction`. The OP-SQLite DB type may only have `execute`. Let's use execute.
      await tx.execute(
        `INSERT INTO Attendance (attendance_id, uuid, employee_id, timestamp, gps_lat, gps_lon, verification_score, status, sync_status, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          txn.transactionId, null, txn.employeeId, txn.timestamp, 
          txn.latitude, txn.longitude, txn.matchScore, 
          txn.livenessPassed ? 'VERIFIED' : 'REJECTED', 
          'PENDING', now
        ]
      );

      // 2. Persist to SyncQueue table
      await tx.execute(
        `INSERT INTO SyncQueue (queue_id, attendance_id, state, retry_count, created_at)
         VALUES (?, ?, ?, ?, ?)`,
        [
          queueId, txn.transactionId, 'QUEUED', 0, now
        ]
      );
    });

    return txn.transactionId;
  }
}
