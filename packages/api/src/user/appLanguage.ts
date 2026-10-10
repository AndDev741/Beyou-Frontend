/** The languages Beyou ships. Everything else falls back to English on screen. */
export type AppLanguage = 'en' | 'pt';

/**
 * The shipped language a tag stands for, or null when it stands for none.
 *
 * i18next reports whatever the browser or device said, so a Brazilian browser gives
 * `pt-BR` and a British one `en-GB`; only the primary subtag matters. Null rather than a
 * default, so a caller can tell "nothing to send" from "English": the backend leaves an
 * account's language empty when nothing usable arrives, and the boot reconcile tries
 * again later. The backend applies the same rule (`UserLanguage.usableOrNull`), so a
 * client that skips this is still safe.
 */
export function appLanguageOrNull(language?: string | null): AppLanguage | null {
    const primary = language?.trim().toLowerCase().split(/[-_]/)[0];
    return primary === 'en' || primary === 'pt' ? primary : null;
}

/**
 * The language a screen is actually showing, from an i18next instance.
 *
 * `resolvedLanguage` first: for a French browser `language` is `fr` while the screen is
 * in English, and English is the honest answer to send.
 */
export function shownLanguage(i18n: { resolvedLanguage?: string; language?: string }): AppLanguage | null {
    return appLanguageOrNull(i18n.resolvedLanguage || i18n.language);
}
