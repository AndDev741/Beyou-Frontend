import { getHttpClient, ApiError } from '../httpClient';
import { ApiErrorPayload, parseApiError } from "../apiError";
import { getLogger } from "../logger";

type UnsubscribeResponse = {
    success?: boolean;
    error?: ApiErrorPayload;
};

/**
 * Turns engagement mail off for the holder of a token, with no session.
 *
 * The token travels in the body, not the query string: query strings reach browser
 * history and the `Referer` header of the next navigation, and the analytics scrubber on
 * this app exists because an OAuth code once arrived that way. A capability should not
 * go where a URL goes.
 *
 * The caller is the unsubscribe page, which reads the token out of its own URL — that
 * part is unavoidable, since a link is the only thing a mail client can carry — and posts
 * it here immediately.
 */
export default async function unsubscribe(token: string): Promise<UnsubscribeResponse> {
    try {
        await getHttpClient().post("/notification/unsubscribe", { token });
        return { success: true };
    } catch (e) {
        getLogger().error(e);
        if (e instanceof ApiError) {
            return { error: parseApiError(e) };
        }
        return { error: { errorKey: 'UnexpectedError' } };
    }
}
