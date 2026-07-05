import type { SqlDriver, SyncEngine } from '@beyou/offline';
import { getLogger } from '@beyou/api';
import { getDb } from './db';
import type { store as appStore } from '../store';

type AppStore = typeof appStore;

let offlineStore: AppStore | null = null;
let syncEngine: SyncEngine | null = null;

export function setOfflineStore(s: AppStore): void {
  offlineStore = s;
}
export function getOfflineStore(): AppStore {
  if (!offlineStore) throw new Error('offline store not configured — call setOfflineStore at boot');
  return offlineStore;
}
export function setSyncEngine(e: SyncEngine): void {
  syncEngine = e;
}
export function getSyncEngine(): SyncEngine | null {
  return syncEngine;
}

/** Offline means the connectivity slice SAYS offline; unknown OR not-yet-configured counts as online. */
export function isOffline(): boolean {
  return offlineStore !== null && offlineStore.getState().connectivity.isOnline === false;
}

/**
 * Apply an optimistic mirror write and enqueue the replay op. Mirror failures
 * are best-effort (Redux already holds the optimistic state; the op still
 * queues); a missing engine means sync setup hasn't run — treat as fatal in dev.
 */
export async function queueMutation(opts: {
  opType: string;
  payload: unknown;
  entityId?: string;
  mirror?: (db: SqlDriver) => Promise<void>;
}): Promise<void> {
  const engine = getSyncEngine();
  if (!engine) throw new Error('sync engine not configured — call initOfflineSync at boot');
  if (opts.mirror) {
    try {
      const db = await getDb();
      await opts.mirror(db);
    } catch (e) {
      getLogger().error('offline mirror write failed', e);
    }
  }
  await engine.enqueue(opts.opType, opts.payload, opts.entityId);
}
