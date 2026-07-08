import { getHttpClient, ApiError } from '../httpClient';
import { ApiErrorPayload, parseApiError } from "../apiError";
import { getLogger } from "../logger";

type UploadPhotoResponse = {
    success?: true;
    error?: ApiErrorPayload;
};

// Web passes a File/Blob; React Native passes a { uri, name, type } descriptor
// (RN's FormData uploads the file natively from the uri — Blobs from a fetched
// uri are not supported there).
export type UploadablePhoto = File | Blob | { uri: string; name: string; type: string };

export default async function uploadUserPhoto(file: UploadablePhoto): Promise<UploadPhotoResponse> {
    try {
        const formData = new FormData();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- RN FormData accepts the descriptor object
        formData.append('file', file as any);
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
