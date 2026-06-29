import { ApiError } from '@beyou/api';
import { nativeHttpClient, setAccessToken, __setBaseUrl, setOnUnauthenticated, setRefreshHandler } from './nativeHttpClient';

describe('nativeHttpClient (base)', () => {
  beforeEach(() => {
    setAccessToken(null);
    __setBaseUrl('http://test.local/api/v1');
    global.fetch = jest.fn();
  });

  it('GET returns data + headers and sets Authorization + X-Client', async () => {
    setAccessToken('jwt-1');
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true, status: 200, headers: new Headers({ 'x-access-token': 'jwt-1' }),
      json: async () => [{ id: '1' }],
    });
    const res = await nativeHttpClient.get('/habit');
    const [url, init] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).toBe('http://test.local/api/v1/habit');
    expect(init.headers['Authorization']).toBe('Bearer jwt-1');
    expect(init.headers['X-Client']).toBe('mobile');
    expect(res.data).toEqual([{ id: '1' }]);
  });

  it('serializes RequestConfig params into the query string', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true, status: 200, headers: new Headers(), json: async () => ({}),
    });
    await nativeHttpClient.get('/routine/snapshot', { params: { date: '2026-06-14' } });
    expect((global.fetch as jest.Mock).mock.calls[0][0]).toBe('http://test.local/api/v1/routine/snapshot?date=2026-06-14');
  });

  it('throws ApiError(status,data) on non-2xx', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false, status: 500, headers: new Headers(), json: async () => ({ message: 'boom' }),
    });
    await expect(nativeHttpClient.get('/habit')).rejects.toBeInstanceOf(ApiError);
  });
});

describe('nativeHttpClient (refresh)', () => {
  beforeEach(() => { setAccessToken('old'); __setBaseUrl('http://test.local/api/v1'); setRefreshHandler(null); setOnUnauthenticated(null); global.fetch = jest.fn(); });

  it('on 401 refreshes once and retries the original request', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({ ok: false, status: 401, headers: new Headers(), json: async () => ({}) }) // original
      .mockResolvedValueOnce({ ok: true, status: 200, headers: new Headers(), json: async () => ({ ok: true }) }); // retry
    setRefreshHandler(async () => { setAccessToken('new'); return true; });

    const res = await nativeHttpClient.get('/habit');
    expect(res.data).toEqual({ ok: true });
    const retryInit = (global.fetch as jest.Mock).mock.calls[1][1];
    expect(retryInit.headers['Authorization']).toBe('Bearer new');
  });

  it('concurrent 401s share a single refresh', async () => {
    let refreshCount = 0;
    setRefreshHandler(async () => { refreshCount++; setAccessToken('new'); return true; });
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({ ok: false, status: 401, headers: new Headers(), json: async () => ({}) })
      .mockResolvedValueOnce({ ok: false, status: 401, headers: new Headers(), json: async () => ({}) })
      .mockResolvedValue({ ok: true, status: 200, headers: new Headers(), json: async () => ({}) });
    await Promise.all([nativeHttpClient.get('/a'), nativeHttpClient.get('/b')]);
    expect(refreshCount).toBe(1);
  });

  it('on refresh failure calls onUnauthenticated and rejects', async () => {
    const onUnauth = jest.fn();
    setOnUnauthenticated(onUnauth);
    setRefreshHandler(async () => false);
    (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: false, status: 401, headers: new Headers(), json: async () => ({}) });
    await expect(nativeHttpClient.get('/habit')).rejects.toBeInstanceOf(ApiError);
    expect(onUnauth).toHaveBeenCalled();
  });
});

describe('nativeHttpClient (timeout + transport errors)', () => {
  beforeEach(() => { setAccessToken(null); __setBaseUrl('http://test.local/api/v1'); });
  afterEach(() => { jest.useRealTimers(); });

  it('aborts and throws ApiError(0) when the request exceeds the timeout', async () => {
    jest.useFakeTimers();
    // A fetch that never resolves on its own — it only rejects when the signal aborts.
    global.fetch = jest.fn((_url: string, init: { signal: AbortSignal }) =>
      new Promise((_resolve, reject) => {
        init.signal.addEventListener('abort', () =>
          reject(Object.assign(new Error('Aborted'), { name: 'AbortError' })),
        );
      }),
    ) as unknown as typeof fetch;

    const p = nativeHttpClient.post('/slow', {}, { timeout: 1000 });
    const assertion = expect(p).rejects.toMatchObject({ status: 0 });
    jest.advanceTimersByTime(1000);
    await assertion;
  });

  it('wraps a transport failure (unreachable host) as ApiError(0)', async () => {
    global.fetch = jest.fn().mockRejectedValueOnce(new TypeError('Network request failed')) as unknown as typeof fetch;
    await expect(nativeHttpClient.get('/x')).rejects.toBeInstanceOf(ApiError);
  });
});
