import { getHttpClient, ApiError } from '../httpClient';
import { ApiErrorPayload, parseApiError } from "../apiError";
import { getLogger } from "../logger";

type UploadPhotoResponse = {
    success?: true;
    error?: ApiErrorPayload;
};

export default async function uploadUserPhoto(file: File | Blob): Promise<UploadPhotoResponse> {
    try {
        const formData = new FormData();
        formData.append('file', file);
        await getHttpClient().post('/user/photo', formData);
        return { success: true };
    } catch (e) {
        getLogger().error(e);
        if (e instanceof ApiError) {
            return { error: parseApiError(e) };
        }
        return { error: { errorKey: 'UnexpectedError' } };
    }
}
