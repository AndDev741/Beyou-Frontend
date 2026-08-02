import type { Theme } from './theme';

/**
 * Fonte única do mapa token → CSS var. Web (ThemeContext) e mobile
 * (ThemeProvider + nativewind `vars()`) leem daqui, para não existir duas
 * listas que divergem quando um token nasce.
 */
export function themeToVars(theme: Theme): Record<string, string> {
    return {
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
        '--accent-soft': theme.accentSoft,
        '--xp': theme.xp,
        '--xp-soft': theme.xpSoft,
        '--flame': theme.flame,
        '--flame-soft': theme.flameSoft,
        '--success': theme.success,
        '--danger': theme.danger,
        '--shadow': theme.shadow,

        // Aliases do modelo antigo — saem na fase de limpeza, quando o último
        // `bg-background` / `text-secondary` tiver virado token novo.
        '--background': theme.background,
        '--primary': theme.primary,
        '--secondary': theme.secondary,
        '--description': theme.description,
        '--icon': theme.icon,
        '--placeholder': theme.placeholder,
        '--error': theme.error,
    };
}
