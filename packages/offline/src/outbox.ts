import type { SqlDriver } from './driver';

export interface OutboxOp {
  id: number;
  opType: string;
  payload: unknown;
  entityId: string | null;
  createdAt: string;
  attempts: number;
  lastError: string | null;
}

export async function enqueueOp(
  db: SqlDriver,
  opType: string,
  payload: unknown,
  entityId?: string
): Promise<void> {
  await db.runAsync(
    'INSERT INTO outbox (op_type, payload, entity_id, created_at) VALUES (?, ?, ?, ?)',
    [opType, JSON.stringify(payload ?? null), entityId ?? null, new Date().toISOString()]
  );
}

export async function peekOps(db: SqlDriver, limit = 100): Promise<OutboxOp[]> {
  const rows = await db.getAllAsync('SELECT * FROM outbox ORDER BY id ASC LIMIT ?', [limit]);
  return rows.map((r) => ({
    id: r.id as number,
    opType: r.op_type as string,
    payload: JSON.parse(r.payload as string),
    entityId: (r.entity_id as string) ?? null,
    createdAt: r.created_at as string,
    attempts: r.attempts as number,
    lastError: (r.last_error as string) ?? null,
  }));
}

export async function deleteOp(db: SqlDriver, id: number): Promise<void> {
  await db.runAsync('DELETE FROM outbox WHERE id = ?', [id]);
}

export async function bumpAttempt(db: SqlDriver, id: number, error: string): Promise<void> {
  await db.runAsync('UPDATE outbox SET attempts = attempts + 1, last_error = ? WHERE id = ?', [
    error,
    id,
  ]);
}

export async function countOps(db: SqlDriver): Promise<number> {
  const row = await db.getFirstAsync('SELECT COUNT(*) AS c FROM outbox');
  return (row?.c as number) ?? 0;
}
