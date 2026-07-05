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
    expect(row?.user_version).toBe(2);
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

  test('v2 adds the outbox table and stamps user_version 2', async () => {
    const db = createTestDriver();
    await migrate(db);
    await db.runAsync(
      'INSERT INTO outbox (op_type, payload, entity_id, created_at) VALUES (?, ?, ?, ?)',
      ['habit.create', '{}', 'h1', '2026-07-05T10:00:00Z']
    );
    const row = await db.getFirstAsync('PRAGMA user_version');
    expect(row?.user_version).toBe(2);
    db.close();
  });

  test('migrating an existing v1 database up to v2 preserves cached rows', async () => {
    const db = createTestDriver();
    // simulate a device that shipped Phase 1: build v1 exactly, then re-migrate
    await db.execAsync('CREATE TABLE habits (id TEXT PRIMARY KEY NOT NULL, json TEXT NOT NULL)');
    await db.execAsync('CREATE TABLE kv (key TEXT PRIMARY KEY NOT NULL, json TEXT NOT NULL)');
    await db.execAsync(
      'CREATE TABLE categories (id TEXT PRIMARY KEY NOT NULL, json TEXT NOT NULL)'
    );
    await db.execAsync('CREATE TABLE tasks (id TEXT PRIMARY KEY NOT NULL, json TEXT NOT NULL)');
    await db.execAsync('CREATE TABLE goals (id TEXT PRIMARY KEY NOT NULL, json TEXT NOT NULL)');
    await db.execAsync('CREATE TABLE routines (id TEXT PRIMARY KEY NOT NULL, json TEXT NOT NULL)');
    await db.execAsync('PRAGMA user_version = 1');
    await db.runAsync('INSERT INTO habits (id, json) VALUES (?, ?)', ['h1', '{"id":"h1"}']);
    await migrate(db);
    expect(await db.getAllAsync('SELECT id FROM habits')).toHaveLength(1);
    await db.runAsync(
      'INSERT INTO outbox (op_type, payload, created_at) VALUES (?, ?, ?)',
      ['x', '{}', 'now']
    );
    db.close();
  });
});
