import type { DiagramSpec } from '@beyou/types/notebook/diagram';
import {
    arrowEdge, boundsOf, edgeLabel, frame, labelWidth, measureNode, nodeTexts, RADIUS,
    type DiagramScene, type MeasuredNode, type SceneShape, type SceneText,
} from './scene';

/**
 * A directed graph, drawn in layers: left to right when there is room, top to bottom when there
 * is not (a phone). The steps are the classic ones, kept small:
 *
 * 1. break cycles (a back edge is drawn backwards, under the layers, never as a layer loop);
 * 2. layer by longest path, so a chain reads as a straight line;
 * 3. order each layer by the barycenter of its neighbours, a few sweeps each way;
 * 4. pull each node toward its neighbours across the layers, then resolve overlaps;
 * 5. route edges as elbows through the gap after the source layer, with their ports spread along
 *    the node's side and their middle segments spread inside the gap, so lines never stack.
 *
 * Everything is computed along a "main" axis (the direction of flow) and a "cross" axis and only
 * mapped to x and y at the end, so both directions share one code path.
 */

type Dir = 'RIGHT' | 'DOWN';
type Edge = { s: number; t: number; label: string | null; dashed: boolean; back: boolean };

const MIN_W = 96;
const CROSS_GAP = { RIGHT: 40, DOWN: 26 };
const MAIN_GAP = { RIGHT: 60, DOWN: 56 };
const LANE_GAP = 22;
const LANE_STEP = 12;
const SLOT_STEP = 10;

export function layoutFlow(spec: DiagramSpec, maxWidth: number): DiagramScene {
    const right = layoutIn(spec, 'RIGHT', maxWidth);
    // Across reads best; a little scaling down to fit is a fair price for it.
    if (maxWidth >= 560 && right.width <= maxWidth * 1.15) return right;
    const down = layoutIn(spec, 'DOWN', maxWidth);
    // Keep the wide one when going down would only make it narrower by a little.
    return down.width < right.width * 0.85 ? down : right;
}

function layoutIn(spec: DiagramSpec, dir: Dir, maxWidth: number): DiagramScene {
    const n = spec.nodes.length;
    const index = new Map(spec.nodes.map((node, i) => [node.id, i]));
    const edges: Edge[] = spec.links
        .filter((link) => link.from !== link.to)
        .map((link) => ({ s: index.get(link.from)!, t: index.get(link.to)!, label: link.label, dashed: link.dashed, back: false }));

    // 1. cycles: a DFS from the sources in node order; an edge into the current path is a back edge.
    const out: number[][] = Array.from({ length: n }, () => []);
    edges.forEach((edge, i) => out[edge.s].push(i));
    const indegree = new Array(n).fill(0);
    edges.forEach((edge) => indegree[edge.t]++);
    const state = new Array(n).fill(0);
    const visit = (v: number) => {
        state[v] = 1;
        for (const e of out[v]) {
            const t = edges[e].t;
            if (state[t] === 1) edges[e].back = true;
            else if (state[t] === 0) visit(t);
        }
        state[v] = 2;
    };
    for (let v = 0; v < n; v++) if (indegree[v] === 0 && state[v] === 0) visit(v);
    for (let v = 0; v < n; v++) if (state[v] === 0) visit(v);
    const forward = edges.filter((edge) => !edge.back);

    // 2. layers by longest path over the forward edges.
    const layer = new Array(n).fill(0);
    const succ: number[][] = Array.from({ length: n }, () => []);
    const pred: number[][] = Array.from({ length: n }, () => []);
    forward.forEach((edge) => {
        succ[edge.s].push(edge.t);
        pred[edge.t].push(edge.s);
    });
    const remaining = pred.map((list) => list.length);
    const queue: number[] = [];
    for (let v = 0; v < n; v++) if (remaining[v] === 0) queue.push(v);
    while (queue.length) {
        const v = queue.shift()!;
        for (const t of succ[v]) {
            layer[t] = Math.max(layer[t], layer[v] + 1);
            if (--remaining[t] === 0) queue.push(t);
        }
    }
    const layerCount = Math.max(...layer) + 1;
    const layers: number[][] = Array.from({ length: layerCount }, () => []);
    for (let v = 0; v < n; v++) layers[layer[v]].push(v);

    // 3. order: barycenter sweeps, stable, starting from the spec's own order.
    const position = new Array(n).fill(0);
    const renumber = () => layers.forEach((list) => list.forEach((v, i) => { position[v] = i / Math.max(1, list.length - 1 || 1); }));
    renumber();
    for (let sweep = 0; sweep < 4; sweep++) {
        for (let l = 1; l < layerCount; l++) reorder(layers[l], pred, position);
        renumber();
        for (let l = layerCount - 2; l >= 0; l--) reorder(layers[l], succ, position);
        renumber();
    }

    // Node sizes. Going down on a phone, a node may take the whole width.
    const maxNodeW = dir === 'RIGHT' ? 184 : Math.max(140, Math.min(220, maxWidth - 32));
    const measured: MeasuredNode[] = spec.nodes.map((node) => measureNode(node, { minW: MIN_W, maxW: maxNodeW }));
    const mainSize = (v: number) => (dir === 'RIGHT' ? measured[v].w : measured[v].h);
    const crossSize = (v: number) => (dir === 'RIGHT' ? measured[v].h : measured[v].w);

    // Main-axis columns. A gap widens for the labels that sit in it (on the elbow's middle
    // segment, which runs across the gap after the source's layer).
    const columnSize = layers.map((list) => Math.max(...list.map(mainSize)));
    const gap = new Array(layerCount).fill(MAIN_GAP[dir]);
    for (const edge of forward) {
        if (!edge.label) continue;
        const need = dir === 'RIGHT' ? labelWidth(edge.label) + 28 : 18 + 30;
        gap[layer[edge.s]] = Math.max(gap[layer[edge.s]], need);
    }
    const columnStart: number[] = [];
    let cursor = 0;
    for (let l = 0; l < layerCount; l++) {
        columnStart.push(cursor);
        cursor += columnSize[l] + gap[l];
    }
    const mainOf = (v: number) => columnStart[layer[v]] + (columnSize[layer[v]] - mainSize(v)) / 2;

    // 4. cross positions: stack, then pull toward neighbours (forward, back, forward again).
    const cross = new Array(n).fill(0);
    const crossGap = CROSS_GAP[dir];
    const tallest = Math.max(...layers.map((list) => list.reduce((sum, v) => sum + crossSize(v), 0) + crossGap * (list.length - 1)));
    for (const list of layers) {
        let at = (tallest - (list.reduce((sum, v) => sum + crossSize(v), 0) + crossGap * (list.length - 1))) / 2;
        for (const v of list) {
            cross[v] = at;
            at += crossSize(v) + crossGap;
        }
    }
    const center = (v: number) => cross[v] + crossSize(v) / 2;
    const align = (list: number[], neighbours: number[][]) => {
        const want = list.map((v) => {
            const others = neighbours[v];
            if (!others.length) return center(v);
            return others.reduce((sum, o) => sum + center(o), 0) / others.length;
        });
        // Place at the wanted centers in order, pushing down to keep the gap, then shift the
        // whole layer back by the average push so it stays centred on what it wanted.
        const placed: number[] = [];
        let bottom = -Infinity;
        list.forEach((v, i) => {
            const top = Math.max(want[i] - crossSize(v) / 2, bottom + crossGap);
            placed.push(top);
            bottom = top + crossSize(v);
        });
        const drift = list.reduce((sum, v, i) => sum + (placed[i] + crossSize(v) / 2 - want[i]), 0) / list.length;
        list.forEach((v, i) => { cross[v] = placed[i] - drift; });
    };
    for (let pass = 0; pass < 3; pass++) {
        for (let l = 1; l < layerCount; l++) align(layers[l], pred);
        for (let l = layerCount - 2; l >= 0; l--) align(layers[l], succ);
    }
    for (let l = 1; l < layerCount; l++) align(layers[l], pred);

    // Boxes, in main/cross terms.
    const box = (v: number) => ({ main: mainOf(v), cross: cross[v], mainSize: mainSize(v), crossSize: crossSize(v) });
    const crossMax = Math.max(...spec.nodes.map((_, v) => cross[v] + crossSize(v)));

    // 5. edges. Ports: each node's outgoing edges spread along its far side in the order of their
    // targets, incoming ones along its near side in the order of their sources.
    const outPort = new Map<Edge, number>();
    const inPort = new Map<Edge, number>();
    for (let v = 0; v < n; v++) {
        spread(forward.filter((e) => e.s === v), (e) => center(e.t), crossSize(v), center(v), outPort);
        spread(forward.filter((e) => e.t === v), (e) => center(e.s), crossSize(v), center(v), inPort);
    }

    // Middle segments sharing a gap get their own slot, ordered by where they start.
    type Route = { edge: Edge; from: number; to: number; startMain: number; endMain: number; mid: number; slotGap: number };
    const routes: Route[] = forward.map((edge) => {
        const s = box(edge.s);
        const t = box(edge.t);
        return {
            edge,
            from: outPort.get(edge)!,
            to: inPort.get(edge)!,
            startMain: s.main + s.mainSize,
            endMain: t.main - 1,
            mid: columnStart[layer[edge.s]] + columnSize[layer[edge.s]] + gap[layer[edge.s]] / 2,
            slotGap: layer[edge.s],
        };
    });
    const byGap = new Map<number, Route[]>();
    routes.filter((r) => Math.abs(r.from - r.to) >= 2).forEach((r) => byGap.set(r.slotGap, [...(byGap.get(r.slotGap) ?? []), r]));
    byGap.forEach((list, g) => {
        list.sort((a, b) => a.from - b.from || a.to - b.to);
        const room = Math.max(0, gap[g] / 2 - 14);
        list.forEach((r, i) => {
            const offset = (i - (list.length - 1) / 2) * SLOT_STEP;
            r.mid += Math.max(-room, Math.min(room, offset));
        });
    });

    const shapes: SceneShape[] = [];
    const labels: SceneShape[] = [];
    const texts: SceneText[] = [];
    const toXY = (main: number, c: number): [number, number] => (dir === 'RIGHT' ? [main, c] : [c, main]);
    const blocked = (fromMain: number, toMain: number, at: number, skip: number[]) => spec.nodes.some((_, v) => {
        if (skip.includes(v)) return false;
        const b = box(v);
        return b.main < toMain && b.main + b.mainSize > fromMain && at > b.cross - 6 && at < b.cross + b.crossSize + 6;
    });

    let laneLow = 0;
    for (const r of routes) {
        const { edge } = r;
        let points: [number, number][];
        let labelAt: [number, number] | null = null;
        if (Math.abs(r.from - r.to) < 2) {
            const c = (r.from + r.to) / 2;
            points = [toXY(r.startMain, c), toXY(r.endMain, c)];
            labelAt = toXY((r.startMain + r.endMain) / 2, c);
        } else {
            let mid = r.mid;
            // A long edge must not cross the layers it skips. In order: the elbow near the source,
            // the elbow near the target, a dodge past the side of the nodes in between, and only
            // then a lane round the outside.
            const skip = [edge.s, edge.t];
            if (layer[edge.t] - layer[edge.s] > 1) {
                const nearTarget = columnStart[layer[edge.t]] - gap[layer[edge.t] - 1] / 2;
                if (!blocked(mid, r.endMain, r.to, skip)) {
                    // the elbow near the source works
                } else if (!blocked(r.startMain, nearTarget, r.from, skip)) {
                    mid = nearTarget;
                } else {
                    const between = spec.nodes.map((_, v) => v)
                        .filter((v) => layer[v] > layer[edge.s] && layer[v] < layer[edge.t]);
                    const low = Math.min(...between.map((v) => cross[v]));
                    const high = Math.max(...between.map((v) => cross[v] + crossSize(v)));
                    const side = r.to >= (low + high) / 2 ? high + 16 : low - 16;
                    const lane = blocked(r.mid, nearTarget, side, skip) ? crossMax + LANE_GAP + laneLow++ * LANE_STEP : side;
                    points = [toXY(r.startMain, r.from), toXY(r.mid, r.from), toXY(r.mid, lane), toXY(nearTarget, lane), toXY(nearTarget, r.to), toXY(r.endMain, r.to)];
                    shapes.push(...arrowEdge(points, edge.dashed));
                    if (edge.label) placeLabel(edge.label, toXY((r.mid + nearTarget) / 2, lane), labels, texts);
                    continue;
                }
            }
            points = [toXY(r.startMain, r.from), toXY(mid, r.from), toXY(mid, r.to), toXY(r.endMain, r.to)];
            const middleLength = Math.abs(r.to - r.from);
            if (dir === 'RIGHT' ? middleLength >= 30 : middleLength >= labelWidth(edge.label) + 16) {
                labelAt = toXY(mid, (r.from + r.to) / 2);
            } else {
                labelAt = toXY((mid + r.endMain) / 2, r.to);
            }
        }
        shapes.push(...arrowEdge(points, edge.dashed));
        if (edge.label && labelAt) placeLabel(edge.label, labelAt, labels, texts);
    }

    // Back edges: out of the source's outer side, along a lane past every node, into the
    // target's outer side.
    const backEdges = edges.filter((edge) => edge.back);
    backEdges.forEach((edge) => {
        const s = box(edge.s);
        const t = box(edge.t);
        const lane = crossMax + LANE_GAP + laneLow++ * LANE_STEP;
        const sMain = s.main + s.mainSize / 2;
        const tMain = t.main + t.mainSize / 2;
        const points: [number, number][] = [
            toXY(sMain, s.cross + s.crossSize), toXY(sMain, lane), toXY(tMain, lane), toXY(tMain, t.cross + t.crossSize + 1),
        ];
        shapes.push(...arrowEdge(points, edge.dashed));
        if (edge.label) placeLabel(edge.label, toXY((sMain + tMain) / 2, lane), labels, texts);
    });

    // Nodes last, over the lines, then the label pills over everything.
    const nodeShapes: SceneShape[] = [];
    spec.nodes.forEach((node, v) => {
        const b = box(v);
        const [x, y] = toXY(b.main, b.cross);
        const rect = { x, y, w: measured[v].w, h: measured[v].h };
        nodeShapes.push({ type: 'rect', ...rect, r: RADIUS, tone: node.tone, role: 'node' });
        texts.push(...nodeTexts(measured[v], rect, node.tone));
    });
    const all = [...shapes, ...nodeShapes, ...labels];
    return frame(all, texts, boundsOf(all, texts));
}

/** Reorders a layer by the mean position of each node's neighbours (unchanged when it has none). */
function reorder(list: number[], neighbours: number[][], position: number[]) {
    const keyed = list.map((v, i) => {
        const others = neighbours[v];
        const bary = others.length ? others.reduce((sum, o) => sum + position[o], 0) / others.length : position[v];
        return { v, bary, i };
    });
    keyed.sort((a, b) => a.bary - b.bary || a.i - b.i);
    keyed.forEach((k, i) => { list[i] = k.v; });
}

/** Spreads `edges` along a side of length `size` centred on `middle`, ordered by `key`. */
function spread<T>(edges: T[], key: (edge: T) => number, size: number, middle: number, into: Map<T, number>) {
    const sorted = [...edges].sort((a, b) => key(a) - key(b));
    const count = sorted.length;
    if (!count) return;
    const step = count > 1 ? Math.min(16, (size * 0.6) / (count - 1)) : 0;
    sorted.forEach((edge, i) => into.set(edge, middle + (i - (count - 1) / 2) * step));
}

function placeLabel(text: string, at: [number, number], shapes: SceneShape[], texts: SceneText[]) {
    const label = edgeLabel(text, at[0], at[1]);
    shapes.push(label.pill);
    texts.push(label.text);
}
