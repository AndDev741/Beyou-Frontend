import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { completeOidcLogin } from './oidcPkce';

/**
 * The two rules in the browser half of the PKCE flow that are worth a test.
 *
 * <p>Both are about NOT acting. The first is that a state mismatch stops the flow — that
 * is the shape a CSRF attempt arrives in, and silently continuing would exchange an
 * attacker's code for a session in the victim's browser. The second is that this code
 * only claims the callbacks it started: Google's callback lands on the same URL with the
 * same parameter names, and a helper that grabbed any `?code=` would break Google sign-in
 * the day this shipped.
 */
describe('completeOidcLogin', () => {
    const ISSUER = 'https://idp.example';
    const params = { issuer: ISSUER, clientId: 'client', redirectUri: 'http://localhost:3000/' };

    beforeEach(() => {
        sessionStorage.clear();
        Object.defineProperty(window, 'location', {
            writable: true,
            value: { search: '?code=abc&state=sent', origin: 'http://localhost:3000', pathname: '/' },
        });
        vi.stubGlobal('fetch', vi.fn());
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('refuses to continue when the returned state does not match', async () => {
        sessionStorage.setItem('oidc_code_verifier', 'verifier');
        sessionStorage.setItem('oidc_provider', 'someprovider');
        sessionStorage.setItem('oidc_state', 'something-else');

        await expect(completeOidcLogin(params)).rejects.toThrow(/state mismatch/i);
        // Nothing was exchanged: a mismatched state must not reach the token endpoint.
        expect(fetch).not.toHaveBeenCalled();
    });

    it('ignores a callback it did not start, so Google sign-in still works', async () => {
        // A code in the URL but no verifier of ours in session storage. This is exactly
        // what Google's callback looks like from here.
        const result = await completeOidcLogin(params);

        expect(result).toBeNull();
        expect(fetch).not.toHaveBeenCalled();
    });

    it('clears the one-shot values even when the state check fails', async () => {
        sessionStorage.setItem('oidc_code_verifier', 'verifier');
        sessionStorage.setItem('oidc_provider', 'someprovider');
        sessionStorage.setItem('oidc_state', 'something-else');

        await expect(completeOidcLogin(params)).rejects.toThrow();

        // A used verifier left behind is a used key under the mat, and it would also make
        // the next page load try to claim a callback that is no longer ours.
        expect(sessionStorage.getItem('oidc_code_verifier')).toBeNull();
        expect(sessionStorage.getItem('oidc_state')).toBeNull();
        expect(sessionStorage.getItem('oidc_provider')).toBeNull();
    });
});
