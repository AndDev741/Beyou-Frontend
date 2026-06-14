/**
 * Auth-layer error parsing.
 *
 * The authentication request files call axios directly (not through the
 * injected HttpClient), so they receive raw AxiosErrors — not ApiError
 * instances. This module provides `parseApiError` for that layer, keeping
 * the same logic as the original apiError.ts but using
 * `axios.isAxiosError` instead of `e instanceof ApiError`.
 *
 * Re-exports ApiErrorPayload from @beyou/api for type consistency.
 */
import axios from 'axios';
import type { ApiErrorPayload } from '@beyou/api/apiError';
export type { ApiErrorPayload } from '@beyou/api/apiError';
export { getErrorDetailsText, getFriendlyErrorMessage } from '@beyou/api/apiError';

const isRecord = (value: unknown): value is Record<string, unknown> =>
    Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const extractDetails = (data: Record<string, unknown>): Record<string, string> | undefined => {
    const details = data.details;
    if (details && typeof details === 'object' && !Array.isArray(details)) {
        return details as Record<string, string>;
    }
    if (!('errorKey' in data) && !('error' in data) && !('message' in data) && !('argumentError' in data)) {
        return data as Record<string, string>;
    }
    return undefined;
};

export const parseApiError = (error: unknown): ApiErrorPayload => {
    if (axios.isAxiosError(error)) {
        const data = error.response?.data;
        if (typeof data === 'string') {
            return { message: data };
        }
        if (isRecord(data)) {
            const errorKey = typeof data.errorKey === 'string' ? data.errorKey : undefined;
            const message =
                (typeof data.message === 'string' && data.message) ||
                (typeof data.error === 'string' && data.error) ||
                (typeof data.argumentError === 'string' && data.argumentError) ||
                undefined;
            const details = extractDetails(data);
            return { errorKey, message, details };
        }
    }
    return {};
};
