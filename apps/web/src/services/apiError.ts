import axios from "axios";
import { TFunction } from "i18next";

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
    if (axios.isAxiosError(error)) {
        const data = error.response?.data;

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
