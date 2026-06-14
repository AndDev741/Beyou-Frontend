import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getHttpClient, setHttpClient, ApiError } from './httpClient';
import type { HttpClient, HttpResponse } from './httpClient';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeMockClient(): HttpClient {
  return {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  };
}

const t = ((key: string) => key) as (key: string) => string;

// ---------------------------------------------------------------------------
// getHttpClient throws when unset
// ---------------------------------------------------------------------------

describe('getHttpClient', () => {
  beforeEach(() => {
    // Reset the module-level client before each test by setting undefined
    // via a cast — we test the unset code path explicitly here.
    (setHttpClient as unknown as (c: undefined) => void)(undefined);
  });

  it('throws when no client has been configured', () => {
    expect(() => getHttpClient()).toThrow('HttpClient not configured');
  });

  it('returns the configured client after setHttpClient', () => {
    const mock = makeMockClient();
    setHttpClient(mock);
    expect(getHttpClient()).toBe(mock);
  });
});

// ---------------------------------------------------------------------------
// A repository routes through the injected client
// (using getHabits as the representative example)
// ---------------------------------------------------------------------------

describe('repository routes through the injected client', () => {
  let mockClient: HttpClient;

  beforeEach(async () => {
    mockClient = makeMockClient();
    setHttpClient(mockClient);
  });

  it('success path: get returns { success: data }', async () => {
    const habitData = [{ id: 'h1', name: 'Exercise' }];
    (mockClient.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: habitData,
      headers: {},
    } satisfies HttpResponse<typeof habitData>);

    // Dynamically import so the module uses whatever client is registered.
    const { default: getHabits } = await import('./habits/getHabits');
    const result = await getHabits(t as any);

    expect(mockClient.get).toHaveBeenCalledWith('/habit');
    expect(result).toEqual({ success: habitData });
  });

  it('ApiError path: thrown ApiError maps to { error: t("UnexpectedError") }', async () => {
    (mockClient.get as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new ApiError(500, { message: 'Internal server error' })
    );

    const { default: getHabits } = await import('./habits/getHabits');
    const result = await getHabits(t as any);

    expect(result).toEqual({ error: 'UnexpectedError' });
  });

  it('non-ApiError path: generic error also maps to { error: t("UnexpectedError") }', async () => {
    (mockClient.get as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error('Network failure')
    );

    const { default: getHabits } = await import('./habits/getHabits');
    const result = await getHabits(t as any);

    expect(result).toEqual({ error: 'UnexpectedError' });
  });
});
