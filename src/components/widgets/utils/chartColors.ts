/**
 * Canvas-based charts (chart.js) cannot resolve CSS custom properties the way
 * SVG/DOM can — passing "var(--primary)" to a canvas fillStyle silently falls
 * back to black. Resolve the theme color at draw time instead.
 */

/** Themes may define 8-digit hex (#rrggbbaa) — strip the alpha so callers can append their own. */
export const toHex6 = (raw: string): string =>
    raw.replace(/^(#[0-9a-fA-F]{6})[0-9a-fA-F]{2}$/, "$1");

/** Resolve a theme CSS variable (e.g. "--primary") to a concrete 6-digit hex color. */
export function resolveThemeColor(variableName: string, fallback: string): string {
    if (typeof document === "undefined") return fallback;
    const raw = getComputedStyle(document.documentElement).getPropertyValue(variableName).trim();
    return raw ? toHex6(raw) : fallback;
}
