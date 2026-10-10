import { describe, it, expect, beforeEach, vi } from 'vitest';
import oidcLogin from './oidcLogin';
import { setHttpClient, ApiError } from '../../httpClient';
import { setLogger } from '../../logger';

const post = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  setLogger({ error: vi.fn() });
  setHttpClient({
    get: vi.fn(),
    post,
    put: vi.fn(),
    delete: vi.fn(),
    patch: vi.fn(),
  });
});

describe('oidcLogin', () => {
  it('hands back the session on success', async () => {
    post.mockResolvedValue({
      data: { success: { name: 'Ana' } },
      headers: { 'x-access-token': 'jwt' },
    });

    const result = await oidcLogin('omelhorsite', 'id-token', { timezone: 'Europe/Lisbon', language: 'pt' });

    expect(post).toHaveBeenCalledWith('/auth/oidc/omelhorsite', {
      idToken: 'id-token',
      timezone: 'Europe/Lisbon',
      language: 'pt',
    });
    expect(result).toEqual({ kind: 'success', user: { name: 'Ana' }, accessToken: 'jwt', refreshToken: undefined });
  });

  /**
   * The 403 is an answer, not a failure: the screen tells the person to sign in their usual
   * way and link the provider from settings. It arrives in the standard error envelope, with
   * the reason and the provider in details.
   */
  it('reads link-required out of the standard error envelope', async () => {
    post.mockRejectedValue(
      new ApiError(403, {
        errorKey: 'FEDERATED_LINK_REQUIRED',
        message: 'Sign in the usual way, then link this provider from settings',
        details: { reason: 'ACCOUNT_EXISTS', provider: 'omelhorsite' },
      }),
    );

    const result = await oidcLogin('omelhorsite', 'id-token');

    expect(result).toEqual({ kind: 'linkRequired', reason: 'ACCOUNT_EXISTS', provider: 'omelhorsite' });
  });

  /** The shape the server sent before the envelope, kept readable for one release. */
  it('still reads the old link-required body', async () => {
    post.mockRejectedValue(
      new ApiError(403, { error: 'FEDERATED_LINK_REQUIRED', reason: 'EMAIL_NOT_TRUSTED', provider: 'omelhorsite' }),
    );

    const result = await oidcLogin('omelhorsite', 'id-token');

    expect(result).toEqual({ kind: 'linkRequired', reason: 'EMAIL_NOT_TRUSTED', provider: 'omelhorsite' });
  });

  it('treats any other refusal as an error with its key', async () => {
    post.mockRejectedValue(new ApiError(400, { errorKey: 'OIDC_TOKEN_INVALID' }));

    const result = await oidcLogin('omelhorsite', 'id-token');

    expect(result.kind).toBe('error');
    expect(result.kind === 'error' && result.error.errorKey).toBe('OIDC_TOKEN_INVALID');
  });
});
