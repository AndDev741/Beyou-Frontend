import { nativeHttpClient } from '../lib/nativeHttpClient';
import type { Profile } from './types';

export interface LoginResult { accessToken: string; refreshToken: string; profile: Profile; }
export interface RefreshResult { accessToken: string; refreshToken: string; }

export async function loginRequest(email: string, password: string): Promise<LoginResult> {
  const r = await nativeHttpClient.post<{ success: Profile; refreshToken: string }>('/auth/login', { email, password });
  return { accessToken: r.headers['x-access-token'], refreshToken: r.data.refreshToken, profile: r.data.success };
}

export async function registerRequest(name: string, email: string, password: string): Promise<void> {
  await nativeHttpClient.post('/auth/register', { name, email, password });
}

export async function refreshRequest(refreshToken: string): Promise<RefreshResult> {
  const r = await nativeHttpClient.post<{ refreshToken: string }>('/auth/refresh', undefined, {
    headers: { 'X-Refresh-Token': refreshToken },
  });
  return { accessToken: r.headers['x-access-token'], refreshToken: r.data.refreshToken };
}

export async function logoutRequest(refreshToken: string): Promise<void> {
  await nativeHttpClient.post('/auth/logout', undefined, { headers: { 'X-Refresh-Token': refreshToken } });
}
