import { describe, it, expect, beforeEach, vi } from 'vitest';
import resendVerification, { RESEND_VERIFICATION_COOLDOWN_SECONDS } from './resendVerification';
import { setHttpClient, resetHttpClient, ApiError } from '../httpClient';
import { setLogger } from '../logger';

const post = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  setLogger({ error: vi.fn() });
  setHttpClient({
    get: vi.fn(),
    post,
    put: vi.fn(),
    delete: vi.fn(),
  });
});

describe('resendVerification', () => {
  it('posts the address to the resend route', async () => {
    post.mockResolvedValue({ data: { success: 'ok' }, headers: {} });

    const result = await resendVerification('stranded@test.com');

    expect(post).toHaveBeenCalledWith('/auth/resend-verification', { email: 'stranded@test.com' });
    expect(result).toEqual({ success: true });
  });

  it('reports a throttled request rather than swallowing it', async () => {
    post.mockRejectedValue(new ApiError(429, { errorKey: 'RATE_LIMIT_EXCEEDED' }));

    const result = await resendVerification('stranded@test.com');

    expect(result.success).toBeUndefined();
    expect(result.error?.errorKey).toBe('RATE_LIMIT_EXCEEDED');
  });

  it('survives a transport failure without throwing at the screen', async () => {
    post.mockRejectedValue(new Error('offline'));

    await expect(resendVerification('stranded@test.com')).resolves.toEqual({
      error: { errorKey: 'UnexpectedError' },
    });
  });

  /**
   * The number itself is not the contract — the server enforces the wait. What matters
   * is that both clients read it from here, so a change to the backend's
   * EMAIL_VERIFICATION_COOLDOWN_SECONDS has exactly one place to land on this side.
   */
  it('publishes the cooldown both clients count down from', () => {
    expect(RESEND_VERIFICATION_COOLDOWN_SECONDS).toBe(60);
  });
});
