import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import type { TFunction } from 'i18next';

// `vi.hoisted` keeps the handles in scope for both the mock factories (which Vitest
// hoists above everything) and the assertions in each test. A plain `const` referenced
// inside a `vi.mock` factory hits the TDZ, because the factory is evaluated lazily on
// the first import but the closure is created by the hoisted mock call.
const { mockOidcLogin, mockCompleteOidcLogin, mockHydratePerfil } = vi.hoisted(() => ({
    mockOidcLogin: vi.fn(),
    mockCompleteOidcLogin: vi.fn(),
    mockHydratePerfil: vi.fn(),
}));

vi.mock('@beyou/api', () => ({
    oidcLogin: mockOidcLogin,
    // `OidcLinkRequiredReason` and `OidcLoginResult` are type-only, erased at runtime.
}));
vi.mock('./oidcPkce', () => ({
    completeOidcLogin: mockCompleteOidcLogin,
}));
vi.mock('../user/hydratePerfil', () => ({
    hydratePerfil: mockHydratePerfil,
}));
vi.mock('../user/reconcileTimezone', () => ({
    detectTimezone: vi.fn(() => 'America/New_York'),
    reconcileTimezone: vi.fn(),
}));

// The hook reads VITE_OIDC_* at module load, so the env vars must be in place before
// the module is evaluated. Stub them once at the top of the file, then load the module
// (and the shared axios instance) once. Re-reading env per test would mean re-evaluating
// the module, which drags the global axios mock along — avoid that entirely.
vi.stubEnv('VITE_OIDC_ISSUER', 'https://issuer.example');
vi.stubEnv('VITE_OIDC_CLIENT_ID', 'oidc-client');

// Top-level await is supported in vitest ESM files; these run during collection, after
// the `vi.mock` factories above are registered and after the env vars are stubbed.
const useOidcLogin: (typeof import('./useOidcLogin'))['default'] = (await import('./useOidcLogin')).default;
const axiosConfig: (typeof import('../axiosConfig'))['default'] = (await import('../axiosConfig')).default;

// The hook reads window.location.search at effect time, so switching it per test is fine.
function setCallbackUrl(search: string) {
    Object.defineProperty(window, 'location', {
        value: { ...window.location, search, origin: 'http://localhost:3000', pathname: '/' },
        writable: true,
    });
}

describe('useOidcLogin — captures the access token from the login response', () => {
    beforeEach(() => {
        sessionStorage.clear();
        delete axiosConfig.defaults.headers.common.Authorization;
        mockOidcLogin.mockReset();
        mockCompleteOidcLogin.mockReset().mockResolvedValue({ slug: 'topgrade', idToken: 'id_token' });
        mockHydratePerfil.mockReset();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('stores the bearer token in axios defaults before navigating', async () => {
        mockOidcLogin.mockResolvedValue({
            kind: 'success',
            user: { id: 'u1', name: 'A', email: 'a@b.com', timezoneSource: 'DETECTED' },
            accessToken: 'jwt-abc',
        });

        setCallbackUrl('?code=abc&state=xyz');

        const navigate = vi.fn();
        const dispatch = vi.fn();
        const t = ((key: string) => key) as unknown as TFunction;

        renderHook(() => useOidcLogin(navigate, dispatch, t));

        await waitFor(() => {
            expect(axiosConfig.defaults.headers.common.Authorization).toBe('Bearer jwt-abc');
        });
        expect(mockCompleteOidcLogin).toHaveBeenCalledWith({
            issuer: 'https://issuer.example',
            clientId: 'oidc-client',
            redirectUri: 'http://localhost:3000/',
        });
        expect(navigate).toHaveBeenCalledWith('/dashboard');
        expect(mockHydratePerfil).toHaveBeenCalledWith(dispatch, expect.any(Object));
    });

    it('does not set a malformed "Bearer undefined" when the header is absent', async () => {
        mockOidcLogin.mockResolvedValue({
            kind: 'success',
            user: { id: 'u1', name: 'A', email: 'a@b.com', timezoneSource: 'DETECTED' },
            accessToken: undefined,
        });

        setCallbackUrl('?code=abc&state=xyz');

        const navigate = vi.fn();
        const dispatch = vi.fn();
        const t = ((key: string) => key) as unknown as TFunction;

        renderHook(() => useOidcLogin(navigate, dispatch, t));

        // The navigation still happens (the session is real in the httpOnly cookie),
        // but the header must stay absent rather than poison every later request.
        await waitFor(() => {
            expect(navigate).toHaveBeenCalledWith('/dashboard');
        });
        expect(axiosConfig.defaults.headers.common.Authorization).toBeUndefined();
    });
});
