import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setHttpClient, setLogger } from '../index';
import type { HttpClient } from '../httpClient';
import deleteRoutine from './deleteRoutine';

const t = ((key: string) => key) as never;

const client = (deleteFn: HttpClient['delete']): HttpClient => ({
  get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: deleteFn,
});

beforeEach(() => setLogger({ error: () => {} }));

describe('deleteRoutine', () => {
  it('returns { success: true } even though the endpoint sends no body (Void → undefined data)', async () => {
    setHttpClient(client(vi.fn(async () => ({ data: undefined }) as never)));
    const res = await deleteRoutine('r1', t);
    expect(res).toEqual({ success: true });
    expect(res.error).toBeUndefined(); // the crash was reading .error off undefined
  });

  it('returns { error } when the request fails', async () => {
    setHttpClient(client(vi.fn(async () => { throw new Error('boom'); })));
    const res = await deleteRoutine('r1', t);
    expect(res.error).toBeDefined();
  });
});
