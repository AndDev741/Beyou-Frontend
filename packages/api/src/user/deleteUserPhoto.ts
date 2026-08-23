import { getHttpClient, ApiError } from '../httpClient';
import { ApiErrorPayload, parseApiError } from "../apiError";
import { getLogger } from "../logger";

type DeleteUserPhotoResponse = {
    success?: true;
    error?: ApiErrorPayload;
};

/**
 * Removes the account's profile photo.
 *
 * There was no way to do this from either client. Upload overwrote, and a user who
 * wanted no photo at all had nowhere to go: the one removal-shaped call available
 * was an edit with an empty `photo`, which clears a column the server does not read
 * while an uploaded file exists, so the photo came back on the next profile fetch.
 *
 * No body and no id: the endpoint takes the account from the token. Callers should
 * re-fetch the profile afterwards rather than assuming a shape, the same way upload
 * does, because what the server serves depends on which of the two stored photos an
 * account had.
 */
export default async function deleteUserPhoto(): Promise<DeleteUserPhotoResponse> {
    try {
        await getHttpClient().delete('/user/photo');
        return { success: true };
    } catch (e) {
        getLogger().error(e);
        if (e instanceof ApiError) {
            return { error: parseApiError(e) };
        }
        return { error: { errorKey: 'UnexpectedError' } };
    }
}
