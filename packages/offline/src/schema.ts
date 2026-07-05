import type { SqlDriver } from './driver';

/** One mirror table per server collection. Table names are ONLY ever taken from this const. */
export const CACHE_TABLES = ['categories', 'habits', 'tasks', 'goals', 'routines'] as const;
export type CacheTable = (typeof CACHE_TABLES)[number];

const SCHEMA_VERSION = 2;

/**
 * Idempotent, versioned migrations via PRAGMA user_version.
 * v1: JSON-per-row mirror tables + a kv table (perfil, todayRoutine — and, in
 * Phase 2, sync metadata). Phase 2 adds the outbox table as v2.
 */
export async function migrate(db: SqlDriver): Promise<void> {
  const row = await db.getFirstAsync('PRAGMA user_version');
  const current = (row?.user_version as number | undefined) ?? 0;
  if (current >= SCHEMA_VERSION) return;
  if (current < 1) {
    for (const table of CACHE_TABLES) {
      await db.execAsync(
        `CREATE TABLE IF NOT EXISTS ${table} (id TEXT PRIMARY KEY NOT NULL, json TEXT NOT NULL)`
      );
    }
    await db.execAsync(
      'CREATE TABLE IF NOT EXISTS kv (key TEXT PRIMARY KEY NOT NULL, json TEXT NOT NULL)'
    );
  }
  if (current < 2) {
    await db.execAsync(
      `CREATE TABLE IF NOT EXISTS outbox (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        op_type TEXT NOT NULL,
        payload TEXT NOT NULL,
        entity_id TEXT,
        created_at TEXT NOT NULL,
        attempts INTEGER NOT NULL DEFAULT 0,
        last_error TEXT
      )`
    );
  }
  await db.execAsync(`PRAGMA user_version = ${SCHEMA_VERSION}`);
}
