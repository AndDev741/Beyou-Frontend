import { TFunction } from 'i18next';
import { ApiError, getHttpClient } from '../httpClient';
import { ApiErrorPayload, parseApiError } from '../apiError';
import { getLogger } from '../logger';

/**
 * The study notebook's calls all answer `{ success }` or `{ error }`, like the rest of
 * `@beyou/api`, so neither app can throw out of a render.
 */
export type Result<T> = { success?: T; error?: ApiErrorPayload };

export const fail = <T>(e: unknown, t: TFunction): Result<T> => {
    if (e instanceof ApiError) {
        getLogger().error(e);
        return { error: parseApiError(e) };
    }
    return { error: { message: t('UnexpectedError') } };
};

/** Runs one request and wraps its outcome. */
export async function call<T>(request: () => Promise<{ data: T }>, t: TFunction): Promise<Result<T>> {
    try {
        const response = await request();
        return { success: response.data };
    } catch (e) {
        return fail<T>(e, t);
    }
}

export const http = () => getHttpClient();
