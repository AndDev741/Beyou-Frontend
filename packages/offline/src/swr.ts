import type { SqlDriver } from './driver';
import type { CacheTable } from './schema';
import { readCollection, writeCollection } from './cache';

export interface CachedListOptions<T extends { id?: string }> {
  db: SqlDriver;
  table: CacheTable;
  /** An @beyou/api list fn: resolves to `{success: T[]}` or `{error: string}`. */
  fetch: () => Promise<Record<string, unknown>>;
  onRows: (rows: T[], source: 'cache' | 'network') => void;
  /**
   * Consumer-owned staleness guard (e.g. a logout generation counter captured
   * at load start). When present and false at persist time, network rows are
   * still emitted but NOT written through — closes the "logged out mid-fetch"
   * cross-account cache-bleed race without the caller aborting the fetch.
   */
  shouldWrite?: () => boolean;
}

/**
 * Stale-while-revalidate list read: emit the SQLite mirror immediately (works
 * offline), then fetch; on success persist and emit fresh rows. A failed fetch
 * over a warm cache is silent — that IS offline mode, not an error.
 *
 * Both the initial cache read and the write-through persist are best-effort:
 * a corrupt cache or a failing persist must never drop the network data we
 * already emitted, and must never throw back to the caller.
 */
export async function cachedList<T extends { id?: string }>(
  opts: CachedListOptions<T>
): Promise<{ error?: string }> {
  let cached: T[] = [];
  try {
    cached = await readCollection<T>(opts.db, opts.table);
  } catch {
    cached = []; // treat an unreadable cache as a cold cache, not a crash
  }
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
    opts.onRows(rows, 'network');
    if (!opts.shouldWrite || opts.shouldWrite()) {
      try {
        await writeCollection(opts.db, opts.table, rows);
      } catch {
        // best-effort persist — a write failure must not drop the network
        // data we already emitted, nor hang/error the screen
      }
    }
    return {};
  }

  if (cached.length > 0) return {};
  return typeof res.error === 'string' ? { error: res.error } : {};
}
