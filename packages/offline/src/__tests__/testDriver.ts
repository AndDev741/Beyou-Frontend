import Database from 'better-sqlite3';
import type { SqlDriver, SqlRow } from '../driver';

/** In-memory real-SQLite driver for vitest. Mirrors what expo-sqlite does natively. */
export function createTestDriver(): SqlDriver & { close: () => void } {
  const db = new Database(':memory:');
  return {
    async execAsync(sql) {
      db.exec(sql);
    },
    async runAsync(sql, params = []) {
      db.prepare(sql).run(...(params as never[]));
    },
    async getAllAsync(sql, params = []) {
      return db.prepare(sql).all(...(params as never[])) as SqlRow[];
    },
    async getFirstAsync(sql, params = []) {
      return ((db.prepare(sql).get(...(params as never[])) ?? null)) as SqlRow | null;
    },
    async withTransactionAsync(fn) {
      db.exec('BEGIN');
      try {
        await fn();
        db.exec('COMMIT');
      } catch (e) {
        db.exec('ROLLBACK');
        throw e;
      }
    },
    close: () => db.close(),
  };
}
