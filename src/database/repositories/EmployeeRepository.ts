import DatabaseService from '../DatabaseService';
import { Employee } from '../models/Employee';
import { DatabaseError } from '../errors';

export class EmployeeRepository {
  async createEmployee(employee: Employee): Promise<void> {
    try {
      const db = DatabaseService.getDB();
      await db.execute(
        `INSERT INTO Employee (employee_id, project_id, embedding_hash, embedding_version, last_sync_timestamp, last_used_at, created_at, updated_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          employee.employee_id, employee.project_id, employee.embedding_hash, 
          employee.embedding_version, employee.last_sync_timestamp ?? null, 
          employee.last_used_at ?? null, employee.created_at ?? null, employee.updated_at ?? null
        ]
      );
    } catch (error) {
      throw new DatabaseError(`Failed to create employee: ${(error as Error).message}`, error);
    }
  }

  async getEmployeeById(employee_id: string): Promise<Employee | null> {
    try {
      const db = DatabaseService.getDB();
      const result = await db.execute(
        `SELECT * FROM Employee WHERE employee_id = ? LIMIT 1`,
        [employee_id]
      );
      const rows = result.rows;
      return rows.length > 0 ? (rows[0] as unknown as Employee) : null;
    } catch (error) {
      throw new DatabaseError(`Failed to fetch employee: ${(error as Error).message}`, error);
    }
  }

  async updateEmployee(employee: Employee): Promise<void> {
    try {
      const db = DatabaseService.getDB();
      await db.execute(
        `UPDATE Employee SET project_id = ?, embedding_hash = ?, embedding_version = ?, last_sync_timestamp = ?, last_used_at = ?, updated_at = ? WHERE employee_id = ?`,
        [
          employee.project_id, employee.embedding_hash, employee.embedding_version, 
          employee.last_sync_timestamp ?? null, employee.last_used_at ?? null, employee.updated_at ?? null, 
          employee.employee_id
        ]
      );
    } catch (error) {
      throw new DatabaseError(`Failed to update employee: ${(error as Error).message}`, error);
    }
  }

  async deleteEmployee(employee_id: string): Promise<void> {
    try {
      const db = DatabaseService.getDB();
      await db.execute(
        `DELETE FROM Employee WHERE employee_id = ?`,
        [employee_id]
      );
    } catch (error) {
      throw new DatabaseError(`Failed to delete employee: ${(error as Error).message}`, error);
    }
  }
}
