import type { SqlDriver } from './driver';
import { CACHE_TABLES, type CacheTable } from './schema';

/** Read a whole mirrored collection. Empty array = cache miss OR genuinely empty — same UI outcome. */
export async function readCollection<T>(db: SqlDriver, table: CacheTable): Promise<T[]> {
  const rows = await db.getAllAsync(`SELECT json FROM ${table}`);
  return rows.map((r) => JSON.parse(r.json as string) as T);
}

/** Replace the mirrored collection with the server's list (full-pull semantics). */
export async function writeCollection<T extends { id?: string }>(
  db: SqlDriver,
  table: CacheTable,
  rows: T[]
): Promise<void> {
  await db.withTransactionAsync(async () => {
    await db.runAsync(`DELETE FROM ${table}`);
    for (const row of rows) {
      if (!row.id) continue;
      await db.runAsync(`INSERT INTO ${table} (id, json) VALUES (?, ?)`, [
        row.id,
        JSON.stringify(row),
      ]);
    }
  });
}

export async function readKV<T>(db: SqlDriver, key: string): Promise<T | null> {
  const row = await db.getFirstAsync('SELECT json FROM kv WHERE key = ?', [key]);
  return row ? (JSON.parse(row.json as string) as T) : null;
}

export async function writeKV(db: SqlDriver, key: string, value: unknown): Promise<void> {
  await db.runAsync('INSERT OR REPLACE INTO kv (key, json) VALUES (?, ?)', [
    key,
    JSON.stringify(value),
  ]);
}

/** Purge everything — called on logout so the next account can't inherit cached data. */
export async function clearAll(db: SqlDriver): Promise<void> {
  await db.withTransactionAsync(async () => {
    for (const table of CACHE_TABLES) {
      await db.runAsync(`DELETE FROM ${table}`);
    }
    await db.runAsync('DELETE FROM kv');
  });
}
