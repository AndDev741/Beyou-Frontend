import { Dispatch, UnknownAction } from "@reduxjs/toolkit";
import { UserType } from "@beyou/types/user/UserType";
import { getLogger } from "@beyou/api";
import editUser from "@beyou/api/user/editUser";
import { timezoneEnter, timezoneSourceEnter } from "@beyou/state/user/perfilSlice";

/**
 * The browser's IANA zone, or null when it cannot be read.
 *
 * Shared with the settings screen so the two never disagree about what "detected"
 * means. `Intl` throws in a hardened or very old browser, and a missing zone is a
 * reason to leave the account alone, not to break the boot.
 */
export function detectTimezone(): string | null {
    try {
        return Intl.DateTimeFormat().resolvedOptions().timeZone || null;
    } catch {
        return null;
    }
}

/**
 * Adopts the device's timezone for an account that has never had one, once.
 *
 * Every account before this change was created with `timezone = "UTC"` because no
 * signup path set anything else, and `UserDateResolver` keys every permanent date row
 * off that value. Signup now carries the zone, which fixes new accounts; this fixes the
 * ones that already exist, on their next boot.
 *
 * Three guards, and each one matters:
 *  - `timezoneSource === "DEFAULT"` — the only adoptable state. `DETECTED` means a
 *    client already answered, and re-adopting would move a travelling user's day
 *    boundary under them; `EXPLICIT` means a person chose it. The backend enforces this
 *    too, so a bug here cannot overwrite a real answer, but checking first saves a
 *    pointless write on every boot.
 *  - a zone was actually detected.
 *  - it differs from what is stored, so an account already on the right zone stays quiet.
 *
 * Failure is swallowed. This is a background correction on a path that is otherwise
 * about getting the user into the app; it must never be the reason a boot fails.
 */
export async function reconcileTimezone(
    dispatch: Dispatch<UnknownAction>,
    profile: UserType,
): Promise<void> {
    if (profile?.timezoneSource !== "DEFAULT") return;

    const detected = detectTimezone();
    if (!detected || detected === profile.timezone) return;

    try {
        const response = await editUser({ timezone: detected, timezoneSource: "DETECTED" });
        if (response?.error) {
            getLogger().error("Timezone reconcile rejected", response.error);
            return;
        }
        dispatch(timezoneEnter(detected));
        dispatch(timezoneSourceEnter("DETECTED"));
    } catch (e) {
        getLogger().error("Timezone reconcile failed", e);
    }
}
