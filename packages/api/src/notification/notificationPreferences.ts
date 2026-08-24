import type { Schemas } from "@beyou/contracts";
import { getHttpClient, ApiError } from '../httpClient';
import { ApiErrorPayload, parseApiError } from "../apiError";
import { getLogger } from "../logger";

/**
 * The engagement-mail switch, as the settings screen sees it.
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

/** Flips the switch for the signed-in account. */
export async function updateNotificationPreferences(
    engagementEmail: boolean,
): Promise<PreferencesResponse> {
    try {
        const response = await getHttpClient().put<NotificationPreferences>(
            "/notification/preferences",
            { engagementEmail },
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
