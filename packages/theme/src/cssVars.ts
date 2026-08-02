import type { Theme } from './theme';

/** "#1D6BF3" → "29 107 243" (canais crus, sem função de cor). */
const channels = (hex: string): string => {
    const clean = hex.replace('#', '').slice(0, 6);
    const int = parseInt(clean, 16);
    return `${(int >> 16) & 255} ${(int >> 8) & 255} ${int & 255}`;
};

/**
 * Fonte única do mapa token → CSS var. Web (ThemeContext) e mobile
 * (ThemeProvider + nativewind `vars()`) leem daqui, para não existir duas
 * listas que divergem quando um token nasce.
 *
 * Cada cor sai DUAS vezes: em hex (para `var(--accent)` em CSS puro e para o
 * objeto de tema no RN) e em canais crus `--accent-rgb`, que é o que permite
 * ao Tailwind gerar as variantes de opacidade (`bg-accent/10`). Sem os canais,
 * Tailwind v3 simplesmente NÃO emite a classe com barra — o elemento fica sem
 * fundo nenhum, que era o que acontecia com bg-primary/10 antes do redesign.
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

        // Aliases do modelo antigo — saem na fase de limpeza.
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
        // Já vêm com alfa embutido; não participam das variantes de opacidade.
        '--accent-soft': theme.accentSoft,
        '--xp-soft': theme.xpSoft,
        '--flame-soft': theme.flameSoft,
        '--shadow': theme.shadow,
    };
}
