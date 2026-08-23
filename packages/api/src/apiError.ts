import { TFunction } from "i18next";
import { ApiError } from "./httpClient";

export type ApiErrorPayload = {
    errorKey?: string;
    message?: string;
    details?: Record<string, string>;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
    Boolean(value) && typeof value === "object" && !Array.isArray(value);

const extractDetails = (data: Record<string, unknown>): Record<string, string> | undefined => {
    const details = data.details;
    if (details && typeof details === "object" && !Array.isArray(details)) {
        return details as Record<string, string>;
    }

    if (!("errorKey" in data) && !("error" in data) && !("message" in data) && !("argumentError" in data)) {
        return data as Record<string, string>;
    }

    return undefined;
};

export const parseApiError = (error: unknown): ApiErrorPayload => {
    if (error instanceof ApiError) {
        const data = error.data;

        if (typeof data === "string") {
            return { message: data };
        }

        if (isRecord(data)) {
            const errorKey = typeof data.errorKey === "string" ? data.errorKey : undefined;
            const message =
                (typeof data.message === "string" && data.message) ||
                (typeof data.error === "string" && data.error) ||
                (typeof data.argumentError === "string" && data.argumentError) ||
                undefined;
            const details = extractDetails(data);
            return { errorKey, message, details };
        }
    }

    return {};
};

/** The key every rate-limit refusal is reported under; translated in both languages. */
export const RATE_LIMIT_ERROR_KEY = "RATE_LIMIT_EXCEEDED";

/**
 * True when the backend turned this request away for rate limiting.
 *
 * One predicate rather than a `status === 429` at each call site, because the auth
 * screens are where getting this wrong hurts most: they collapse every failure into
 * "wrong email or password", so a throttled user was told their correct password was
 * wrong and went back to retyping it, burning what was left of the bucket. Handles
 * both error shapes in the codebase — the ApiError the shared client throws, and the
 * raw axios error the web auth requests still catch.
 */
export const isRateLimited = (error: unknown): boolean => {
    if (error instanceof ApiError) return error.status === 429;
    if (!isRecord(error)) return false;
    const response = error.response;
    return isRecord(response) && response.status === 429;
};

export const getErrorDetailsText = (error?: ApiErrorPayload): string => {
    if (!error) return "";
    if (error.details) return Object.values(error.details).join(", ");
    if (error.message) return error.message;
    return "";
};

export const getFriendlyErrorMessage = (t: TFunction, error?: ApiErrorPayload): string => {
    if (!error) return t("UnexpectedError");
    if (error.errorKey) return t(error.errorKey);
    if (error.message) return error.message;
    if (error.details) return Object.values(error.details).join(", ");
    return t("UnexpectedError");
};
