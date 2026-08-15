import { getHttpClient, ApiError } from '../httpClient';
import { ApiErrorPayload, parseApiError } from "../apiError";
import { getLogger } from "../logger";

type RequestCodeResponse = {
    success?: boolean;
    error?: ApiErrorPayload;
};

/**
 * Step one of deleting an account: BeYou mails a six-digit code to the address on
 * the account. Nothing is destroyed here, and the response says nothing about the
 * mail itself — that is the inbox's news to deliver.
 */
export default async function requestAccountDeletionCode(): Promise<RequestCodeResponse> {
    try {
        await getHttpClient().post("/user/deletion/code");
        return { success: true };
    } catch (e) {
        getLogger().error(e);
        if (e instanceof ApiError) {
            return { error: parseApiError(e) };
        }
        return { error: { errorKey: 'UnexpectedError' } };
    }
}
