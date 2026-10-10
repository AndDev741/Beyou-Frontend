import type { Dispatch, UnknownAction } from '@reduxjs/toolkit';
import { getLogger } from '@beyou/api';
import editUser from '@beyou/api/user/editUser';
import { appLanguageOrNull } from '@beyou/api/user/appLanguage';
import { languageInUserEnter } from './perfilSlice';

/**
 * Saves the language the screen is showing on an account that has none, once.
 *
 * Until signup sent a language, nothing ever wrote `languageInUse` unless someone opened
 * the language setting, and the server reads that column for every model prompt and
 * every mail. An empty value means English there, so a person reading the app in
 * Portuguese got an English daily briefing and an English notebook tutor next to it.
 * Signup now carries the language, which fixes new accounts; this fixes the ones that
 * already exist, on their next boot.
 *
 * Shared by web and mobile, unlike the timezone reconcile, because the only
 * platform-specific part is which i18next instance to read, and each caller passes that
 * in as `uiLanguage`.
 *
 * Only an empty value is filled. A saved language is a choice, and the screen follows it,
 * so overwriting it from the screen would be circular at best. Failure is swallowed: this
 * runs while the app is loading and must never be why loading fails.
 */
export async function reconcileLanguage(
    dispatch: Dispatch<UnknownAction>,
    profile: { languageInUse?: string | null } | null | undefined,
    uiLanguage: string | null | undefined,
): Promise<void> {
    if (!profile || profile.languageInUse?.trim()) return;

    const language = appLanguageOrNull(uiLanguage);
    if (!language) return;

    try {
        const response = await editUser({ language });
        if (response?.error) {
            getLogger().error('Language reconcile rejected', response.error);
            return;
        }
        dispatch(languageInUserEnter(language));
    } catch (e) {
        getLogger().error('Language reconcile failed', e);
    }
}
