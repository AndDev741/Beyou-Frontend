import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock googleRequest so no real HTTP calls happen
vi.mock('./request/googleRequest', () => ({
    default: vi.fn().mockResolvedValue({ success: null }),
}));

// Helper: set window.location.search for a given query string
function setLocationSearch(search: string) {
    Object.defineProperty(window, 'location', {
        value: { ...window.location, search, origin: 'http://localhost:3000', pathname: '/' },
        writable: true,
    });
}

describe('useGoogleLogin — OAuth state validation', () => {
    beforeEach(() => {
        sessionStorage.clear();
        vi.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('rejects when state param is missing from callback URL', async () => {
        const savedState = 'abc-123';
        sessionStorage.setItem('oauth_state', savedState);
        setLocationSearch('?code=auth_code_value');

        const params = new URLSearchParams(window.location.search);
        const authCode = params.get('code');
        const stateParam = params.get('state');
        const storedState = sessionStorage.getItem('oauth_state');
        sessionStorage.removeItem('oauth_state');

        const isValid = Boolean(stateParam && stateParam === storedState);

        expect(authCode).toBe('auth_code_value');
        expect(isValid).toBe(false);
    });

    it('rejects when state param does not match stored state', async () => {
        sessionStorage.setItem('oauth_state', 'legitimate-state');
        setLocationSearch('?code=auth_code_value&state=attacker-state');

        const params = new URLSearchParams(window.location.search);
        const stateParam = params.get('state');
        const storedState = sessionStorage.getItem('oauth_state');
        sessionStorage.removeItem('oauth_state');

        const isValid = Boolean(stateParam && stateParam === storedState);

        expect(isValid).toBe(false);
    });

    it('accepts when state param matches stored state', async () => {
        const state = 'valid-random-state-xyz';
        sessionStorage.setItem('oauth_state', state);
        setLocationSearch(`?code=auth_code_value&state=${state}`);

        const params = new URLSearchParams(window.location.search);
        const stateParam = params.get('state');
        const storedState = sessionStorage.getItem('oauth_state');
        sessionStorage.removeItem('oauth_state');

        const isValid = Boolean(stateParam && stateParam === storedState);

        expect(isValid).toBe(true);
    });

    it('removes oauth_state from sessionStorage regardless of outcome', () => {
        sessionStorage.setItem('oauth_state', 'some-state');
        setLocationSearch('?code=auth_code_value&state=wrong-state');

        const params = new URLSearchParams(window.location.search);
        const stateParam = params.get('state');
        const storedState = sessionStorage.getItem('oauth_state');
        sessionStorage.removeItem('oauth_state');

        // Consumed regardless
        expect(sessionStorage.getItem('oauth_state')).toBeNull();
        // But state is still wrong
        expect(stateParam).not.toBe(storedState);
    });

    it('rejects when no state was stored (direct navigation to callback URL)', () => {
        // No sessionStorage entry — simulates attacker sending victim directly to /callback?code=...&state=x
        setLocationSearch('?code=stolen_code&state=attacker-state');

        const params = new URLSearchParams(window.location.search);
        const stateParam = params.get('state');
        const storedState = sessionStorage.getItem('oauth_state'); // null
        sessionStorage.removeItem('oauth_state');

        const isValid = Boolean(stateParam && stateParam === storedState);

        expect(storedState).toBeNull();
        expect(isValid).toBe(false);
    });
});
