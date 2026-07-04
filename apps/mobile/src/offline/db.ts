import { openDatabaseAsync, type SQLiteBindValue, type SQLiteDatabase } from 'expo-sqlite';
import { clearAll, migrate, type SqlDriver } from '@beyou/offline';

// Thin pass-through: expo-sqlite's async API already matches SqlDriver 1:1.
function wrap(db: SQLiteDatabase): SqlDriver {
  return {
    execAsync: (sql) => db.execAsync(sql),
    runAsync: async (sql, params = []) => {
      await db.runAsync(sql, params as SQLiteBindValue[]);
    },
    getAllAsync: (sql, params = []) => db.getAllAsync(sql, params as SQLiteBindValue[]),
    getFirstAsync: (sql, params = []) => db.getFirstAsync(sql, params as SQLiteBindValue[]),
    withTransactionAsync: (fn) => db.withTransactionAsync(fn),
  };
}

let dbPromise: Promise<SqlDriver> | null = null;

/**
 * Singleton offline-cache DB: opened lazily, WAL mode, migrations applied once.
 * Every cache access in the app flows through this module so tests mock one seam.
 */
export function getDb(): Promise<SqlDriver> {
  if (!dbPromise) {
    dbPromise = (async () => {
      const raw = await openDatabaseAsync('beyou.db');
      await raw.execAsync('PRAGMA journal_mode = WAL');
      const driver = wrap(raw);
      await migrate(driver);
      return driver;
    })();
    dbPromise.catch(() => {
      dbPromise = null;
    });
  }
  return dbPromise;
}

/** Purge all cached data — logout must not leak one account's data to the next. */
export async function clearOfflineCache(): Promise<void> {
  const db = await getDb();
  await clearAll(db);
}
