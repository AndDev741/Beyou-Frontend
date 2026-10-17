import type { DiagramSpec } from '@beyou/types/notebook/diagram';
import { textWidth, wrapText } from './measure';
import {
    arrowEdge, boundsOf, EDGE_LABEL_SIZE, frame, measureNode, nodeTexts, RADIUS, round,
    type DiagramScene, type SceneShape, type SceneText,
} from './scene';

/**
 * Who talks to whom, in order: participants as boxes across the top with dashed lifelines, each
 * message one row down, its label above its arrow. Replies are dashed. A message to oneself loops
 * out to the right and back. Columns spread apart until every label fits over its arrow; on a
 * narrow screen labels wrap to two lines instead.
 */

const ROW = 40;
const LOOP_W = 30;
const LINE = 15;

export function layoutSequence(spec: DiagramSpec, maxWidth: number): DiagramScene {
    const n = spec.nodes.length;
    const index = new Map(spec.nodes.map((node, i) => [node.id, i]));
    const measured = spec.nodes.map((node) => measureNode(node, { minW: 88, maxW: 150, detailLines: 1 }));
    const messages = spec.links.map((link) => ({ a: index.get(link.from)!, b: index.get(link.to)!, label: link.label ?? '', dashed: link.dashed }));
    const available = Math.max(260, maxWidth - 32);

    // Centre-to-centre distances, widened so labels fit. On a narrow screen a label may wrap to
    // two lines, which halves what it asks for.
    const solve = (labelLines: number) => {
        const dist = Array.from({ length: Math.max(0, n - 1) }, (_, i) => measured[i].w / 2 + measured[i + 1].w / 2 + 36);
        let tail = measured[n - 1].w / 2;
        for (const m of messages) {
            const need = textWidth(m.label, EDGE_LABEL_SIZE, 500) / labelLines + 28;
            if (m.a === m.b) {
                const room = LOOP_W + 10 + need;
                if (m.a === n - 1) tail = Math.max(tail, room);
                else dist[m.a] = Math.max(dist[m.a], room + measured[m.a + 1].w / 2);
                continue;
            }
            const lo = Math.min(m.a, m.b);
            const hi = Math.max(m.a, m.b);
            const span = dist.slice(lo, hi).reduce((sum, d) => sum + d, 0);
            if (span < need) {
                const extra = (need - span) / (hi - lo);
                for (let k = lo; k < hi; k++) dist[k] += extra;
            }
        }
        const width = measured[0].w / 2 + dist.reduce((sum, d) => sum + d, 0) + tail;
        return { dist, width };
    };
    let lines = 1;
    let solved = solve(1);
    if (solved.width > available) {
        lines = 2;
        solved = solve(2);
    }

    const xs: number[] = [measured[0].w / 2];
    solved.dist.forEach((d, i) => xs.push(xs[i] + d));
    const headerH = Math.max(...measured.map((m) => m.h));

    const shapes: SceneShape[] = [];
    const arrows: SceneShape[] = [];
    const labels: SceneShape[] = [];
    const texts: SceneText[] = [];
    let y = headerH + 26;
    for (const m of messages) {
        const x1 = xs[m.a];
        const x2 = xs[m.b];
        const spanW = m.a === m.b ? 200 : Math.abs(x2 - x1) - 20;
        const wrapped = m.label ? wrapText(m.label, EDGE_LABEL_SIZE, 500, Math.max(60, spanW), lines) : [];
        const labelH = wrapped.length * LINE;
        const arrowY = y + labelH + 6;
        if (m.a === m.b) {
            arrows.push(...arrowEdge([[x1, arrowY], [x1 + LOOP_W, arrowY], [x1 + LOOP_W, arrowY + 18], [x1 + 1, arrowY + 18]], m.dashed, 6));
            wrapped.forEach((line, k) => texts.push({
                x: round(x1 + LOOP_W + 8), y: round(arrowY + 4 + k * LINE), text: line, size: EDGE_LABEL_SIZE, weight: 500, anchor: 'start', role: 'edgeLabel', tone: null,
            }));
            y = arrowY + 18 + ROW - 14;
            continue;
        }
        const towards = x2 > x1 ? 1 : -1;
        arrows.push(...arrowEdge([[x1, arrowY], [x2 - towards, arrowY]], m.dashed));
        wrapped.forEach((line, k) => texts.push({
            x: round((x1 + x2) / 2), y: round(y + 11 + k * LINE), text: line, size: EDGE_LABEL_SIZE, weight: 500, anchor: 'middle', role: 'edgeLabel', tone: null,
        }));
        y = arrowY + ROW - 14;
    }
    const bottom = Math.max(y, headerH + 60);

    spec.nodes.forEach((_, i) => {
        shapes.push({ type: 'path', d: `M${round(xs[i])} ${headerH} L${round(xs[i])} ${round(bottom)}`, role: 'guide', dashed: true });
    });
    spec.nodes.forEach((node, i) => {
        const rect = { x: round(xs[i] - measured[i].w / 2), y: 0, w: measured[i].w, h: headerH };
        shapes.push({ type: 'rect', ...rect, r: RADIUS, tone: node.tone, role: 'participant' });
        texts.push(...nodeTexts(measured[i], rect, node.tone));
    });
    const all = [...shapes, ...arrows, ...labels];
    return frame(all, texts, boundsOf(all, texts));
}
