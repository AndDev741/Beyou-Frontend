import { beforeEach, describe, expect, test, vi } from 'vitest';
import { createTestDriver } from './testDriver';
import { migrate } from '../schema';
import { readCollection, writeCollection } from '../cache';
import { cachedList } from '../swr';
import type { SqlDriver } from '../driver';

type Item = { id: string; name: string };

let db: SqlDriver & { close: () => void };

beforeEach(async () => {
  db = createTestDriver();
  await migrate(db);
});

describe('cachedList', () => {
  test('emits cached rows first, then fresh network rows, and persists them', async () => {
    await writeCollection<Item>(db, 'habits', [{ id: 'h1', name: 'Cached' }]);
    const calls: Array<[Item[], string]> = [];
    const result = await cachedList<Item>({
      db,
      table: 'habits',
      fetch: async () => ({ success: [{ id: 'h1', name: 'Fresh' }] }),
      onRows: (rows, source) => calls.push([rows, source]),
    });
    expect(result).toEqual({});
    expect(calls).toEqual([
      [[{ id: 'h1', name: 'Cached' }], 'cache'],
      [[{ id: 'h1', name: 'Fresh' }], 'network'],
    ]);
    expect(await readCollection<Item>(db, 'habits')).toEqual([{ id: 'h1', name: 'Fresh' }]);
  });

  test('empty cache: no cache emission, network rows land and persist', async () => {
    const onRows = vi.fn();
    await cachedList<Item>({
      db,
      table: 'habits',
      fetch: async () => ({ success: [{ id: 'h2', name: 'New' }] }),
      onRows,
    });
    expect(onRows).toHaveBeenCalledTimes(1);
    expect(onRows).toHaveBeenCalledWith([{ id: 'h2', name: 'New' }], 'network');
  });

  test('network failure with warm cache stays silent (offline mode)', async () => {
    await writeCollection<Item>(db, 'habits', [{ id: 'h1', name: 'Cached' }]);
    const onRows = vi.fn();
    const result = await cachedList<Item>({
      db,
      table: 'habits',
      fetch: async () => ({ error: 'UnexpectedError' }),
      onRows,
    });
    expect(result).toEqual({});
    expect(onRows).toHaveBeenCalledTimes(1);
    expect(onRows).toHaveBeenCalledWith([{ id: 'h1', name: 'Cached' }], 'cache');
    // cache untouched
    expect(await readCollection<Item>(db, 'habits')).toHaveLength(1);
  });

  test('network failure with cold cache surfaces the error', async () => {
    const result = await cachedList<Item>({
      db,
      table: 'habits',
      fetch: async () => ({ error: 'UnexpectedError' }),
      onRows: () => {},
    });
    expect(result).toEqual({ error: 'UnexpectedError' });
  });

  test('a throwing fetch is treated as network failure, not a crash', async () => {
    await writeCollection<Item>(db, 'habits', [{ id: 'h1', name: 'Cached' }]);
    const result = await cachedList<Item>({
      db,
      table: 'habits',
      fetch: async () => {
        throw new Error('boom');
      },
      onRows: () => {},
    });
    expect(result).toEqual({});
  });

  test('an empty network list replaces the cache (user deleted everything)', async () => {
    await writeCollection<Item>(db, 'habits', [{ id: 'h1', name: 'Cached' }]);
    const calls: Array<[Item[], string]> = [];
    await cachedList<Item>({
      db,
      table: 'habits',
      fetch: async () => ({ success: [] }),
      onRows: (rows, source) => calls.push([rows, source]),
    });
    expect(calls[1]).toEqual([[], 'network']);
    expect(await readCollection<Item>(db, 'habits')).toEqual([]);
  });
});
