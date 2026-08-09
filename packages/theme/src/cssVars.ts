import type { Theme } from './theme';

/** "#1D6BF3" → "29 107 243" (raw channels, no colour function). */
const channels = (hex: string): string => {
    const clean = hex.replace('#', '').slice(0, 6);
    const int = parseInt(clean, 16);
    return `${(int >> 16) & 255} ${(int >> 8) & 255} ${int & 255}`;
};

/**
 * Single source for the token → CSS var map. Web (ThemeContext) and mobile
 * (ThemeProvider + nativewind `vars()`) both read it, so a new token cannot
 * land in one list and be missing from the other.
 *
 * Every colour is emitted TWICE: as hex (for `var(--accent)` in plain CSS and
 * for the RN theme object) and as raw channels `--accent-rgb`, which is what
 * lets Tailwind generate the opacity variants (`bg-accent/10`). Without the
 * channels, Tailwind v3 simply does NOT emit the slash class — the element ends
 * up with no background at all, which is what `bg-primary/10` did before the
 * redesign.
 */
export function themeToVars(theme: Theme): Record<string, string> {
    const solid: Record<string, string> = {
        '--bg': theme.bg,
        '--surface': theme.surface,
        '--surface-2': theme.surface2,
        '--border': theme.border,
        '--text': theme.text,
        '--text-2': theme.text2,
        '--text-3': theme.text3,
        '--accent': theme.accent,
        '--accent-strong': theme.accentStrong,
        '--on-accent': theme.onAccent,
        '--xp': theme.xp,
        '--flame': theme.flame,
        '--success': theme.success,
        '--danger': theme.danger,

        // Old-model aliases — they go in the cleanup phase.
        '--background': theme.background,
        '--primary': theme.primary,
        '--secondary': theme.secondary,
        '--description': theme.description,
        '--icon': theme.icon,
        '--placeholder': theme.placeholder,
        '--error': theme.error,
    };

    const rgb = Object.fromEntries(
        Object.entries(solid).map(([name, value]) => [`${name}-rgb`, channels(value)]),
    );

    return {
        ...solid,
        ...rgb,
        // Already carry their own alpha; they take no opacity variants.
        '--accent-soft': theme.accentSoft,
        '--xp-soft': theme.xpSoft,
        '--flame-soft': theme.flameSoft,
        '--shadow': theme.shadow,
    };
}
