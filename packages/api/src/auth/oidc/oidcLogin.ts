import { getHttpClient, ApiError } from '../../httpClient';
import { ApiErrorPayload, parseApiError } from '../../apiError';
import { getLogger } from '../../logger';
import { OidcLinkRequired, OidcLinkRequiredReason } from './types';

type UnknownUser = Record<string, unknown>;

export type OidcLoginResult =
    | { kind: 'success'; user: UnknownUser; accessToken?: string; refreshToken?: string }
    | OidcLinkRequired
    | { kind: 'error'; error: ApiErrorPayload };

/**
 * Exchanges a verified ID token for a beyou session.
 *
 * <p>The ID token goes to the server, not the authorization code. The code's verifier
 * never leaves the device that generated it, so sending the code would mean sending the
 * verifier with it — which turns PKCE back into the thing it replaced.
 *
 * <p><b>A 403 here is not a failure.</b> It means the identity verified but is not allowed
 * in on its own: either we do not trust that issuer's word on addresses, or the address
 * belongs to an account that already exists. Both end at the same screen — sign in the way
 * you already do, then link this from settings — and neither is worth a retry.
 */
export default async function oidcLogin(
    slug: string,
    idToken: string,
    timezone?: string,
    mobile = false,
): Promise<OidcLoginResult> {
    try {
        const path = mobile ? `/auth/oidc/${slug}/mobile` : `/auth/oidc/${slug}`;
        const response = await getHttpClient().post<Record<string, unknown>>(path, { idToken, timezone });

        return {
            kind: 'success',
            user: response.data.success as UnknownUser,
            accessToken: response.headers['x-access-token'],
            refreshToken: response.data.refreshToken as string | undefined,
        };
    } catch (e) {
        getLogger().error(e);
        if (e instanceof ApiError && e.status === 403) {
            // The standard error envelope, with the reason and the provider in details. The
            // flat {error, reason, provider} body is what the server sent before it, read here
            // so a web build that lands first does not break against the older backend.
            const data = e.data as
                | {
                      errorKey?: string;
                      details?: { reason?: string; provider?: string };
                      error?: string;
                      reason?: string;
                      provider?: string;
                  }
                | undefined;
            if (data?.errorKey === 'FEDERATED_LINK_REQUIRED' || data?.error === 'FEDERATED_LINK_REQUIRED') {
                const reason = data.details?.reason ?? data.reason;
                return {
                    kind: 'linkRequired',
                    reason: (reason as OidcLinkRequiredReason) ?? 'EMAIL_NOT_TRUSTED',
                    provider: data.details?.provider ?? data.provider ?? slug,
                };
            }
        }
        if (e instanceof ApiError) {
            return { kind: 'error', error: parseApiError(e) };
        }
        return { kind: 'error', error: { errorKey: 'UnexpectedError' } };
    }
}

/**
 * Attaches a provider to the account already signed in.
 *
 * <p>The session is the proof that the person adding a second door to the account is
 * already inside it, which is why this endpoint is authenticated and the login one is not.
 */
export async function oidcLink(slug: string, idToken: string): Promise<{ success: true } | { error: ApiErrorPayload }> {
    try {
        await getHttpClient().post(`/auth/oidc/${slug}/link`, { idToken });
        return { success: true };
    } catch (e) {
        getLogger().error(e);
        if (e instanceof ApiError) {
            return { error: parseApiError(e) };
        }
        return { error: { errorKey: 'UnexpectedError' } };
    }
}
