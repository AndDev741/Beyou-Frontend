import { getHttpClient, ApiError } from '../httpClient';
import { ApiErrorPayload, parseApiError } from "../apiError";
import { getLogger } from "../logger";

type DeleteAccountResponse = {
    success?: boolean;
    error?: ApiErrorPayload;
};

/**
 * Step two: spend the emailed code and delete the account, for good.
 *
 * A POST, not a DELETE: the code travels in the body, and this client's config is
 * headers/params/timeout by design, so no adapter carries a body on DELETE. On
 * success the session is already over — the backend clears the refresh cookie on
 * its way out — so the caller's job is to drop local state and leave.
 */
export default async function deleteAccount(code: string): Promise<DeleteAccountResponse> {
    try {
        await getHttpClient().post("/user/deletion/confirm", { code });
        return { success: true };
    } catch (e) {
        getLogger().error(e);
        if (e instanceof ApiError) {
            return { error: parseApiError(e) };
        }
        return { error: { errorKey: 'UnexpectedError' } };
    }
}
