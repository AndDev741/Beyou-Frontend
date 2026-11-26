import type { UserType } from "@beyou/types/user/UserType";
import { getHttpClient, ApiError } from '../httpClient';
import { ApiErrorPayload, parseApiError } from "../apiError";
import { getLogger } from "../logger";

type SetAiConsentResponse = {
    data?: UserType;
    error?: ApiErrorPayload;
};

/**
 * Records the person's yes or no to Beyou sending their data to its AI provider.
 *
 * Its own route, not a field of `PUT /user`: it is a permission, written only when the
 * person answers the question. The answer comes back as the whole profile, so the caller
 * can put the new `aiConsent` straight into its state.
 */
export default async function setAiConsent(
    granted: boolean,
    options: { onlyIfUnasked?: boolean } = {},
): Promise<SetAiConsentResponse> {
    try {
        // onlyIfUnasked: a phone handing over an answer it kept while the server could not
        // store one. It lands only on an account nobody answered for yet; the reply carries
        // whatever the account holds, which may be a newer answer from another device.
        const body = options.onlyIfUnasked ? { granted, onlyIfUnasked: true } : { granted };
        const response = await getHttpClient().put<UserType>('/user/ai-consent', body);
        return { data: response.data };
    } catch (e) {
        getLogger().error(e);
        if (e instanceof ApiError) {
            return { error: parseApiError(e) };
        }
        return { error: { errorKey: 'UnexpectedError' } };
    }
}
