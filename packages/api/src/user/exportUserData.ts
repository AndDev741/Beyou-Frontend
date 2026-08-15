import { getHttpClient, ApiError } from '../httpClient';
import { ApiErrorPayload, parseApiError } from "../apiError";
import { getLogger } from "../logger";

type ExportResponse = {
    data?: Record<string, unknown>;
    error?: ApiErrorPayload;
};

/**
 * Everything the account holds, as one JSON object. The endpoint has existed
 * without a way to reach it; it belongs next to the delete button, where wanting
 * a copy of your data is the most likely thing anyone will ever want it for.
 */
export default async function exportUserData(): Promise<ExportResponse> {
    try {
        const response = await getHttpClient().get<Record<string, unknown>>("/user/export");
        return { data: response.data };
    } catch (e) {
        getLogger().error(e);
        if (e instanceof ApiError) {
            return { error: parseApiError(e) };
        }
        return { error: { errorKey: 'UnexpectedError' } };
    }
}
