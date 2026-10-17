import type { DiagramTone } from '@beyou/types/notebook/diagram';
import type { Tokens } from '@beyou/theme';

/**
 * Concrete colors for a diagram, from the active theme's tokens. Concrete on purpose: the
 * phone has no CSS variables, and a downloaded SVG or PNG must look the same outside the app.
 * Each tone has a wash, a stroke and a label color that keeps 4.5:1 on its own wash in both bases.
 */

export type ToneColors = { fill: string; stroke: string; label: string; softFill: string; softStroke: string; dot: string };

export type DiagramColors = {
    /** The panel a diagram sits on; edge labels sit on pills of this color. */
    ground: string;
    surface: string;
    edge: string;
    edgeSoft: string;
    guide: string;
    text: string;
    muted: string;
    tones: Record<DiagramTone, ToneColors>;
    /** A layer band's wash: level 0..1 how strong, -1 plain. */
    band: (level: number) => { fill: string; stroke: string };
};

const hex6 = (raw: string): string => {
    const value = raw.trim();
    if (/^#[0-9a-f]{8}$/i.test(value)) return value.slice(0, 7);
    if (/^#[0-9a-f]{3}$/i.test(value)) return `#${value[1]}${value[1]}${value[2]}${value[2]}${value[3]}${value[3]}`;
    return value;
};

const channels = (raw: string): [number, number, number] => {
    const int = parseInt(hex6(raw).replace('#', ''), 16);
    return [(int >> 16) & 255, (int >> 8) & 255, int & 255];
};

const alpha = (raw: string, value: number): string => {
    const [r, g, b] = channels(raw);
    return `rgba(${r},${g},${b},${value})`;
};

/** `a` moved toward `b` by `amount` (0..1), as #rrggbb. */
const mix = (a: string, b: string, amount: number): string => {
    const [ar, ag, ab] = channels(a);
    const [br, bg, bb] = channels(b);
    const part = (x: number, y: number) => Math.round(x + (y - x) * amount).toString(16).padStart(2, '0');
    return `#${part(ar, br)}${part(ag, bg)}${part(ab, bb)}`;
};

export function diagramColors(tokens: Tokens): DiagramColors {
    const tone = (base: string, fill: number, stroke: number, labelPull: number): ToneColors => ({
        fill: alpha(base, fill),
        stroke: alpha(base, stroke),
        // The raw tone is too light for text on its own wash in the light base and too dark in
        // the dark one; pulling it toward the text color fixes both.
        label: mix(base, tokens.text, labelPull),
        softFill: alpha(base, fill / 2),
        softStroke: alpha(base, stroke * 0.62),
        dot: hex6(base),
    });
    return {
        ground: hex6(tokens.bg),
        surface: hex6(tokens.surface),
        edge: hex6(tokens.text3),
        edgeSoft: alpha(tokens.text3, 0.62),
        guide: alpha(tokens.text3, 0.45),
        text: hex6(tokens.text),
        muted: hex6(tokens.text2),
        tones: {
            NEUTRAL: {
                fill: hex6(tokens.surface),
                stroke: alpha(tokens.text3, 0.45),
                label: hex6(tokens.text),
                softFill: hex6(tokens.surface),
                softStroke: hex6(tokens.border),
                dot: hex6(tokens.text3),
            },
            ACCENT: { ...tone(tokens.accent, 0.1, 0.45, 0.15), label: hex6(tokens.accentStrong) },
            SUCCESS: tone(tokens.success, 0.12, 0.5, 0.35),
            WARNING: tone(tokens.xp, 0.12, 0.5, 0.25),
            DANGER: tone(tokens.danger, 0.09, 0.42, 0.35),
        },
        band: (level) => level < 0
            ? { fill: hex6(tokens.surface), stroke: alpha(tokens.text3, 0.45) }
            : { fill: alpha(tokens.accent, 0.06 + 0.1 * level), stroke: alpha(tokens.accent, 0.26 + 0.19 * level) },
    };
}
