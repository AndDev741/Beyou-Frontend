import { nativeHttpClient } from '../lib/nativeHttpClient';
import { ApiError } from '@beyou/api';
import type { Profile } from './types';

export interface LoginResult { accessToken: string; refreshToken: string; profile: Profile; }
export interface RefreshResult { accessToken: string; refreshToken: string; }

// Defensive guard: the mobile auth contract requires the access token (X-Access-Token
// header) + the refresh token (JSON body). If either is missing — e.g. an intermediary
// stripped `X-Client: mobile` and the backend took the web/cookie branch — fail loudly
// instead of silently persisting an `undefined` token.
function requireTokens(accessToken: string | undefined, refreshToken: string | undefined): void {
  if (!accessToken || !refreshToken) {
    throw new ApiError(0, undefined, 'Malformed auth response: missing access or refresh token');
  }
}

export async function loginRequest(email: string, password: string): Promise<LoginResult> {
  const r = await nativeHttpClient.post<{ success: Profile; refreshToken: string }>('/auth/login', { email, password });
  requireTokens(r.headers['x-access-token'], r.data?.refreshToken);
  return { accessToken: r.headers['x-access-token'], refreshToken: r.data.refreshToken, profile: r.data.success };
}

export async function registerRequest(name: string, email: string, password: string): Promise<void> {
  await nativeHttpClient.post('/auth/register', { name, email, password });
}

export async function refreshRequest(refreshToken: string): Promise<RefreshResult> {
  const r = await nativeHttpClient.post<{ refreshToken: string }>('/auth/refresh', undefined, {
    headers: { 'X-Refresh-Token': refreshToken },
  });
  requireTokens(r.headers['x-access-token'], r.data?.refreshToken);
  return { accessToken: r.headers['x-access-token'], refreshToken: r.data.refreshToken };
}

export async function logoutRequest(refreshToken: string): Promise<void> {
  await nativeHttpClient.post('/auth/logout', undefined, { headers: { 'X-Refresh-Token': refreshToken } });
}
