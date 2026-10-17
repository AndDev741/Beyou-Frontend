import type { DiagramSpec } from '@beyou/types/notebook/diagram';
import type { DiagramColors } from './colors';
import { layoutCycle } from './layoutCycle';
import { layoutFlow } from './layoutFlow';
import { layoutLayers, layoutTimeline } from './layoutLinear';
import { layoutMap } from './layoutMap';
import { layoutSequence } from './layoutSequence';
import type { DiagramScene, SceneShape, SceneText } from './scene';

export { diagramColors } from './colors';
export type { DiagramColors, ToneColors } from './colors';
export { diagramText, newDiagramBlock, parseDiagramProp, sanitizeDiagram, serializeDiagram } from './sanitize';
export type {
    DiagramScene, PathRole, RectRole, SceneDot, SceneHead, ScenePath, ScenePill, SceneRect, SceneShape, SceneText, TextRole,
} from './scene';

/** The width a diagram is laid out for when the caller does not know its container yet. */
export const DEFAULT_DIAGRAM_WIDTH = 640;

/**
 * Places a clean spec (see `sanitizeDiagram`) for a container `maxWidth` px wide. Narrow
 * containers switch some kinds to a vertical form; the scene may still come out wider than
 * `maxWidth`, and renderers scale it down to fit.
 */
export function layoutDiagram(spec: DiagramSpec, options: { maxWidth?: number } = {}): DiagramScene {
    const maxWidth = options.maxWidth ?? DEFAULT_DIAGRAM_WIDTH;
    switch (spec.kind) {
        case 'MAP': return layoutMap(spec, maxWidth);
        case 'CYCLE': return layoutCycle(spec, maxWidth);
        case 'SEQUENCE': return layoutSequence(spec, maxWidth);
        case 'LAYERS': return layoutLayers(spec, maxWidth);
        case 'TIMELINE': return layoutTimeline(spec, maxWidth);
        default: return layoutFlow(spec, maxWidth);
    }
}

// ---------------------------------------------------------------- colors per shape

/** Fill and stroke of a shape, so every renderer paints the same thing. */
export function shapePaint(shape: SceneShape, colors: DiagramColors): { fill: string; stroke: string; strokeWidth: number } {
    switch (shape.type) {
        case 'rect': {
            if (shape.role === 'band' && shape.level !== undefined) {
                const band = colors.band(shape.level);
                return { fill: band.fill, stroke: band.stroke, strokeWidth: 1.25 };
            }
            const tone = colors.tones[shape.tone];
            if (shape.role === 'leaf') return { fill: tone.softFill, stroke: tone.softStroke, strokeWidth: 1.25 };
            return { fill: tone.fill, stroke: tone.stroke, strokeWidth: shape.role === 'root' ? 1.5 : 1.25 };
        }
        case 'path':
            if (shape.role === 'tree') return { fill: 'none', stroke: colors.edgeSoft, strokeWidth: 1.5 };
            if (shape.role === 'guide') return { fill: 'none', stroke: colors.guide, strokeWidth: 1.25 };
            if (shape.role === 'rail') return { fill: 'none', stroke: colors.guide, strokeWidth: 2 };
            return { fill: 'none', stroke: colors.edge, strokeWidth: 1.5 };
        case 'head':
            return { fill: colors.edge, stroke: 'none', strokeWidth: 0 };
        case 'pill':
            return { fill: colors.ground, stroke: 'none', strokeWidth: 0 };
        case 'dot': {
            const tone = colors.tones[shape.tone];
            return shape.filled
                ? { fill: tone.dot, stroke: tone.dot, strokeWidth: 2 }
                : { fill: colors.surface, stroke: tone.dot, strokeWidth: 2 };
        }
    }
}

/** A text's color. */
export function textColor(text: SceneText, colors: DiagramColors): string {
    switch (text.role) {
        case 'label': return text.tone ? colors.tones[text.tone].label : colors.text;
        case 'badge': return text.tone ? colors.tones[text.tone].label : colors.muted;
        case 'title': return colors.muted;
        case 'detail':
        case 'edgeLabel':
        default: return colors.muted;
    }
}

const escapeXml = (value: string): string =>
    value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/**
 * The scene as a standalone SVG document with concrete colors: what "Download SVG" saves, what a
 * PNG export rasterizes, and what a renderer without React elements can show. Text is escaped,
 * so a label can never inject markup.
 */
export function sceneToSvg(
    scene: DiagramScene,
    colors: DiagramColors,
    options: { title?: string; label?: string; background?: boolean; fontFamily?: string } = {},
): string {
    const font = options.fontFamily ?? "Geist, 'Geist Fallback', system-ui, -apple-system, 'Segoe UI', sans-serif";
    const parts: string[] = [];
    // What a screen reader says: the outline when the caller has one (diagramText), else the title.
    const label = options.label ?? options.title;
    parts.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${scene.width} ${scene.height}" width="${scene.width}" height="${scene.height}" role="img"${label ? ` aria-label="${escapeXml(label)}"` : ''} font-family="${escapeXml(font)}">`);
    if (options.title) parts.push(`<title>${escapeXml(options.title)}</title>`);
    if (options.background) parts.push(`<rect width="${scene.width}" height="${scene.height}" fill="${colors.ground}"/>`);
    for (const shape of scene.shapes) {
        const paint = shapePaint(shape, colors);
        switch (shape.type) {
            case 'rect':
            case 'pill':
                parts.push(`<rect x="${shape.x}" y="${shape.y}" width="${shape.w}" height="${shape.h}" rx="${shape.type === 'pill' ? 9 : shape.r}" fill="${paint.fill}"${paint.stroke !== 'none' ? ` stroke="${paint.stroke}" stroke-width="${paint.strokeWidth}"` : ''}/>`);
                break;
            case 'dot':
                parts.push(`<circle cx="${shape.cx}" cy="${shape.cy}" r="${shape.r}" fill="${paint.fill}" stroke="${paint.stroke}" stroke-width="${paint.strokeWidth}"/>`);
                break;
            case 'head':
                parts.push(`<path d="${shape.d}" fill="${paint.fill}"/>`);
                break;
            case 'path':
                parts.push(`<path d="${shape.d}" fill="none" stroke="${paint.stroke}" stroke-width="${paint.strokeWidth}" stroke-linecap="round" stroke-linejoin="round"${shape.dashed ? ' stroke-dasharray="5 5"' : ''}/>`);
                break;
        }
    }
    for (const text of scene.texts) {
        const family = text.mono ? ` font-family="'Geist Mono', ui-monospace, monospace"` : '';
        parts.push(`<text x="${text.x}" y="${text.y}" font-size="${text.size}" font-weight="${text.weight}" text-anchor="${text.anchor}" fill="${textColor(text, colors)}"${family}>${escapeXml(text.text)}</text>`);
    }
    parts.push('</svg>');
    return parts.join('');
}
