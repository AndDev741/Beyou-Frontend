import { beforeEach, describe, expect, test } from 'vitest';
import { createTestDriver } from './testDriver';
import { migrate } from '../schema';
import { bumpAttempt, countOps, deleteOp, enqueueOp, peekOps } from '../outbox';
import type { SqlDriver } from '../driver';

let db: SqlDriver & { close: () => void };
beforeEach(async () => {
  db = createTestDriver();
  await migrate(db);
});

describe('outbox', () => {
  test('enqueue then peek returns ops FIFO with parsed payloads', async () => {
    await enqueueOp(db, 'habit.create', { id: 'h1', name: 'A' }, 'h1');
    await enqueueOp(db, 'habit.edit', { habitId: 'h1', name: 'B' }, 'h1');
    const ops = await peekOps(db);
    expect(ops.map((o) => o.opType)).toEqual(['habit.create', 'habit.edit']);
    expect(ops[0].payload).toEqual({ id: 'h1', name: 'A' });
    expect(ops[0].entityId).toBe('h1');
    expect(ops[0].attempts).toBe(0);
  });

  test('deleteOp removes exactly one op; countOps tracks it', async () => {
    await enqueueOp(db, 'a', {});
    await enqueueOp(db, 'b', {});
    expect(await countOps(db)).toBe(2);
    const [first] = await peekOps(db, 1);
    await deleteOp(db, first.id);
    expect(await countOps(db)).toBe(1);
    expect((await peekOps(db))[0].opType).toBe('b');
  });

  test('bumpAttempt increments attempts and records the error', async () => {
    await enqueueOp(db, 'a', {});
    const [op] = await peekOps(db);
    await bumpAttempt(db, op.id, 'network down');
    const [after] = await peekOps(db);
    expect(after.attempts).toBe(1);
    expect(after.lastError).toBe('network down');
  });
});
