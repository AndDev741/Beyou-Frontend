/**
 * Canvas-based charts (chart.js) cannot resolve CSS custom properties the way
 * SVG/DOM can — passing "var(--accent)" to a canvas fillStyle silently falls
 * back to black. Chart widgets read concrete colors off the theme object and
 * normalize them here instead.
 */
import type { Theme } from "@beyou/theme";

/** Themes may define 8-digit hex (#rrggbbaa) — strip the alpha so callers can append their own. */
export const toHex6 = (raw: string): string =>
    raw.replace(/^(#[0-9a-fA-F]{6})[0-9a-fA-F]{2}$/, "$1");

/** #RRGGBB + alpha → rgba(), para preenchimentos translúcidos no canvas. */
export const withAlpha = (raw: string, alpha: number): string => {
    const int = parseInt(toHex6(raw).replace("#", ""), 16);
    return `rgba(${(int >> 16) & 255},${(int >> 8) & 255},${int & 255},${alpha})`;
};

/**
 * Paleta de gráfico do redesign (seção "Widgets restantes" do mockup): melhor
 * área em `success`, pior em `flame` (atenção, não erro), demais séries no
 * acento; grade em `border`, eixos em `text-3`.
 */
export const chartPalette = (theme: Theme) => ({
    series: toHex6(theme.accent),
    seriesSoft: withAlpha(theme.accent, 0.18),
    good: toHex6(theme.success),
    goodSoft: withAlpha(theme.success, 0.18),
    warn: toHex6(theme.flame),
    warnSoft: withAlpha(theme.flame, 0.18),
    grid: toHex6(theme.border),
    axis: toHex6(theme.text3),
    label: toHex6(theme.text2),
    surface: toHex6(theme.surface),
});
