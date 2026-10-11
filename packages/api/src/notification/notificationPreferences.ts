import type { Schemas } from "@beyou/contracts";
import { getHttpClient, ApiError } from '../httpClient';
import { ApiErrorPayload, parseApiError } from "../apiError";
import { getLogger } from "../logger";

/**
 * The engagement-mail switch and the calendar reminder settings, as the settings screen sees them.
 *
 * Typed from the generated contract rather than a hand-written shape, so a backend field
 * rename fails the typecheck here instead of turning into an `undefined` toggle at
 * runtime.
 */
export type NotificationPreferences = Schemas['NotificationPreferencesResponseDTO'];

type PreferencesResponse = {
    data?: NotificationPreferences;
    error?: ApiErrorPayload;
};

/**
 * Reads the switch. The backend creates the row on first read, so this is also what
 * mints the account's unsubscribe token — the token itself never comes back here, since
 * a client holding a session has no use for a capability that bypasses sessions.
 */
export async function getNotificationPreferences(): Promise<PreferencesResponse> {
    try {
        const response = await getHttpClient().get<NotificationPreferences>("/notification/preferences");
        return { data: response.data };
    } catch (e) {
        getLogger().error(e);
        if (e instanceof ApiError) {
            return { error: parseApiError(e) };
        }
        return { error: { errorKey: 'UnexpectedError' } };
    }
}

/**
 * The fields a PUT may carry. Every one is optional and an absent field stays as it is, so the
 * engagement switch and the reminder settings can each save without reading the other first.
 */
export type NotificationPreferencesPatch = {
    engagementEmail?: boolean;
    reminderEmail?: boolean;
    reminderWeb?: boolean;
    /** `HH:mm`, when a task with no time gets reminded. */
    reminderDefaultTime?: string;
};

/**
 * Saves preferences for the signed-in account. A bare boolean is the engagement-mail switch, the
 * shape the settings screens used before the reminder fields existed.
 */
export async function updateNotificationPreferences(
    patch: boolean | NotificationPreferencesPatch,
): Promise<PreferencesResponse> {
    try {
        const body = typeof patch === "boolean" ? { engagementEmail: patch } : patch;
        const response = await getHttpClient().put<NotificationPreferences>(
            "/notification/preferences",
            body,
        );
        return { data: response.data };
    } catch (e) {
        getLogger().error(e);
        if (e instanceof ApiError) {
            return { error: parseApiError(e) };
        }
        return { error: { errorKey: 'UnexpectedError' } };
    }
}
