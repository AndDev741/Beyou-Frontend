import { getHttpClient, ApiError } from '../httpClient';
import { ApiErrorPayload, parseApiError } from '../apiError';
import { getLogger } from '../logger';

/**
 * How long the backend makes a user wait between verification mails.
 *
 * <p>Mirrors {@code EMAIL_VERIFICATION_COOLDOWN_SECONDS} in the backend's
 * application.yaml. The server is the enforcer and this number is only here so the
 * button can count down instead of failing silently — the endpoint answers 200
 * either way, so a client that guessed low would show "sent" for a mail that was
 * never sent.
 */
export const RESEND_VERIFICATION_COOLDOWN_SECONDS = 60;

type ResendResponse = {
    success?: boolean;
    error?: ApiErrorPayload;
};

/**
 * Asks for another verification mail, for an account that never got the first one.
 *
 * <p>The response says nothing about whether a mail actually went out. It is the same
 * 200 whether the address is unknown, already verified, or still inside its cooldown,
 * because anything else would let a stranger ask this endpoint which addresses hold an
 * account. So the screen can only ever promise the inbox, never the account.
 *
 * <p>A thrown error here is a transport failure or the shared auth rate limit, not a
 * verdict on the address.
 */
export default async function resendVerification(email: string): Promise<ResendResponse> {
    try {
        await getHttpClient().post('/auth/resend-verification', { email });
        return { success: true };
    } catch (e) {
        getLogger().error(e);
        if (e instanceof ApiError) {
            return { error: parseApiError(e) };
        }
        return { error: { errorKey: 'UnexpectedError' } };
    }
}
