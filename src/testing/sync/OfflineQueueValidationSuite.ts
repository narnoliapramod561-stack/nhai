import { ValidationSuite, ValidationResult } from '../ValidationTypes';
import { OfflineQueueService } from '../../verification/OfflineQueueService';
import { SyncQueueRepository } from '../../database/repositories/SyncQueueRepository';

export class OfflineQueueValidationSuite implements ValidationSuite {
  name = 'Offline Queue Validation Suite';
  private queueService = new OfflineQueueService();
  private repo = new SyncQueueRepository();

  async run(): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];
    const runTest = async (testId: string, fn: () => Promise<void>) => {
      const start = Date.now();
      try {
        await fn();
        results.push({ testId, category: 'Sync', status: 'PASS', executionMs: Date.now() - start, details: 'Queue logic passed' });
      } catch (e: any) {
        results.push({ testId, category: 'Sync', status: 'FAIL', executionMs: Date.now() - start, details: e.message });
      }
    };

    let queueId: string;

    await runTest('sync_queue_insert', async () => {
      queueId = await this.queueService.enqueue('ATT-TEST-QUEUE');
      if (!queueId) throw new Error('Failed to generate queue ID');
    });

    await runTest('sync_exponential_backoff', async () => {
      await this.queueService.retry(queueId, 'Network Error');
      const items = await this.repo.getQueuedItems();
      const item = items.find(i => i.queue_id === queueId);
      if (!item) throw new Error('Item lost from queue');
      if (item.retry_count !== 1) throw new Error('Retry count not incremented');
      if (!item.next_retry_at) throw new Error('Next retry timestamp missing');
    });

    await runTest('sync_completion', async () => {
      await this.queueService.markCompleted(queueId);
      const items = await this.repo.getQueuedItems(); // Only gets 'QUEUED' items
      const item = items.find(i => i.queue_id === queueId);
      if (item) throw new Error('Completed item still in active queue');
    });

    return results;
  }
}
