import type { Theme, ThemeMode, ThemePreference } from './theme';
import {
    DEFAULT_ACCENT_PACK,
    accentPacks,
    buildTokens,
    findAccentPack,
    type ThemeBase,
} from './tokens';

/**
 * O modelo de temas do redesign: duas bases × cinco packs de acento, no lugar
 * dos 9 temas soltos. A preferência é persistida como `"<modo>:<pack>"` — o
 * modo pode ser `system`, e nesse caso a base sai da preferência do SO.
 */

export const serializeThemePreference = ({ mode, accentPack }: ThemePreference): string =>
    `${mode}:${accentPack}`;

/**
 * Modos salvos antes do redesign. Nenhum usuário pode ficar órfão: o que não
 * casar cai em `system:beyou`.
 *
 * Late Latte é um tema ESCURO (fundo #2c1e1e) apesar do acento caramelo — vai
 * para a base escura, não para a clara.
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
 * Lê a string persistida (formato novo OU um modo legado) e devolve a
 * preferência. Entrada desconhecida cai no padrão em vez de explodir.
 */
export function parseThemePreference(raw: string | null | undefined): ThemePreference {
    if (!raw) return DEFAULT_PREFERENCE;

    const migrated = LEGACY_MODE_MAP[raw] ?? raw;
    const [mode, pack] = migrated.split(':');

    const validMode: ThemeMode =
        mode === 'light' || mode === 'dark' || mode === 'system' ? mode : 'system';

    return { mode: validMode, accentPack: findAccentPack(pack).id };
}

/** Resolve `system` contra a preferência do SO. */
export const resolveBase = (mode: ThemeMode, prefersDark: boolean): ThemeBase =>
    mode === 'system' ? (prefersDark ? 'dark' : 'light') : mode;

/** Monta o objeto Theme (tokens novos + aliases do modelo antigo). */
export function buildTheme(pref: ThemePreference, prefersDark = false): Theme {
    const base = resolveBase(pref.mode, prefersDark);
    const tokens = buildTokens(base, pref.accentPack);

    return {
        ...tokens,
        mode: serializeThemePreference(pref),
        base,
        accentPack: pref.accentPack,

        // Aliases do modelo antigo. `background` aponta para `surface` porque
        // 110 dos 136 usos de bg-background são cartão, input ou modal; o fundo
        // de página passou a usar `bg` explicitamente.
        background: tokens.surface,
        primary: tokens.accent,
        secondary: tokens.text,
        description: tokens.text2,
        icon: tokens.text2,
        placeholder: tokens.text3,
        error: tokens.danger,
    };
}

/** Atalho: string persistida → tema pronto para aplicar. */
export const themeFromStoredMode = (raw: string | null | undefined, prefersDark = false): Theme =>
    buildTheme(parseThemePreference(raw), prefersDark);

export const defaultLight: Theme = buildTheme({ mode: 'light', accentPack: DEFAULT_ACCENT_PACK });
export const defaultDark: Theme = buildTheme({ mode: 'dark', accentPack: DEFAULT_ACCENT_PACK });

/**
 * Todas as combinações concretas. O seletor de tema real mostra modo e pack
 * separados; esta lista existe para telas que precisam iterar temas prontos.
 */
export const themes: Theme[] = (['light', 'dark'] as ThemeBase[]).flatMap((mode) =>
    accentPacks.map((pack) => buildTheme({ mode, accentPack: pack.id })),
);
