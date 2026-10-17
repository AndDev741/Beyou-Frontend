import type { DiagramSpec } from '@beyou/types/notebook/diagram';
import { wrapText } from './measure';
import {
    arrowHead, edgeLabel, frame, LABEL_SIZE, measureNode, nodeTexts, RADIUS, round,
    type DiagramScene, type SceneShape, type SceneText,
} from './scene';

/**
 * A process that comes back to its start: the nodes on a circle from the top, clockwise, joined
 * by arcs that leave and enter each box at its edge. The title sits in the middle when there is
 * room for it. A link between two neighbours lends its label to their arc.
 */

const ARC_MARGIN = 7;

export function layoutCycle(spec: DiagramSpec, maxWidth: number): DiagramScene {
    const n = spec.nodes.length;
    const narrow = maxWidth < 480;
    const measured = spec.nodes.map((node) => measureNode(node, { minW: 84, maxW: narrow ? 124 : 150 }));
    const widest = Math.max(...measured.map((m) => m.w));
    const tallest = Math.max(...measured.map((m) => m.h));
    // Neighbours' centres are one chord apart; the chord has to clear the widest box plus a gap
    // for the arc to show.
    const chordNeed = Math.max(widest, tallest) + 30;
    const r = Math.max(n <= 3 ? 86 : 96, chordNeed / (2 * Math.sin(Math.PI / n)));

    const angle = (i: number) => -Math.PI / 2 + (2 * Math.PI * i) / n;
    const centers = spec.nodes.map((_, i) => [r * Math.cos(angle(i)), r * Math.sin(angle(i))] as [number, number]);
    // How far along the circle a box reaches from its centre, in radians.
    const reach = (i: number, theta: number) => {
        const tx = Math.abs(-Math.sin(theta));
        const ty = Math.abs(Math.cos(theta));
        const half = (tx * measured[i].w) / 2 + (ty * measured[i].h) / 2;
        return (half + ARC_MARGIN) / r;
    };
    const at = (theta: number): [number, number] => [r * Math.cos(theta), r * Math.sin(theta)];

    const index = new Map(spec.nodes.map((node, i) => [node.id, i]));
    const labelOf = (i: number, j: number) => spec.links.find((link) => {
        const a = index.get(link.from);
        const b = index.get(link.to);
        return (a === i && b === j) || (a === j && b === i);
    })?.label ?? null;

    const shapes: SceneShape[] = [];
    const labels: SceneShape[] = [];
    const texts: SceneText[] = [];
    for (let i = 0; i < n; i++) {
        const j = (i + 1) % n;
        const start = angle(i) + reach(i, angle(i));
        let end = angle(j) - reach(j, angle(j));
        if (j === 0) end += 2 * Math.PI;
        if (end <= start + 0.05) continue;
        const stop = end - 6 / r;
        const [sx, sy] = at(start);
        const [ex, ey] = at(stop);
        const large = stop - start > Math.PI ? 1 : 0;
        shapes.push({ type: 'path', d: `M${round(sx)} ${round(sy)} A${round(r)} ${round(r)} 0 ${large} 1 ${round(ex)} ${round(ey)}`, role: 'edge', dashed: false });
        shapes.push(arrowHead(at(end), [-Math.sin(end), Math.cos(end)]));
        const label = labelOf(i, j);
        if (label) {
            const mid = (start + end) / 2;
            const placed = edgeLabel(label, (r + 18) * Math.cos(mid), (r + 18) * Math.sin(mid));
            labels.push(placed.pill);
            texts.push(placed.text);
        }
    }

    spec.nodes.forEach((node, i) => {
        const [cx, cy] = centers[i];
        const rect = { x: round(cx - measured[i].w / 2), y: round(cy - measured[i].h / 2), w: measured[i].w, h: measured[i].h };
        shapes.push({ type: 'rect', ...rect, r: RADIUS, tone: node.tone, role: 'node' });
        texts.push(...nodeTexts(measured[i], rect, node.tone));
    });

    // The title in the hole of the ring, when the hole is wide enough to hold it.
    const hole = 2 * (r - Math.max(widest, tallest) / 2) - 24;
    if (spec.title && hole >= 90) {
        const lines = wrapText(spec.title, LABEL_SIZE, 600, Math.min(hole, 200), 2);
        const h = lines.length * 16;
        lines.forEach((line, k) => texts.push({
            x: 0, y: round(-h / 2 + 12 + k * 16), text: line, size: LABEL_SIZE, weight: 600, anchor: 'middle', role: 'title', tone: null,
        }));
    }

    // Bounds by hand: an arc bulges past the boxes it joins (two nodes, one each side).
    let minX = -r;
    let maxX = r;
    let minY = -r;
    let maxY = r;
    centers.forEach(([cx, cy], i) => {
        minX = Math.min(minX, cx - measured[i].w / 2);
        maxX = Math.max(maxX, cx + measured[i].w / 2);
        minY = Math.min(minY, cy - measured[i].h / 2);
        maxY = Math.max(maxY, cy + measured[i].h / 2);
    });
    for (const shape of labels) {
        if (shape.type !== 'pill') continue;
        minX = Math.min(minX, shape.x);
        maxX = Math.max(maxX, shape.x + shape.w);
        minY = Math.min(minY, shape.y);
        maxY = Math.max(maxY, shape.y + shape.h);
    }
    const all = [...shapes, ...labels];
    return frame(all, texts, { minX, minY, maxX, maxY });
}
