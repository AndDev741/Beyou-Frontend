export interface SqlRow {
  [key: string]: unknown;
}

/**
 * Minimal SQL surface the offline cache needs. Modeled 1:1 on expo-sqlite's
 * async API so the mobile driver is a pass-through; the web driver (Phase 3)
 * and the better-sqlite3 test driver adapt to it.
 */
export interface SqlDriver {
  execAsync(sql: string): Promise<void>;
  runAsync(sql: string, params?: unknown[]): Promise<void>;
  getAllAsync(sql: string, params?: unknown[]): Promise<SqlRow[]>;
  getFirstAsync(sql: string, params?: unknown[]): Promise<SqlRow | null>;
  withTransactionAsync(fn: () => Promise<void>): Promise<void>;
}
