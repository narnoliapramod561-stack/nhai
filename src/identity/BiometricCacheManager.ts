import DatabaseService from '../database/DatabaseService';
import { CacheStatistics } from './IdentityTypes';
import { IdentityCacheService } from './IdentityCacheService';

/**
 * Manages the on-device identity cache with LRU eviction.
 * Operates entirely on the existing Employee table using the `last_used_at` column.
 * NO schema changes.
 */
export class BiometricCacheManager {
  private identityCache = new IdentityCacheService();

  /**
   * Returns the least recently used identities (candidates for eviction).
   * @param limit Number of LRU entries to return.
   */
  async getLeastRecentlyUsed(limit: number = 10): Promise<string[]> {
    const db = DatabaseService.getDB();
    const result = await db.execute(
      `SELECT employee_id FROM Employee 
       WHERE last_used_at IS NOT NULL 
       ORDER BY last_used_at ASC 
       LIMIT ?`,
      [limit]
    );
    const rows = result.rows ?? [];
    return rows.map((r: any) => r.employee_id);
  }

  /**
   * Stamps the identity as recently used (LRU refresh).
   */
  async markAsUsed(employeeId: string): Promise<void> {
    await this.identityCache.markAsUsed(employeeId);
  }

  /**
   * Evicts identities that have not been used since `cutoffDate`.
   * Does NOT delete — soft-deactivates by nulling `last_used_at`.
   */
  async evictInactiveEntries(cutoffDate: string): Promise<number> {
    const db = DatabaseService.getDB();
    const result = await db.execute(
      `SELECT employee_id FROM Employee 
       WHERE last_used_at IS NOT NULL 
       AND last_used_at < ?`,
      [cutoffDate]
    );
    const rows = result.rows ?? [];

    for (const row of rows) {
      await this.identityCache.deactivateIdentity(row.employee_id as string);
    }

    return rows.length;
  }

  /**
   * Returns aggregate cache statistics.
   */
  async getCacheStatistics(): Promise<CacheStatistics> {
    const db = DatabaseService.getDB();

    const totalResult = await db.execute(
      `SELECT COUNT(*) as count FROM Employee`
    );
    const activeResult = await db.execute(
      `SELECT COUNT(*) as count FROM Employee WHERE last_used_at IS NOT NULL`
    );
    const inactiveResult = await db.execute(
      `SELECT COUNT(*) as count FROM Employee WHERE last_used_at IS NULL`
    );

    const extractCount = (res: any): number => {
      const rows = res.rows ?? [];
      return rows.length > 0 ? (rows[0].count ?? 0) : 0;
    };

    return {
      totalIdentities: extractCount(totalResult),
      activeIdentities: extractCount(activeResult),
      inactiveIdentities: extractCount(inactiveResult),
    };
  }
}
