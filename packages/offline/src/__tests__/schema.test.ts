import { describe, expect, test } from 'vitest';
import { createTestDriver } from './testDriver';
import { CACHE_TABLES, migrate } from '../schema';

describe('migrate', () => {
  test('creates all cache tables plus kv and stamps user_version', async () => {
    const db = createTestDriver();
    await migrate(db);
    for (const table of CACHE_TABLES) {
      // insert proves the table exists with (id, json) columns
      await db.runAsync(`INSERT INTO ${table} (id, json) VALUES (?, ?)`, ['x', '{}']);
    }
    await db.runAsync('INSERT INTO kv (key, json) VALUES (?, ?)', ['k', '{}']);
    const row = await db.getFirstAsync('PRAGMA user_version');
    expect(row?.user_version).toBe(1);
    db.close();
  });

  test('is idempotent — running twice neither throws nor wipes data', async () => {
    const db = createTestDriver();
    await migrate(db);
    await db.runAsync(`INSERT INTO habits (id, json) VALUES (?, ?)`, ['h1', '{"id":"h1"}']);
    await migrate(db);
    const rows = await db.getAllAsync('SELECT id FROM habits');
    expect(rows).toHaveLength(1);
    db.close();
  });
});
