import { ApiError } from '@beyou/api';
import { nativeHttpClient, setAccessToken, __setBaseUrl } from './nativeHttpClient';

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
