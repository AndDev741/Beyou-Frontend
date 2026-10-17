import type { DiagramSpec } from '@beyou/types/notebook/diagram';
import { textWidth, wrapText } from './measure';
import {
    boundsOf, DETAIL_SIZE, frame, LABEL_SIZE, PAD, RADIUS, round,
    type DiagramScene, type SceneShape, type SceneText,
} from './scene';

/**
 * The two diagrams that are a list in a fixed order.
 *
 * Layers: full-width bands from top to bottom, numbered from the top down to 1, the name on the
 * left and the detail on the right (under the name when both do not fit on one line). Bands with
 * no tone of their own get an accent wash that fades toward the bottom, the last one plain.
 *
 * Timeline: a rail with a dot per event. Wide and short: across, the date above the rail and the
 * event below. Otherwise: down the left, the date over the event.
 */

const BAND_GAP = 10;
const BAND_PAD = 16;
const BADGE_W = 26;

export function layoutLayers(spec: DiagramSpec, maxWidth: number): DiagramScene {
    const width = Math.max(280, Math.min(680, maxWidth - 2 * PAD));
    const n = spec.nodes.length;
    const plain = spec.nodes.every((node) => node.tone === 'NEUTRAL');
    const shapes: SceneShape[] = [];
    const texts: SceneText[] = [];
    let y = 0;
    spec.nodes.forEach((node, i) => {
        const labelX = BAND_PAD + BADGE_W;
        const labelW = textWidth(node.label, 13.5, 600);
        const detailW = node.detail ? textWidth(node.detail, 12, 400) : 0;
        const oneLine = labelX + labelW + 24 + detailW + BAND_PAD <= width;
        const detailLines = node.detail && !oneLine ? wrapText(node.detail, 12, 400, width - labelX - BAND_PAD, 2) : [];
        const labelLines = oneLine ? [node.label] : wrapText(node.label, 13.5, 600, width - labelX - BAND_PAD, 2);
        const h = oneLine ? 48 : 16 + labelLines.length * 17 + (detailLines.length ? 3 + detailLines.length * 15 : 0) + 12;
        const level = plain ? (i === n - 1 ? -1 : n === 1 ? 1 : 1 - i / Math.max(1, n - 1)) : undefined;
        shapes.push({ type: 'rect', x: 0, y, w: width, h, r: RADIUS, tone: node.tone, role: 'band', level });
        const firstBase = oneLine ? y + h / 2 + 4.5 : y + 16 + 12;
        texts.push({
            x: BAND_PAD + 8, y: round(firstBase), text: String(n - i), size: 12, weight: 600, anchor: 'middle', role: 'badge',
            tone: plain ? (i === n - 1 ? null : 'ACCENT') : node.tone, mono: true,
        });
        labelLines.forEach((line, k) => texts.push({
            x: labelX, y: round(firstBase + k * 17), text: line, size: 13.5, weight: 600, anchor: 'start', role: 'label', tone: null,
        }));
        if (node.detail && oneLine) {
            texts.push({ x: width - BAND_PAD, y: round(firstBase), text: node.detail, size: 12, weight: 400, anchor: 'end', role: 'detail', tone: null });
        }
        detailLines.forEach((line, k) => texts.push({
            x: labelX, y: round(firstBase + labelLines.length * 17 + 3 + k * 15), text: line, size: 12, weight: 400, anchor: 'start', role: 'detail', tone: null,
        }));
        y += h + BAND_GAP;
    });
    return frame(shapes, texts, { minX: 0, minY: 0, maxX: width, maxY: y - BAND_GAP });
}

const SLOT_MIN = 110;

export function layoutTimeline(spec: DiagramSpec, maxWidth: number): DiagramScene {
    const n = spec.nodes.length;
    const across = maxWidth >= 560 && n <= 6;
    return across ? timelineAcross(spec, maxWidth) : timelineDown(spec, maxWidth);
}

function timelineAcross(spec: DiagramSpec, maxWidth: number): DiagramScene {
    const n = spec.nodes.length;
    const width = Math.max(n * SLOT_MIN, Math.min(760, maxWidth - 2 * PAD));
    const slot = width / n;
    const railY = 46;
    const shapes: SceneShape[] = [];
    const texts: SceneText[] = [];
    const first = slot / 2;
    const last = width - slot / 2;
    shapes.push({ type: 'path', d: `M${round(first - 20)} ${railY} L${round(last + 20)} ${railY}`, role: 'rail', dashed: false });
    spec.nodes.forEach((node, i) => {
        const cx = round(slot * i + slot / 2);
        const isLast = i === n - 1;
        shapes.push({ type: 'dot', cx, cy: railY, r: isLast ? 8 : 7, tone: node.tone === 'NEUTRAL' ? 'ACCENT' : node.tone, filled: isLast || node.tone !== 'NEUTRAL' });
        const textW = slot - 14;
        if (node.detail) {
            const lines = wrapText(node.detail, DETAIL_SIZE, 500, textW, 2);
            lines.forEach((line, k) => texts.push({
                x: cx, y: round(railY - 18 - (lines.length - 1 - k) * 14), text: line, size: DETAIL_SIZE, weight: 500, anchor: 'middle', role: 'detail', tone: null,
            }));
        }
        wrapText(node.label, LABEL_SIZE, 600, textW, 3).forEach((line, k) => texts.push({
            x: cx, y: round(railY + 30 + k * 16), text: line, size: LABEL_SIZE, weight: 600, anchor: 'middle', role: 'label', tone: isLast ? 'ACCENT' : node.tone,
        }));
    });
    return frame(shapes, texts, boundsOf(shapes, texts));
}

function timelineDown(spec: DiagramSpec, maxWidth: number): DiagramScene {
    const width = Math.max(240, Math.min(560, maxWidth - 2 * PAD));
    const railX = 8;
    const textX = 30;
    const textW = width - textX;
    const shapes: SceneShape[] = [];
    const texts: SceneText[] = [];
    const dots: SceneShape[] = [];
    let y = 0;
    const centers: number[] = [];
    spec.nodes.forEach((node, i) => {
        const isLast = i === spec.nodes.length - 1;
        const detail = node.detail ? wrapText(node.detail, DETAIL_SIZE, 500, textW, 2) : [];
        const label = wrapText(node.label, LABEL_SIZE, 600, textW, 3);
        detail.forEach((line, k) => texts.push({ x: textX, y: round(y + 11 + k * 14), text: line, size: DETAIL_SIZE, weight: 500, anchor: 'start', role: 'detail', tone: null }));
        const labelTop = y + detail.length * 14 + (detail.length ? 3 : 0);
        label.forEach((line, k) => texts.push({
            x: textX, y: round(labelTop + 12 + k * 16), text: line, size: LABEL_SIZE, weight: 600, anchor: 'start', role: 'label', tone: isLast ? 'ACCENT' : node.tone,
        }));
        const cy = round(labelTop + 8);
        centers.push(cy);
        dots.push({ type: 'dot', cx: railX, cy, r: isLast ? 8 : 7, tone: node.tone === 'NEUTRAL' ? 'ACCENT' : node.tone, filled: isLast || node.tone !== 'NEUTRAL' });
        y = labelTop + label.length * 16 + 18;
    });
    shapes.push({ type: 'path', d: `M${railX} ${round(centers[0] - 14)} L${railX} ${round(centers[centers.length - 1] + 14)}`, role: 'rail', dashed: false });
    const all = [...shapes, ...dots];
    return frame(all, texts, { ...boundsOf(all, texts), maxX: Math.max(width, boundsOf(all, texts).maxX) });
}
