import { beforeEach, describe, expect, test } from 'vitest';
import { createTestDriver } from './testDriver';
import { migrate } from '../schema';
import { clearAll, readCollection, readKV, writeCollection, writeKV } from '../cache';
import type { SqlDriver } from '../driver';

let db: SqlDriver & { close: () => void };

beforeEach(async () => {
  db = createTestDriver();
  await migrate(db);
});

describe('collections', () => {
  test('write then read round-trips full JSON payloads', async () => {
    const rows = [
      { id: 'h1', name: 'Meditate', dificulty: 3, nested: { xp: 10 } },
      { id: 'h2', name: 'Run', dificulty: 5, nested: { xp: 0 } },
    ];
    await writeCollection(db, 'habits', rows);
    const back = await readCollection<(typeof rows)[number]>(db, 'habits');
    expect(back).toHaveLength(2);
    expect(back.find((r) => r.id === 'h1')).toEqual(rows[0]);
  });

  test('write replaces the previous contents (server list is the truth)', async () => {
    await writeCollection(db, 'habits', [{ id: 'h1', name: 'Old' }]);
    await writeCollection(db, 'habits', [{ id: 'h2', name: 'New' }]);
    const back = await readCollection<{ id: string; name: string }>(db, 'habits');
    expect(back).toEqual([{ id: 'h2', name: 'New' }]);
  });

  test('an empty server list clears the table', async () => {
    await writeCollection(db, 'habits', [{ id: 'h1' }]);
    await writeCollection(db, 'habits', []);
    expect(await readCollection(db, 'habits')).toEqual([]);
  });

  test('rows without an id are skipped, not crashed on', async () => {
    await writeCollection(db, 'routines', [{ id: 'r1', name: 'A' }, { name: 'no-id' }]);
    expect(await readCollection(db, 'routines')).toHaveLength(1);
  });

  test('reading a never-written table returns []', async () => {
    expect(await readCollection(db, 'goals')).toEqual([]);
  });

  test('a row with corrupt JSON is skipped; the valid rows still come back', async () => {
    await writeCollection(db, 'habits', [{ id: 'h1', name: 'Good' }]);
    await db.runAsync('INSERT INTO habits (id, json) VALUES (?, ?)', ['h2', '{not valid json']);
    const rows = await readCollection<{ id: string; name?: string }>(db, 'habits');
    expect(rows).toEqual([{ id: 'h1', name: 'Good' }]);
  });

  test('duplicate-id rows in one writeCollection reject and the previous cache survives (rollback)', async () => {
    await writeCollection(db, 'habits', [{ id: 'h1', name: 'Old' }]);
    await expect(
      writeCollection(db, 'habits', [
        { id: 'dup', name: 'A' },
        { id: 'dup', name: 'B' },
      ])
    ).rejects.toThrow();
    expect(await readCollection(db, 'habits')).toEqual([{ id: 'h1', name: 'Old' }]);
  });
});

describe('kv', () => {
  test('round-trips values and returns null for missing keys', async () => {
    expect(await readKV(db, 'perfil')).toBeNull();
    await writeKV(db, 'perfil', { name: 'André', xp: 42 });
    expect(await readKV(db, 'perfil')).toEqual({ name: 'André', xp: 42 });
  });

  test('overwrites an existing key', async () => {
    await writeKV(db, 'perfil', { xp: 1 });
    await writeKV(db, 'perfil', { xp: 2 });
    expect(await readKV(db, 'perfil')).toEqual({ xp: 2 });
  });

  test('a corrupt kv row reads back as null instead of throwing', async () => {
    await db.runAsync('INSERT INTO kv (key, json) VALUES (?, ?)', ['perfil', '{not valid json']);
    expect(await readKV(db, 'perfil')).toBeNull();
  });
});

describe('clearAll', () => {
  test('empties every cache table and the kv store', async () => {
    await writeCollection(db, 'habits', [{ id: 'h1' }]);
    await writeKV(db, 'perfil', { xp: 1 });
    await clearAll(db);
    expect(await readCollection(db, 'habits')).toEqual([]);
    expect(await readKV(db, 'perfil')).toBeNull();
  });
});
