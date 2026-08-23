import { nativeHttpClient } from '../lib/nativeHttpClient';
import { ApiError, resendVerification } from '@beyou/api';
import { parseApiError, type ApiErrorPayload } from '@beyou/api/apiError';
import type { Profile } from './types';
import { detectTimezone } from '../lib/detectTimezone';

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

// The account is created with the device's zone, so a new user is never born on the UTC
// calendar. Optional on the wire: the backend drops anything it cannot parse rather than
// refusing the registration.
export async function registerRequest(name: string, email: string, password: string): Promise<void> {
  await nativeHttpClient.post('/auth/register', {
    name, email, password, timezone: detectTimezone() ?? undefined,
  });
}

// Mobile Google sign-in: send the on-device Google ID token; the backend verifies
// it and issues JWT + refresh on the same mobile contract as loginRequest.
export async function googleMobileLoginRequest(idToken: string): Promise<LoginResult> {
  // The zone rides alongside the token because a verified Google ID token carries no
  // such claim. Applied only when the backend CREATES the account.
  const r = await nativeHttpClient.post<{ success: Profile; refreshToken: string }>(
    '/auth/google/mobile', { idToken, timezone: detectTimezone() ?? undefined });
  requireTokens(r.headers['x-access-token'], r.data?.refreshToken);
  return { accessToken: r.headers['x-access-token'], refreshToken: r.data.refreshToken, profile: r.data.success };
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

// Non-enumerating by design: the backend responds 200 whether or not the email
// exists, so the screen always shows the same "check your inbox" message.
export async function forgotPasswordRequest(email: string): Promise<void> {
  await nativeHttpClient.post('/auth/forgot-password', { email });
}

/**
 * Another verification mail, for an account whose first one never arrived.
 *
 * <p>Delegates to the shared implementation so the path and the cooldown constant have
 * one home across web and mobile. Non-enumerating like forgot-password above: the
 * backend answers 200 whether or not the address exists, so the screen can only ever
 * promise the inbox.
 */
export async function resendVerificationRequest(email: string): Promise<boolean> {
  const result = await resendVerification(email);
  return !result.error;
}

// Reset / verify flows are reached via deep link (beyou://reset|verify?token=)
// and run logged-out, so — unlike login/register — they return a result object
// instead of throwing, letting the screen branch on token validity inline.
export interface ResetPasswordResult { success?: boolean; error?: ApiErrorPayload; }
export async function resetPasswordRequest(token: string, password: string): Promise<ResetPasswordResult> {
  try {
    await nativeHttpClient.post('/auth/reset-password', { token, password });
    return { success: true };
  } catch (e) {
    return { error: parseApiError(e) };
  }
}

export interface ValidateResetTokenResult { valid?: boolean; error?: ApiErrorPayload; }
export async function validateResetTokenRequest(token: string): Promise<ValidateResetTokenResult> {
  try {
    await nativeHttpClient.get('/auth/reset-password/validate', { params: { token } });
    return { valid: true };
  } catch (e) {
    return { error: parseApiError(e) };
  }
}

export type VerifyEmailResult = 'success' | 'expired' | 'error';
export async function verifyEmailRequest(token: string): Promise<VerifyEmailResult> {
  try {
    await nativeHttpClient.get('/auth/verify-email', { params: { token } });
    return 'success';
  } catch (e) {
    // Backend signals an expired token in the error message body (web parity).
    return parseApiError(e).message?.includes('expired') ? 'expired' : 'error';
  }
}
