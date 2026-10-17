import type { ThemeBase } from '@beyou/theme';
import type { QuickNoteColor } from '@beyou/types/quickNote/quickNote';

/**
 * What a post-it of each colour is painted with, per theme base.
 *
 * Concrete values on purpose, like `diagramColors`: the phone has no CSS variables, and both apps
 * must draw the same note. Light notes are the paper you know; dark notes are a deep wash of the
 * same hue with light ink, because six bright squares on a dark board glare. Every pair keeps
 * 4.5:1 or better between `ink` and `paper` (locked by the test).
 */
export type NotePaint = {
    paper: string;
    /** The folded strip along the top and the border. */
    edge: string;
    ink: string;
};

const PAINT: Record<ThemeBase, Record<QuickNoteColor, NotePaint>> = {
    light: {
        YELLOW: { paper: '#FFF3A6', edge: '#F2DC5D', ink: '#3D3500' },
        PINK: { paper: '#FFD6E7', edge: '#F5A8C8', ink: '#4A1530' },
        BLUE: { paper: '#CFE6FF', edge: '#9CC8F5', ink: '#0F2C4D' },
        GREEN: { paper: '#D3F5D8', edge: '#9ADBA6', ink: '#12391C' },
        PURPLE: { paper: '#E6DAFF', edge: '#C3ABF5', ink: '#2D1659' },
        ORANGE: { paper: '#FFE0C2', edge: '#F7B57A', ink: '#4A2405' },
    },
    dark: {
        YELLOW: { paper: '#4A4320', edge: '#6B5F22', ink: '#FFF4B8' },
        PINK: { paper: '#4D2236', edge: '#6E3150', ink: '#FFD9E8' },
        BLUE: { paper: '#1E3550', edge: '#2C4B70', ink: '#D6E9FF' },
        GREEN: { paper: '#1F3D28', edge: '#2D5839', ink: '#D5F5DB' },
        PURPLE: { paper: '#33264F', edge: '#48366F', ink: '#E8DDFF' },
        ORANGE: { paper: '#4D3220', edge: '#6E4729', ink: '#FFE2C7' },
    },
};

export function noteColors(base: ThemeBase): Record<QuickNoteColor, NotePaint> {
    return PAINT[base];
}
