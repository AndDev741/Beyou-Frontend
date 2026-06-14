import { nativeHttpClient } from '../lib/nativeHttpClient';
import { loginRequest, refreshRequest } from './authApi';

jest.mock('../lib/nativeHttpClient', () => ({ nativeHttpClient: { post: jest.fn() } }));
const post = nativeHttpClient.post as jest.Mock;

describe('authApi', () => {
  beforeEach(() => jest.clearAllMocks());

  it('login returns accessToken (header), refreshToken (body), profile', async () => {
    post.mockResolvedValueOnce({
      data: { success: { id: 'u1', email: 'a@b.com' }, refreshToken: 'id.tok' },
      headers: { 'x-access-token': 'jwt' },
    });
    const r = await loginRequest('a@b.com', 'pw');
    expect(post).toHaveBeenCalledWith('/auth/login', { email: 'a@b.com', password: 'pw' });
    expect(r).toEqual({ accessToken: 'jwt', refreshToken: 'id.tok', profile: { id: 'u1', email: 'a@b.com' } });
  });

  it('refresh sends X-Refresh-Token and returns the rotated pair', async () => {
    post.mockResolvedValueOnce({ data: { refreshToken: 'id.tok2' }, headers: { 'x-access-token': 'jwt2' } });
    const r = await refreshRequest('id.tok');
    expect(post).toHaveBeenCalledWith('/auth/refresh', undefined, { headers: { 'X-Refresh-Token': 'id.tok' } });
    expect(r).toEqual({ accessToken: 'jwt2', refreshToken: 'id.tok2' });
  });
});
