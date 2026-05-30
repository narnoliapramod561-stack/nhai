import { ValidationSuite, ValidationResult } from '../ValidationTypes';
import DatabaseService from '../../database/DatabaseService';
import { EmployeeRepository } from '../../database/repositories/EmployeeRepository';
import { AttendanceRepository } from '../../database/repositories/AttendanceRepository';

export class DatabaseValidationSuite implements ValidationSuite {
  name = 'Database Validation Suite';
  private employeeRepo = new EmployeeRepository();
  private attendanceRepo = new AttendanceRepository();

  async run(): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];
    const runTest = async (testId: string, fn: () => Promise<void>) => {
      const start = Date.now();
      try {
        await fn();
        results.push({
          testId, category: 'Database', status: 'PASS', executionMs: Date.now() - start, details: 'Operation succeeded'
        });
      } catch (e: any) {
        results.push({
          testId, category: 'Database', status: 'FAIL', executionMs: Date.now() - start, details: e.message
        });
      }
    };

    await runTest('db_employee_insert', async () => {
      await this.employeeRepo.createEmployee({
        employee_id: 'TEST-DB-1',
        project_id: 'PROJ-TEST',
        embedding_hash: 'dummy',
        embedding_version: 1,
        last_sync_timestamp: new Date().toISOString(),
      });
    });

    await runTest('db_attendance_insert', async () => {
      await this.attendanceRepo.createAttendance({
        attendance_id: 'ATT-TEST-1',
        employee_id: 'TEST-DB-1', // Should not violate FK since we just inserted
        timestamp: new Date().toISOString(),
        status: 'VERIFIED',
        sync_status: 'PENDING',
      });
    });

    await runTest('db_transaction_rollback', async () => {
      try {
        await DatabaseService.runInTransaction(async (tx) => {
          await tx.execute(`INSERT INTO Employee (employee_id) VALUES ('ROLLBACK-1')`);
          throw new Error('Forced Rollback');
        });
      } catch (e) {
        // expected
      }
      const e = await this.employeeRepo.getEmployeeById('ROLLBACK-1');
      if (e) throw new Error('Transaction failed to rollback');
    });

    await runTest('db_fk_enforcement', async () => {
      try {
        await this.attendanceRepo.createAttendance({
          attendance_id: 'ATT-TEST-2',
          employee_id: 'NON-EXISTENT-EMP',
          timestamp: new Date().toISOString(),
          status: 'VERIFIED',
          sync_status: 'PENDING',
        });
        throw new Error('FK violation did not block insert');
      } catch (e: any) {
        if (e.message.includes('block insert')) throw e;
        // Passed if caught and not our custom error
      }
    });

    // Clean up
    try {
      const db = DatabaseService.getDB();
      await db.execute(`DELETE FROM Attendance WHERE attendance_id = 'ATT-TEST-1'`);
      await db.execute(`DELETE FROM Employee WHERE employee_id = 'TEST-DB-1'`);
    } catch (e) {}

    return results;
  }
}
