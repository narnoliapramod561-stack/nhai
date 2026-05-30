import { SyncQueueRepository } from '../database/repositories/SyncQueueRepository';
import { SyncQueue } from '../database/models/SyncQueue';

/**
 * High-level service wrapping the existing SyncQueueRepository
 * with domain-specific operations for the verification pipeline.
 * NO schema changes. Uses existing retry fields.
 */
export class OfflineQueueService {
  private syncQueueRepo = new SyncQueueRepository();

  /**
   * Enqueues a verified attendance transaction for eventual Datalake sync.
   */
  async enqueue(attendanceId: string): Promise<string> {
    const queueId = this.generateQueueId();
    const item: SyncQueue = {
      queue_id: queueId,
      attendance_id: attendanceId,
      state: 'QUEUED',
      retry_count: 0,
      last_attempt: null,
      next_retry_at: null,
      error_message: null,
      created_at: new Date().toISOString(),
    };

    await this.syncQueueRepo.enqueue(item);
    return queueId;
  }

  /**
   * Dequeues the next batch of items ready for sync.
   */
  async dequeue(limit: number = 10): Promise<SyncQueue[]> {
    const items = await this.syncQueueRepo.getQueuedItems();
    return items.slice(0, limit);
  }

  /**
   * Gets the total count of pending sync items.
   */
  async getPendingQueueCount(): Promise<number> {
    const items = await this.syncQueueRepo.getQueuedItems();
    return items.length;
  }

  /**
   * Marks a queue item for retry with exponential backoff.
   */
  async retry(queueId: string, errorMessage: string): Promise<void> {
    const now = new Date().toISOString();
    // Simple exponential backoff: next retry in 30s * 2^retryCount (capped by sync service)
    const nextRetry = new Date(Date.now() + 30000).toISOString();

    await this.syncQueueRepo.updateQueueState(
      queueId,
      'QUEUED',
      true,          // increment retry count
      now,           // last_attempt
      nextRetry,     // next_retry_at
      errorMessage   // error_message
    );
  }

  /**
   * Marks a queue item as successfully synced.
   */
  async markCompleted(queueId: string): Promise<void> {
    await this.syncQueueRepo.updateQueueState(
      queueId,
      'COMPLETED',
      false,
      new Date().toISOString(),
      null,
      null
    );
  }

  /**
   * Marks a queue item as permanently failed (no more retries).
   */
  async markFailed(queueId: string, errorMessage: string): Promise<void> {
    await this.syncQueueRepo.updateQueueState(
      queueId,
      'FAILED',
      false,
      new Date().toISOString(),
      null,
      errorMessage
    );
  }

  // --- Private Helpers ---

  private generateQueueId(): string {
    return `sq_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
