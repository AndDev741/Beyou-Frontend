/**
 * Text width without a canvas.
 *
 * The layout has to come out the same on the web and on the phone, and React Native has no
 * canvas to measure with, so widths are estimated from a table of average advances for Geist
 * (the app's face) in em. The estimate errs a little wide, so a label never spills out of the
 * box it was measured for; a few pixels of extra padding is the price.
 */

const NARROW = new Set("il.,:;'|!ı`´".split(''));
const SEMI = new Set('frtjI()[]{}-"/\\ '.split(''));
const WIDE = new Set('mwMW@%&'.split(''));
const UPPER_WIDE = new Set('CDGHNOQU'.split(''));

function advance(char: string): number {
    if (NARROW.has(char)) return 0.26;
    if (SEMI.has(char)) return 0.34;
    if (WIDE.has(char)) return 0.84;
    if (char >= '0' && char <= '9') return 0.58;
    if (char >= 'A' && char <= 'Z') return UPPER_WIDE.has(char) ? 0.72 : 0.64;
    // Accented and other letters: lower case is the common case in labels.
    if (char.toUpperCase() !== char) return 0.54;
    if (char.toLowerCase() !== char) return 0.66;
    return 0.6;
}

/** Estimated width in px of `text` at `size` px; semibold runs about 4% wider. */
export function textWidth(text: string, size: number, weight = 400): number {
    let em = 0;
    for (const char of text) em += advance(char);
    return em * size * (weight >= 600 ? 1.05 : weight >= 500 ? 1.02 : 1);
}

/**
 * Greedy word wrap into at most `maxLines` lines no wider than `maxWidth`. A word longer than a
 * line is cut by characters. When the text does not fit, the last line ends in an ellipsis.
 */
export function wrapText(text: string, size: number, weight: number, maxWidth: number, maxLines: number): string[] {
    const words = text.split(/\s+/).filter(Boolean);
    const lines: string[] = [];
    let line = '';
    const push = () => {
        if (line) lines.push(line);
        line = '';
    };
    for (let i = 0; i < words.length; i++) {
        let word = words[i];
        // A single word wider than the line goes in pieces.
        while (textWidth(word, size, weight) > maxWidth) {
            if (line) push();
            let cut = word.length - 1;
            while (cut > 1 && textWidth(word.slice(0, cut), size, weight) > maxWidth) cut--;
            lines.push(word.slice(0, cut));
            word = word.slice(cut);
        }
        const candidate = line ? `${line} ${word}` : word;
        if (textWidth(candidate, size, weight) <= maxWidth) {
            line = candidate;
        } else {
            push();
            line = word;
        }
    }
    push();
    if (lines.length <= maxLines) return lines;
    const kept = lines.slice(0, maxLines);
    let last = kept[maxLines - 1];
    while (last.length > 1 && textWidth(`${last}…`, size, weight) > maxWidth) last = last.slice(0, -1).trimEnd();
    kept[maxLines - 1] = `${last}…`;
    return kept;
}

/** The widest line of `lines`. */
export const linesWidth = (lines: string[], size: number, weight: number): number =>
    lines.reduce((max, line) => Math.max(max, textWidth(line, size, weight)), 0);
