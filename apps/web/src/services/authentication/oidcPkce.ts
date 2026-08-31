/**
 * The browser half of Authorization Code + PKCE against a federated provider.
 *
 * <p>Written by hand rather than pulled from a library because it is forty lines and the
 * library would still need the same three decisions made correctly: S256 only, the state
 * checked on return, and the verifier kept out of anything that survives the tab.
 *
 * <p>Session storage, not local storage. The verifier and the state are good for exactly
 * one round trip; leaving them in a store that outlives the tab means leaving a used key
 * under the mat.
 */

const VERIFIER_KEY = 'oidc_code_verifier';
const STATE_KEY = 'oidc_state';
const PROVIDER_KEY = 'oidc_provider';

function randomUrlSafe(bytes: number): string {
    const buffer = new Uint8Array(bytes);
    crypto.getRandomValues(buffer);
    return base64Url(buffer);
}

function base64Url(bytes: Uint8Array): string {
    let binary = '';
    bytes.forEach((b) => { binary += String.fromCharCode(b); });
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function challengeFor(verifier: string): Promise<string> {
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
    return base64Url(new Uint8Array(digest));
}

export type OidcDiscovery = {
    authorization_endpoint: string;
    token_endpoint: string;
    issuer: string;
};

export async function discover(issuer: string): Promise<OidcDiscovery> {
    const response = await fetch(`${issuer}/.well-known/openid-configuration`);
    if (!response.ok) throw new Error(`discovery failed: ${response.status}`);
    const doc = (await response.json()) as OidcDiscovery;
    // The document does not get to say who it is. Without this, a redirected fetch could
    // nominate an authorization endpoint belonging to somebody else entirely.
    if (doc.issuer !== issuer) throw new Error('discovery document does not belong to this issuer');
    return doc;
}

/** Sends the browser to the provider. Does not return: the tab navigates away. */
export async function beginOidcLogin(params: {
    slug: string;
    issuer: string;
    clientId: string;
    redirectUri: string;
    scope?: string;
}): Promise<void> {
    const discovery = await discover(params.issuer);

    const verifier = randomUrlSafe(32);
    const state = randomUrlSafe(16);
    sessionStorage.setItem(VERIFIER_KEY, verifier);
    sessionStorage.setItem(STATE_KEY, state);
    sessionStorage.setItem(PROVIDER_KEY, params.slug);

    const url = new URL(discovery.authorization_endpoint);
    url.search = new URLSearchParams({
        client_id: params.clientId,
        redirect_uri: params.redirectUri,
        response_type: 'code',
        // Only what signing in needs. The provider's consent is all-or-nothing, so asking
        // for a scope we do not use would be asking the user to grant it for nothing.
        scope: params.scope ?? 'openid email profile',
        state,
        code_challenge: await challengeFor(verifier),
        code_challenge_method: 'S256',
    }).toString();

    window.location.assign(url.toString());
}

export type OidcCallbackResult = { slug: string; idToken: string };

/**
 * Completes the round trip when the provider sends the browser back.
 *
 * <p>Returns null when this page load is not an OIDC return, which is every load but one.
 * Throws when it IS a return and something about it is wrong — a state mismatch is the
 * one case worth shouting about, because it is the shape a CSRF attempt arrives in.
 */
export async function completeOidcLogin(params: {
    issuer: string;
    clientId: string;
    redirectUri: string;
}): Promise<OidcCallbackResult | null> {
    const query = new URLSearchParams(window.location.search);
    const code = query.get('code');
    const state = query.get('state');
    const savedState = sessionStorage.getItem(STATE_KEY);
    const verifier = sessionStorage.getItem(VERIFIER_KEY);
    const slug = sessionStorage.getItem(PROVIDER_KEY);

    // Google's callback lands on the same URL with the same parameter names. Only a
    // request we started — one with our verifier still in session storage — is ours.
    if (!code || !verifier || !slug) return null;

    sessionStorage.removeItem(VERIFIER_KEY);
    sessionStorage.removeItem(STATE_KEY);
    sessionStorage.removeItem(PROVIDER_KEY);

    if (!state || state !== savedState) {
        throw new Error('OAuth state mismatch — possible CSRF attack');
    }

    const discovery = await discover(params.issuer);
    const response = await fetch(discovery.token_endpoint, {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            grant_type: 'authorization_code',
            code,
            redirect_uri: params.redirectUri,
            client_id: params.clientId,
            code_verifier: verifier,
        }).toString(),
    });
    if (!response.ok) throw new Error(`token exchange failed: ${response.status}`);

    const tokens = (await response.json()) as { id_token?: string };
    if (!tokens.id_token) throw new Error('provider returned no id_token');

    // The token is not inspected here. Everything that decides what it means — signature,
    // issuer, audience, expiry, and which account it opens — happens on the server, which
    // is the only party that can be trusted to do it.
    return { slug, idToken: tokens.id_token };
}
