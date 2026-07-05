import { beforeEach, expect, test } from 'vitest';
import { createTestDriver } from './testDriver';
import { migrate } from '../schema';
import { countOps } from '../outbox';
import { createSyncEngine, MAX_OP_ATTEMPTS, type FlushResult } from '../syncEngine';
import type { SqlDriver } from '../driver';

let db: SqlDriver & { close: () => void };
beforeEach(async () => {
  db = createTestDriver();
  await migrate(db);
});

test('flush drains ops FIFO through their handlers and reports the result', async () => {
  const calls: string[] = [];
  const engine = createSyncEngine({
    db,
    handlers: {
      'a.op': async (p) => { calls.push(`a:${(p as { n: number }).n}`); return { ok: true }; },
      'b.op': async () => { calls.push('b'); return { ok: true }; },
    },
  });
  await engine.enqueue('a.op', { n: 1 });
  await engine.enqueue('b.op', {});
  await engine.enqueue('a.op', { n: 2 });
  const result = await engine.flush();
  expect(calls).toEqual(['a:1', 'b', 'a:2']);
  expect(result).toEqual({ flushed: 3, dropped: 0, remaining: 0 });
});

test('a transient failure stops the flush and preserves FIFO order', async () => {
  const engine = createSyncEngine({
    db,
    handlers: {
      'fail.op': async () => ({ ok: false, error: 'net' }),
      'ok.op': async () => ({ ok: true }),
    },
  });
  await engine.enqueue('fail.op', {});
  await engine.enqueue('ok.op', {});
  const result = await engine.flush();
  expect(result.flushed).toBe(0);
  expect(result.remaining).toBe(2); // the ok.op behind it was NOT attempted out of order
});

test('an op is dropped after MAX_OP_ATTEMPTS and the flush continues past it', async () => {
  const engine = createSyncEngine({
    db,
    handlers: {
      'fail.op': async () => ({ ok: false, error: 'permanent' }),
      'ok.op': async () => ({ ok: true }),
    },
  });
  await engine.enqueue('fail.op', {});
  await engine.enqueue('ok.op', {});
  let last = { flushed: 0, dropped: 0, remaining: 0 };
  for (let i = 0; i < MAX_OP_ATTEMPTS; i += 1) {
    last = await engine.flush();
  }
  expect(last.dropped).toBe(1);
  expect(last.flushed).toBe(1); // ok.op finally ran once the poison op was dropped
  expect(await countOps(db)).toBe(0);
});

test('an unknown opType is dropped immediately', async () => {
  const engine = createSyncEngine({ db, handlers: {} });
  await engine.enqueue('ghost.op', {});
  const result = await engine.flush();
  expect(result.dropped).toBe(1);
  expect(await countOps(db)).toBe(0);
});

test('concurrent flush calls share one run', async () => {
  let inFlight = 0;
  let maxInFlight = 0;
  const engine = createSyncEngine({
    db,
    handlers: {
      'slow.op': async () => {
        inFlight += 1;
        maxInFlight = Math.max(maxInFlight, inFlight);
        await new Promise((r) => setTimeout(r, 10));
        inFlight -= 1;
        return { ok: true };
      },
    },
  });
  await engine.enqueue('slow.op', {});
  await engine.enqueue('slow.op', {});
  await Promise.all([engine.flush(), engine.flush()]);
  expect(maxInFlight).toBe(1);
});

test('onCountChange fires on enqueue and on drain', async () => {
  const counts: number[] = [];
  const engine = createSyncEngine({
    db,
    handlers: { 'a.op': async () => ({ ok: true }) },
    onCountChange: (c) => counts.push(c),
  });
  await engine.enqueue('a.op', {});
  await engine.enqueue('a.op', {});
  await engine.enqueue('ghost.op', {}); // will be dropped (no handler)
  await engine.flush();
  expect(counts).toEqual([1, 2, 3, 2, 1, 0]);
});

test('onFlushEnd is called with the flush summary', async () => {
  const ends: FlushResult[] = [];
  const engine = createSyncEngine({
    db,
    handlers: {
      'ok.op': async () => ({ ok: true }),
      'fail.op': async () => ({ ok: false, error: 'net' }),
    },
    onFlushEnd: (result) => ends.push(result),
  });
  await engine.enqueue('ok.op', {});
  await engine.enqueue('ok.op', {});
  await engine.enqueue('fail.op', {});
  await engine.flush();
  expect(ends).toHaveLength(1);
  expect(ends[0]).toEqual({ flushed: 2, dropped: 0, remaining: 1 });
});

test('flush returns the same promise for concurrent calls', async () => {
  const engine = createSyncEngine({
    db,
    handlers: {
      'slow.op': async () => {
        await new Promise((r) => setTimeout(r, 10));
        return { ok: true };
      },
    },
  });
  await engine.enqueue('slow.op', {});
  const p1 = engine.flush();
  const p2 = engine.flush();
  expect(p1).toBe(p2);
  await p1;
  const p3 = engine.flush();
  expect(p3).not.toBe(p1);
  await p3;
});
