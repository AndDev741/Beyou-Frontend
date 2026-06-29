/**
 * Canvas-based charts (chart.js) cannot resolve CSS custom properties the way
 * SVG/DOM can — passing "var(--primary)" to a canvas fillStyle silently falls
 * back to black. Chart widgets read concrete colors off the theme object and
 * normalize them here instead.
 */

/** Themes may define 8-digit hex (#rrggbbaa) — strip the alpha so callers can append their own. */
export const toHex6 = (raw: string): string =>
    raw.replace(/^(#[0-9a-fA-F]{6})[0-9a-fA-F]{2}$/, "$1");
