import type { SqlDriver } from './driver';
import { bumpAttempt, countOps, deleteOp, enqueueOp, peekOps, type OutboxOp } from './outbox';

export type OpHandler = (payload: unknown, op: OutboxOp) => Promise<{ ok: boolean; error?: string }>;

export interface FlushResult {
  flushed: number;
  dropped: number;
  remaining: number;
}

export interface SyncEngine {
  enqueue(opType: string, payload: unknown, entityId?: string): Promise<void>;
  flush(): Promise<FlushResult>;
  pendingCount(): Promise<number>;
}

/** Transient failures stop the flush (FIFO preserved); after this many attempts an op is dropped. */
export const MAX_OP_ATTEMPTS = 5;

export function createSyncEngine(opts: {
  db: SqlDriver;
  handlers: Record<string, OpHandler>;
  onCountChange?: (count: number) => void;
  onFlushEnd?: (result: FlushResult) => void;
}): SyncEngine {
  const { db, handlers } = opts;
  let inFlight: Promise<FlushResult> | null = null;

  const notifyCount = async () => {
    if (opts.onCountChange) opts.onCountChange(await countOps(db));
  };

  const run = async (): Promise<FlushResult> => {
    let flushed = 0;
    let dropped = 0;
    for (;;) {
      const [op] = await peekOps(db, 1);
      if (!op) break;
      const handler = handlers[op.opType];
      if (!handler) {
        await deleteOp(db, op.id);
        dropped += 1;
        await notifyCount();
        continue;
      }
      let result: { ok: boolean; error?: string };
      try {
        result = await handler(op.payload, op);
      } catch (e) {
        result = { ok: false, error: e instanceof Error ? e.message : String(e) };
      }
      if (result.ok) {
        await deleteOp(db, op.id);
        flushed += 1;
        await notifyCount();
        continue;
      }
      if (op.attempts + 1 >= MAX_OP_ATTEMPTS) {
        await deleteOp(db, op.id);
        dropped += 1;
        await notifyCount();
        continue;
      }
      await bumpAttempt(db, op.id, result.error ?? 'unknown');
      break; // transient failure — stop, keep FIFO order
    }
    const remaining = await countOps(db);
    const summary = { flushed, dropped, remaining };
    if (opts.onFlushEnd) opts.onFlushEnd(summary);
    return summary;
  };

  return {
    async enqueue(opType, payload, entityId) {
      await enqueueOp(db, opType, payload, entityId);
      await notifyCount();
    },
    flush() {
      if (!inFlight) {
        inFlight = run().finally(() => {
          inFlight = null;
        });
      }
      return inFlight;
    },
    pendingCount: () => countOps(db),
  };
}
