import { open, DB } from '@op-engineering/op-sqlite';
import { initialMigration } from './migrations/001_initial_schema';

class Mutex {
  private mutex = Promise.resolve();
  lock(): Promise<() => void> {
    let begin: (unlock: () => void) => void = () => {};
    this.mutex = this.mutex.then(() => {
      return new Promise(begin);
    });
    return new Promise((res) => {
      begin = res;
    });
  }
}

class DatabaseService {
  private static instance: DatabaseService;
  private db: DB | null = null;
  private transactionMutex = new Mutex();

  private constructor() {}

  public static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  public open(): void {
    if (!this.db) {
      this.db = open({ name: 'attendance.db' });
      // Enforce foreign keys
      this.db.execute('PRAGMA foreign_keys = ON;').catch((error) => {
        console.error('Failed to enable SQLite foreign keys', error);
      });
    }
  }

  public close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }

  public getDB(): DB {
    if (!this.db) {
      throw new Error('Database is not open');
    }
    return this.db;
  }

  public async runMigrations(): Promise<void> {
    const db = this.getDB();

    await db.execute('PRAGMA foreign_keys = ON;');
    
    await db.execute(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        migration_name TEXT NOT NULL,
        executed_at TEXT NOT NULL
      );
    `);

    const result = await db.execute(
      `SELECT * FROM schema_migrations WHERE migration_name = ?`,
      ['001_initial_schema']
    );

    const hasRun = result.rows.length > 0;

    if (!hasRun) {
      await this.runInTransaction(async (tx) => {
        for (const query of initialMigration) {
          await tx.execute(query);
        }
        await tx.execute(
          `INSERT INTO schema_migrations (migration_name, executed_at) VALUES (?, ?)`,
          ['001_initial_schema', new Date().toISOString()]
        );
      });
    }
  }

  public async runInTransaction<T>(callback: (tx: DB) => Promise<T>): Promise<T> {
    const unlock = await this.transactionMutex.lock();
    const db = this.getDB();
    try {
      await db.execute('BEGIN TRANSACTION;');
      const result = await callback(db);
      await db.execute('COMMIT;');
      return result;
    } catch (error) {
      await db.execute('ROLLBACK;');
      throw error;
    } finally {
      unlock();
    }
  }
}

export default DatabaseService.getInstance();
