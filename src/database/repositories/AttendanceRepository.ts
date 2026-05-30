import DatabaseService from '../DatabaseService';
import { Attendance } from '../models/Attendance';
import { DatabaseError } from '../errors';

export class AttendanceRepository {
  async createAttendance(attendance: Attendance): Promise<void> {
    try {
      const db = DatabaseService.getDB();
      await db.execute(
        `INSERT INTO Attendance (attendance_id, uuid, employee_id, timestamp, gps_lat, gps_lon, verification_score, status, sync_status, remote_id, sync_error, previous_hash, record_hash, signature, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          attendance.attendance_id, attendance.uuid ?? null, attendance.employee_id, attendance.timestamp, 
          attendance.gps_lat ?? null, attendance.gps_lon ?? null, 
          attendance.verification_score ?? null, attendance.status ?? null, 
          attendance.sync_status ?? null, attendance.remote_id ?? null,
          attendance.sync_error ?? null, attendance.previous_hash ?? null,
          attendance.record_hash ?? null, attendance.signature ?? null, attendance.created_at ?? null
        ]
      );
    } catch (error) {
      throw new DatabaseError(`Failed to create attendance log: ${(error as Error).message}`, error);
    }
  }

  async getAttendanceById(attendance_id: string): Promise<Attendance | null> {
    try {
      const db = DatabaseService.getDB();
      const result = await db.execute(
        `SELECT * FROM Attendance WHERE attendance_id = ? LIMIT 1`,
        [attendance_id]
      );
      const rows = result.rows;
      return rows.length > 0 ? (rows[0] as unknown as Attendance) : null;
    } catch (error) {
      throw new DatabaseError(`Failed to fetch attendance log: ${(error as Error).message}`, error);
    }
  }

  async getPendingAttendance(): Promise<Attendance[]> {
    try {
      const db = DatabaseService.getDB();
      const result = await db.execute(
        `SELECT * FROM Attendance WHERE sync_status = 'PENDING'`
      );
      return result.rows as unknown as Attendance[];
    } catch (error) {
      throw new DatabaseError(`Failed to fetch pending attendance logs: ${(error as Error).message}`, error);
    }
  }

  async updateAttendanceStatus(attendance_id: string, status: string, sync_status: string, sync_error?: string, remote_id?: string): Promise<void> {
    try {
      const db = DatabaseService.getDB();
      await db.execute(
        `UPDATE Attendance SET status = ?, sync_status = ?, sync_error = ?, remote_id = ? WHERE attendance_id = ?`,
        [status, sync_status, sync_error ?? null, remote_id ?? null, attendance_id]
      );
    } catch (error) {
      throw new DatabaseError(`Failed to update attendance status: ${(error as Error).message}`, error);
    }
  }
}
