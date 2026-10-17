import type { DiagramNode, DiagramTone } from '@beyou/types/notebook/diagram';
import { linesWidth, textWidth, wrapText } from './measure';

/**
 * What a layout produces and a renderer draws. Everything is placed already, in px, so the web
 * renderer (SVG) and the phone renderer (react-native-svg) only map shapes to elements and roles
 * to colors (see `diagramColors`). No layout decision lives in either app.
 */

export type RectRole = 'node' | 'root' | 'leaf' | 'band' | 'participant';
export type PathRole = 'edge' | 'tree' | 'guide' | 'rail';

export type SceneRect = {
    type: 'rect';
    x: number; y: number; w: number; h: number; r: number;
    tone: DiagramTone;
    role: RectRole;
    /** Bands only: 0..1 how strong the accent wash is; -1 for a plain band. */
    level?: number;
};
export type ScenePath = { type: 'path'; d: string; role: PathRole; dashed: boolean; tone?: DiagramTone };
/** A filled arrowhead. */
export type SceneHead = { type: 'head'; d: string };
/** The ground-colored pill under an edge label, so the label sits cleanly on its line. */
export type ScenePill = { type: 'pill'; x: number; y: number; w: number; h: number };
export type SceneDot = { type: 'dot'; cx: number; cy: number; r: number; tone: DiagramTone; filled: boolean };
export type SceneShape = SceneRect | ScenePath | SceneHead | ScenePill | SceneDot;

export type TextRole = 'label' | 'detail' | 'edgeLabel' | 'badge' | 'title';
export type SceneText = {
    x: number; y: number;
    text: string;
    size: number;
    weight: 400 | 500 | 600;
    anchor: 'start' | 'middle' | 'end';
    role: TextRole;
    /** The tone whose label color a `label` takes; null for the plain text color. */
    tone: DiagramTone | null;
    mono?: boolean;
};

export type DiagramScene = { width: number; height: number; shapes: SceneShape[]; texts: SceneText[] };

// ---------------------------------------------------------------- shared metrics

export const PAD = 16;
export const LABEL_SIZE = 13;
export const DETAIL_SIZE = 11.5;
export const EDGE_LABEL_SIZE = 12;
const LABEL_LINE = 16;
const DETAIL_LINE = 15;
const PAD_X = 14;
const PAD_Y = 11;
const LABEL_DETAIL_GAP = 2;
export const RADIUS = 10;

export type MeasuredNode = { label: string[]; detail: string[]; w: number; h: number };

const even = (value: number): number => Math.ceil(value / 2) * 2;

/** A node's wrapped text and outer box size, between `minW` and `maxW`. */
export function measureNode(
    node: Pick<DiagramNode, 'label' | 'detail'>,
    options: { minW: number; maxW: number; labelLines?: number; detailLines?: number; weight?: 400 | 500 | 600 },
): MeasuredNode {
    const weight = options.weight ?? 600;
    const inner = options.maxW - 2 * PAD_X;
    const label = wrapText(node.label, LABEL_SIZE, weight, inner, options.labelLines ?? 2);
    const detail = node.detail ? wrapText(node.detail, DETAIL_SIZE, 400, inner, options.detailLines ?? 2) : [];
    const textW = Math.max(linesWidth(label, LABEL_SIZE, weight), linesWidth(detail, DETAIL_SIZE, 400));
    const w = even(Math.min(options.maxW, Math.max(options.minW, textW + 2 * PAD_X)));
    return { label, detail, w, h: even(contentHeight(label.length, detail.length) + 2 * PAD_Y) };
}

const contentHeight = (labelLines: number, detailLines: number): number =>
    labelLines * LABEL_LINE + (detailLines ? LABEL_DETAIL_GAP + detailLines * DETAIL_LINE : 0);

/**
 * The texts of a node drawn in the box (x, y, w, h), vertically centered, either centered
 * horizontally or left-aligned at the box's padding.
 */
export function nodeTexts(
    measured: Pick<MeasuredNode, 'label' | 'detail'>,
    box: { x: number; y: number; w: number; h: number },
    tone: DiagramTone | null,
    options: { align?: 'middle' | 'start'; weight?: 400 | 500 | 600 } = {},
): SceneText[] {
    const align = options.align ?? 'middle';
    const weight = options.weight ?? 600;
    const x = align === 'middle' ? box.x + box.w / 2 : box.x + PAD_X;
    const top = box.y + (box.h - contentHeight(measured.label.length, measured.detail.length)) / 2;
    const texts: SceneText[] = measured.label.map((text, i) => ({
        x, y: round(top + 12 + i * LABEL_LINE), text, size: LABEL_SIZE, weight, anchor: align, role: 'label', tone,
    }));
    const detailTop = top + measured.label.length * LABEL_LINE + LABEL_DETAIL_GAP;
    measured.detail.forEach((text, i) => texts.push({
        x, y: round(detailTop + 11 + i * DETAIL_LINE), text, size: DETAIL_SIZE, weight: 400, anchor: align, role: 'detail', tone: null,
    }));
    return texts;
}

export const round = (value: number): number => Math.round(value * 10) / 10;

// ---------------------------------------------------------------- paths

type Point = [number, number];

/** A polyline with its bends rounded off, as an SVG path. */
export function roundedPath(points: Point[], radius = 8): string {
    const clean = points.filter((p, i) => i === 0 || p[0] !== points[i - 1][0] || p[1] !== points[i - 1][1]);
    if (clean.length === 0) return '';
    let d = `M${round(clean[0][0])} ${round(clean[0][1])}`;
    for (let i = 1; i < clean.length - 1; i++) {
        const [px, py] = clean[i - 1];
        const [cx, cy] = clean[i];
        const [nx, ny] = clean[i + 1];
        const inLen = Math.hypot(cx - px, cy - py);
        const outLen = Math.hypot(nx - cx, ny - cy);
        const r = Math.min(radius, inLen / 2, outLen / 2);
        const ax = cx - ((cx - px) / inLen) * r;
        const ay = cy - ((cy - py) / inLen) * r;
        const bx = cx + ((nx - cx) / outLen) * r;
        const by = cy + ((ny - cy) / outLen) * r;
        d += ` L${round(ax)} ${round(ay)} Q${round(cx)} ${round(cy)} ${round(bx)} ${round(by)}`;
    }
    const last = clean[clean.length - 1];
    if (clean.length > 1) d += ` L${round(last[0])} ${round(last[1])}`;
    return d;
}

const HEAD_LENGTH = 8;
const HEAD_HALF = 4;

/** A filled arrowhead with its tip at `tip`, pointing along (dx, dy). */
export function arrowHead(tip: Point, direction: Point): SceneHead {
    const length = Math.hypot(direction[0], direction[1]) || 1;
    const ux = direction[0] / length;
    const uy = direction[1] / length;
    const bx = tip[0] - ux * HEAD_LENGTH;
    const by = tip[1] - uy * HEAD_LENGTH;
    const d = `M${round(tip[0])} ${round(tip[1])} L${round(bx - uy * HEAD_HALF)} ${round(by + ux * HEAD_HALF)} `
        + `L${round(bx + uy * HEAD_HALF)} ${round(by - ux * HEAD_HALF)} Z`;
    return { type: 'head', d };
}

/**
 * An edge drawn along `points` ending in an arrowhead at the last point: the line stops under the
 * head so its round cap never pokes through the tip.
 */
export function arrowEdge(points: Point[], dashed: boolean, radius = 8): SceneShape[] {
    const end = points[points.length - 1];
    const before = points[points.length - 2];
    const dx = end[0] - before[0];
    const dy = end[1] - before[1];
    const length = Math.hypot(dx, dy) || 1;
    const stop = Math.min(HEAD_LENGTH - 1, length);
    const shortened: Point[] = [...points.slice(0, -1), [end[0] - (dx / length) * stop, end[1] - (dy / length) * stop]];
    return [{ type: 'path', d: roundedPath(shortened, radius), role: 'edge', dashed }, arrowHead(end, [dx, dy])];
}

/** An edge label centered on (cx, cy): its ground pill and its text. */
export function edgeLabel(text: string, cx: number, cy: number): { pill: ScenePill; text: SceneText; w: number } {
    const w = even(textWidth(text, EDGE_LABEL_SIZE, 500) + 12);
    return {
        w,
        pill: { type: 'pill', x: round(cx - w / 2), y: round(cy - 9), w, h: 18 },
        text: { x: round(cx), y: round(cy + 4), text, size: EDGE_LABEL_SIZE, weight: 500, anchor: 'middle', role: 'edgeLabel', tone: null },
    };
}

export const labelWidth = (text: string | null): number => (text ? even(textWidth(text, EDGE_LABEL_SIZE, 500) + 12) : 0);

/** Shift every shape and text so the content's top-left sits at (PAD, PAD), and size the scene. */
export function frame(shapes: SceneShape[], texts: SceneText[], bounds: { minX: number; minY: number; maxX: number; maxY: number }): DiagramScene {
    const dx = PAD - bounds.minX;
    const dy = PAD - bounds.minY;
    const moved = shapes.map((shape) => moveShape(shape, dx, dy));
    const movedTexts = texts.map((text) => ({ ...text, x: round(text.x + dx), y: round(text.y + dy) }));
    return {
        width: Math.ceil(bounds.maxX - bounds.minX + 2 * PAD),
        height: Math.ceil(bounds.maxY - bounds.minY + 2 * PAD),
        shapes: moved,
        texts: movedTexts,
    };
}

function moveShape(shape: SceneShape, dx: number, dy: number): SceneShape {
    switch (shape.type) {
        case 'rect':
        case 'pill':
            return { ...shape, x: round(shape.x + dx), y: round(shape.y + dy) };
        case 'dot':
            return { ...shape, cx: round(shape.cx + dx), cy: round(shape.cy + dy) };
        case 'path':
        case 'head':
            return { ...shape, d: translatePath(shape.d, dx, dy) };
    }
}

/**
 * Moves an absolute path made of M, L, Q, C, A and Z commands (the only ones the layouts write;
 * no H or V, whose single argument would pair up wrongly here). Arc commands carry radii and
 * flags that must not move, so each command's own argument layout decides which numbers shift.
 */
export function translatePath(d: string, dx: number, dy: number): string {
    const tokens = d.match(/[MLQCAZ]|-?\d*\.?\d+(?:e-?\d+)?/gi) ?? [];
    const out: string[] = [];
    let command = '';
    let index = 0;
    for (const token of tokens) {
        if (/^[MLQCAZ]$/i.test(token)) {
            command = token.toUpperCase();
            index = 0;
            out.push(token);
            continue;
        }
        const value = Number(token);
        let moved = value;
        if (command === 'A') {
            const slot = index % 7;
            if (slot === 5) moved = value + dx;
            else if (slot === 6) moved = value + dy;
        } else {
            moved = index % 2 === 0 ? value + dx : value + dy;
        }
        index++;
        out.push(String(round(moved)));
    }
    return out.join(' ').replace(/ ([MLQCAZ])/gi, ' $1');
}

/** Bounds of everything placed, texts included (estimated from their width). */
export function boundsOf(shapes: SceneShape[], texts: SceneText[]): { minX: number; minY: number; maxX: number; maxY: number } {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    const add = (x: number, y: number) => {
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
    };
    for (const shape of shapes) {
        if (shape.type === 'rect' || shape.type === 'pill') {
            add(shape.x, shape.y);
            add(shape.x + shape.w, shape.y + shape.h);
        } else if (shape.type === 'dot') {
            add(shape.cx - shape.r, shape.cy - shape.r);
            add(shape.cx + shape.r, shape.cy + shape.r);
        } else {
            const numbers = pathPoints(shape.d);
            numbers.forEach(([x, y]) => add(x, y));
        }
    }
    for (const text of texts) {
        const w = textWidth(text.text, text.size, text.weight);
        const left = text.anchor === 'start' ? text.x : text.anchor === 'middle' ? text.x - w / 2 : text.x - w;
        add(left, text.y - text.size);
        add(left + w, text.y + text.size * 0.3);
    }
    if (minX === Infinity) return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
    return { minX, minY, maxX, maxY };
}

/** The end points (and arc end points) of a path, enough to bound the lines this module draws. */
function pathPoints(d: string): Point[] {
    const tokens = d.match(/[MLQCAZ]|-?\d*\.?\d+(?:e-?\d+)?/gi) ?? [];
    const points: Point[] = [];
    let command = '';
    let args: number[] = [];
    const flush = () => {
        if (command === 'A') {
            for (let i = 0; i + 6 < args.length + 1; i += 7) if (args[i + 6] !== undefined) points.push([args[i + 5], args[i + 6]]);
        } else {
            for (let i = 0; i + 1 < args.length; i += 2) points.push([args[i], args[i + 1]]);
        }
        args = [];
    };
    for (const token of tokens) {
        if (/^[MLQCAZ]$/i.test(token)) {
            flush();
            command = token.toUpperCase();
        } else {
            args.push(Number(token));
        }
    }
    flush();
    return points;
}
