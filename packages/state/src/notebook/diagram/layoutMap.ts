import type { DiagramSpec, DiagramTone } from '@beyou/types/notebook/diagram';
import {
    boundsOf, frame, measureNode, nodeTexts, PAD, RADIUS, roundedPath,
    type DiagramScene, type MeasuredNode, type SceneShape, type SceneText,
} from './scene';

/**
 * A concept broken into parts. Wide: a tree growing to the right, the root on the left, each
 * branch centred on its leaves, curved connectors. Narrow (a phone): an outline, root on top,
 * branches and leaves indented under it with a trunk line, which reads top to bottom with no
 * horizontal scrolling.
 *
 * Branches with no tone of their own take one from a short cycle so the parts tell apart, and
 * leaves take their branch's tone as a light wash.
 */

const BRANCH_TONES: DiagramTone[] = ['ACCENT', 'WARNING', 'SUCCESS'];
const COLUMN_GAP = 52;
const LEAF_GAP = 8;
const GROUP_GAP = 16;

type Tree = { root: number; children: number[][]; depth: number[] };

function buildTree(spec: DiagramSpec): Tree {
    const n = spec.nodes.length;
    const index = new Map(spec.nodes.map((node, i) => [node.id, i]));
    const hasParent = new Array(n).fill(false);
    spec.links.forEach((link) => { hasParent[index.get(link.to)!] = true; });
    const root = Math.max(0, hasParent.findIndex((has) => !has));
    const children: number[][] = Array.from({ length: n }, () => []);
    const depth = new Array(n).fill(-1);
    depth[root] = 0;
    const queue = [root];
    while (queue.length) {
        const v = queue.shift()!;
        for (const link of spec.links) {
            if (index.get(link.from) !== v) continue;
            const t = index.get(link.to)!;
            if (depth[t] !== -1) continue;
            depth[t] = depth[v] + 1;
            children[v].push(t);
            queue.push(t);
        }
    }
    // Whatever the links never reached hangs off the root.
    for (let v = 0; v < n; v++) {
        if (depth[v] === -1) {
            depth[v] = 1;
            children[root].push(v);
        }
    }
    return { root, children, depth };
}

/** Each node's tone: its own, else its branch's (depth 1 cycles through BRANCH_TONES). */
function tonesOf(spec: DiagramSpec, tree: Tree): DiagramTone[] {
    const tones: DiagramTone[] = spec.nodes.map((node) => node.tone);
    tree.children[tree.root].forEach((branch, i) => {
        const branchTone = spec.nodes[branch].tone !== 'NEUTRAL' ? spec.nodes[branch].tone : BRANCH_TONES[i % BRANCH_TONES.length];
        tones[branch] = branchTone;
        const stack = [...tree.children[branch]];
        while (stack.length) {
            const v = stack.pop()!;
            if (spec.nodes[v].tone === 'NEUTRAL') tones[v] = branchTone;
            stack.push(...tree.children[v]);
        }
    });
    return tones;
}

export function layoutMap(spec: DiagramSpec, maxWidth: number): DiagramScene {
    const tree = buildTree(spec);
    return maxWidth >= 520 ? wideMap(spec, tree) : outlineMap(spec, tree, maxWidth);
}

function wideMap(spec: DiagramSpec, tree: Tree): DiagramScene {
    const tones = tonesOf(spec, tree);
    const measured: MeasuredNode[] = spec.nodes.map((node, v) => {
        const depth = tree.depth[v];
        if (depth === 0) return measureNode(node, { minW: 110, maxW: 180 });
        if (depth === 1) return measureNode(node, { minW: 96, maxW: 168 });
        return measureNode(node, { minW: 140, maxW: 280, labelLines: 2, weight: 500 });
    });
    // Leaves of one depth share a width, so the right edge is one clean line.
    const maxDepth = Math.max(...tree.depth);
    const columnW: number[] = [];
    for (let d = 0; d <= maxDepth; d++) {
        const ws = spec.nodes.map((_, v) => (tree.depth[v] === d ? measured[v].w : 0));
        columnW.push(Math.max(...ws));
    }
    spec.nodes.forEach((_, v) => { if (tree.depth[v] >= 2) measured[v] = { ...measured[v], w: columnW[tree.depth[v]] }; });
    const columnX: number[] = [];
    let x = 0;
    for (let d = 0; d <= maxDepth; d++) {
        columnX.push(x);
        x += columnW[d] + COLUMN_GAP;
    }

    // Post-order placement: a leaf takes the next slot down; a parent centres on its children.
    const top = new Array(spec.nodes.length).fill(0);
    let cursor = 0;
    let lastParent = -1;
    // The lowest box placed so far in each column: a parent taller than its children's span must
    // not run into the sibling above it.
    const lowest: number[] = new Array(maxDepth + 1).fill(-Infinity);
    const shift = (v: number, delta: number) => {
        top[v] += delta;
        tree.children[v].forEach((kid) => shift(kid, delta));
    };
    const place = (v: number, parent: number): number => {
        const kids = tree.children[v];
        const depth = tree.depth[v];
        if (!kids.length) {
            if (lastParent !== -1) cursor += lastParent === parent ? LEAF_GAP : GROUP_GAP;
            lastParent = parent;
            top[v] = Math.max(cursor, lowest[depth] + GROUP_GAP);
            cursor = top[v] + measured[v].h;
            lowest[depth] = cursor;
            return top[v] + measured[v].h / 2;
        }
        kids.forEach((kid) => place(kid, v));
        const first = top[kids[0]] + measured[kids[0]].h / 2;
        const last = top[kids[kids.length - 1]] + measured[kids[kids.length - 1]].h / 2;
        top[v] = (first + last) / 2 - measured[v].h / 2;
        const overlap = lowest[depth] + GROUP_GAP - top[v];
        if (overlap > 0) {
            shift(v, overlap);
            cursor += overlap;
            for (let d = depth + 1; d <= maxDepth; d++) if (lowest[d] !== -Infinity) lowest[d] += overlap;
        }
        lowest[depth] = top[v] + measured[v].h;
        return top[v] + measured[v].h / 2;
    };
    place(tree.root, -1);

    const shapes: SceneShape[] = [];
    const texts: SceneText[] = [];
    spec.nodes.forEach((_, v) => {
        for (const kid of tree.children[v]) {
            const x1 = columnX[tree.depth[v]] + columnW[tree.depth[v]] / 2 + measured[v].w / 2;
            const y1 = top[v] + measured[v].h / 2;
            const kidX = tree.depth[kid] >= 2 ? columnX[tree.depth[kid]] : columnX[tree.depth[kid]] + (columnW[tree.depth[kid]] - measured[kid].w) / 2;
            const y2 = top[kid] + measured[kid].h / 2;
            const xm = (x1 + kidX) / 2;
            const d = Math.abs(y1 - y2) < 1
                ? `M${x1} ${y1} L${kidX} ${y2}`
                : `M${x1} ${y1} C${xm} ${y1} ${xm} ${y2} ${kidX} ${y2}`;
            shapes.push({ type: 'path', d, role: 'tree', dashed: false });
        }
    });
    spec.nodes.forEach((_, v) => {
        const depth = tree.depth[v];
        const w = measured[v].w;
        const boxX = depth >= 2 ? columnX[depth] : columnX[depth] + (columnW[depth] - w) / 2;
        const rect = { x: boxX, y: top[v], w, h: measured[v].h };
        const role = depth === 0 ? 'root' : depth === 1 ? 'node' : 'leaf';
        shapes.push({ type: 'rect', ...rect, r: RADIUS, tone: tones[v], role });
        texts.push(...nodeTexts(measured[v], rect, depth >= 2 ? null : tones[v], { weight: depth >= 2 ? 500 : 600 }));
    });
    return frame(shapes, texts, boundsOf(shapes, texts));
}

function outlineMap(spec: DiagramSpec, tree: Tree, maxWidth: number): DiagramScene {
    const tones = tonesOf(spec, tree);
    const width = Math.max(260, maxWidth - 2 * PAD);
    const INDENT = 20;
    const ROW_GAP = 8;
    const shapes: SceneShape[] = [];
    const lines: SceneShape[] = [];
    const texts: SceneText[] = [];
    let y = 0;
    const draw = (v: number, depth: number): { centerY: number; bottom: number } => {
        const x = depth * INDENT;
        const measured = measureNode(spec.nodes[v], {
            minW: width - x, maxW: width - x, labelLines: 2, weight: depth >= 2 ? 500 : 600,
        });
        const rect = { x, y, w: width - x, h: measured.h };
        const role = depth === 0 ? 'root' : depth === 1 ? 'node' : 'leaf';
        shapes.push({ type: 'rect', ...rect, r: RADIUS, tone: tones[v], role });
        texts.push(...nodeTexts(measured, rect, depth >= 2 ? null : tones[v], { align: 'start', weight: depth >= 2 ? 500 : 600 }));
        const own = { centerY: y + measured.h / 2, bottom: y + measured.h };
        y += measured.h + ROW_GAP;
        const kids = tree.children[v];
        if (kids.length) {
            const trunkX = x + INDENT / 2;
            const centers = kids.map((kid) => draw(kid, depth + 1).centerY);
            // The trunk runs down the indent and turns into each child.
            lines.push({ type: 'path', d: roundedPath([[trunkX, own.bottom], [trunkX, centers[centers.length - 1]], [x + INDENT, centers[centers.length - 1]]], 6), role: 'tree', dashed: false });
            centers.slice(0, -1).forEach((cy) => lines.push({ type: 'path', d: `M${trunkX} ${cy} L${x + INDENT} ${cy}`, role: 'tree', dashed: false }));
        }
        return own;
    };
    draw(tree.root, 0);
    const all = [...lines, ...shapes];
    return frame(all, texts, boundsOf(all, texts));
}
