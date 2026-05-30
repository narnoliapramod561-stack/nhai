import DatabaseService from '../DatabaseService';
import { SyncQueue } from '../models/SyncQueue';
import { DatabaseError } from '../errors';

export class SyncQueueRepository {
  async enqueue(queueItem: SyncQueue): Promise<void> {
    try {
      const db = DatabaseService.getDB();
      await db.execute(
        `INSERT INTO SyncQueue (queue_id, attendance_id, state, retry_count, last_attempt, next_retry_at, error_message, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          queueItem.queue_id, queueItem.attendance_id, queueItem.state, 
          queueItem.retry_count ?? 0, queueItem.last_attempt ?? null, 
          queueItem.next_retry_at ?? null, queueItem.error_message ?? null,
          queueItem.created_at ?? null
        ]
      );
    } catch (error) {
      throw new DatabaseError(`Failed to enqueue sync item: ${(error as Error).message}`, error);
    }
  }

  async getQueuedItems(): Promise<SyncQueue[]> {
    try {
      const db = DatabaseService.getDB();
      const result = await db.execute(
        `SELECT * FROM SyncQueue WHERE state = 'QUEUED' ORDER BY created_at ASC`
      );
      return result.rows as unknown as SyncQueue[];
    } catch (error) {
      throw new DatabaseError(`Failed to fetch queued sync items: ${(error as Error).message}`, error);
    }
  }

  async updateQueueState(queue_id: string, state: string, incrementRetry: boolean = false, last_attempt: string | null = null, next_retry_at: string | null = null, error_message: string | null = null): Promise<void> {
    try {
      const db = DatabaseService.getDB();
      if (incrementRetry) {
        await db.execute(
          `UPDATE SyncQueue SET state = ?, retry_count = retry_count + 1, last_attempt = ?, next_retry_at = ?, error_message = ? WHERE queue_id = ?`,
          [state, last_attempt, next_retry_at, error_message, queue_id]
        );
      } else {
        await db.execute(
          `UPDATE SyncQueue SET state = ?, last_attempt = ?, next_retry_at = ?, error_message = ? WHERE queue_id = ?`,
          [state, last_attempt, next_retry_at, error_message, queue_id]
        );
      }
    } catch (error) {
      throw new DatabaseError(`Failed to update sync queue state: ${(error as Error).message}`, error);
    }
  }

  async removeQueueItem(queue_id: string): Promise<void> {
    try {
      const db = DatabaseService.getDB();
      await db.execute(
        `DELETE FROM SyncQueue WHERE queue_id = ?`,
        [queue_id]
      );
    } catch (error) {
      throw new DatabaseError(`Failed to remove sync queue item: ${(error as Error).message}`, error);
    }
  }
}
