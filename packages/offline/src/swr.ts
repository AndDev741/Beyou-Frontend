import type { SqlDriver } from './driver';
import type { CacheTable } from './schema';
import { readCollection, writeCollection } from './cache';

export interface CachedListOptions<T extends { id?: string }> {
  db: SqlDriver;
  table: CacheTable;
  /** An @beyou/api list fn: resolves to `{success: T[]}` or `{error: string}`. */
  fetch: () => Promise<Record<string, unknown>>;
  onRows: (rows: T[], source: 'cache' | 'network') => void;
}

/**
 * Stale-while-revalidate list read: emit the SQLite mirror immediately (works
 * offline), then fetch; on success persist and emit fresh rows. A failed fetch
 * over a warm cache is silent — that IS offline mode, not an error.
 */
export async function cachedList<T extends { id?: string }>(
  opts: CachedListOptions<T>
): Promise<{ error?: string }> {
  const cached = await readCollection<T>(opts.db, opts.table);
  if (cached.length > 0) {
    opts.onRows(cached, 'cache');
  }

  let res: Record<string, unknown>;
  try {
    res = await opts.fetch();
  } catch {
    res = {};
  }

  if (Array.isArray(res.success)) {
    const rows = res.success as T[];
    await writeCollection(opts.db, opts.table, rows);
    opts.onRows(rows, 'network');
    return {};
  }

  if (cached.length > 0) return {};
  return typeof res.error === 'string' ? { error: res.error } : {};
}
