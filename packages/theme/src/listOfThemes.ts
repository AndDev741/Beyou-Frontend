import type { Theme, ThemeMode, ThemePreference } from './theme';
import {
    DEFAULT_ACCENT_PACK,
    accentPacks,
    buildTokens,
    findAccentPack,
    type ThemeBase,
} from './tokens';

/**
 * The redesign's theme model: two bases × five accent packs, replacing the nine
 * standalone themes. The preference persists as `"<mode>:<pack>"` — the mode can
 * be `system`, in which case the base comes from the OS preference.
 */

export const serializeThemePreference = ({ mode, accentPack }: ThemePreference): string =>
    `${mode}:${accentPack}`;

/**
 * Modes saved before the redesign. No account may be left orphaned: anything
 * that does not match falls back to `system:beyou`.
 *
 * Late Latte is a DARK theme (background #2c1e1e) despite the caramel accent —
 * it goes to the dark base, not the light one.
 */
export const LEGACY_MODE_MAP: Record<string, string> = {
    beYou: 'light:beyou',
    beYouDark: 'dark:beyou',
    Sunset: 'light:sunset',
    Amethyst: 'light:amethyst',
    Midnight: 'dark:beyou',
    Cyberpunk: 'dark:cyber',
    Mocha: 'light:sunset',
    Polar: 'dark:beyou',
    'Late Latte': 'dark:sunset',
};

export const DEFAULT_PREFERENCE: ThemePreference = {
    mode: 'system',
    accentPack: DEFAULT_ACCENT_PACK,
};

/**
 * Reads the persisted string (new format OR a legacy mode) and returns the
 * preference. An unknown value falls back to the default instead of throwing.
 */
export function parseThemePreference(raw: string | null | undefined): ThemePreference {
    if (!raw) return DEFAULT_PREFERENCE;

    const migrated = LEGACY_MODE_MAP[raw] ?? raw;
    const [mode, pack] = migrated.split(':');

    const validMode: ThemeMode =
        mode === 'light' || mode === 'dark' || mode === 'system' ? mode : 'system';

    return { mode: validMode, accentPack: findAccentPack(pack).id };
}

/** Resolves `system` against the OS preference. */
export const resolveBase = (mode: ThemeMode, prefersDark: boolean): ThemeBase =>
    mode === 'system' ? (prefersDark ? 'dark' : 'light') : mode;

/** Builds the Theme object (new tokens + old-model aliases). */
export function buildTheme(pref: ThemePreference, prefersDark = false): Theme {
    const base = resolveBase(pref.mode, prefersDark);
    const tokens = buildTokens(base, pref.accentPack);

    return {
        ...tokens,
        mode: serializeThemePreference(pref),
        base,
        accentPack: pref.accentPack,

        // Old-model aliases. `background` points at `surface` because 110 of the
        // 136 `bg-background` uses are a card, an input or a modal; the page
        // background switched to an explicit `bg`.
        background: tokens.surface,
        primary: tokens.accent,
        secondary: tokens.text,
        description: tokens.text2,
        icon: tokens.text2,
        placeholder: tokens.text3,
        error: tokens.danger,
    };
}

/** Shortcut: persisted string → theme ready to apply. */
export const themeFromStoredMode = (raw: string | null | undefined, prefersDark = false): Theme =>
    buildTheme(parseThemePreference(raw), prefersDark);

export const defaultLight: Theme = buildTheme({ mode: 'light', accentPack: DEFAULT_ACCENT_PACK });
export const defaultDark: Theme = buildTheme({ mode: 'dark', accentPack: DEFAULT_ACCENT_PACK });

/**
 * Every concrete combination. The real theme selector shows mode and pack
 * separately; this list exists for screens that need to iterate ready themes.
 */
export const themes: Theme[] = (['light', 'dark'] as ThemeBase[]).flatMap((mode) =>
    accentPacks.map((pack) => buildTheme({ mode, accentPack: pack.id })),
);
