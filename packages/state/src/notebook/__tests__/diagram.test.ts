import { describe, expect, it } from 'vitest';
import type { DiagramKind, DiagramSpec } from '@beyou/types/notebook/diagram';
import { defaultDark, defaultLight } from '@beyou/theme';
import {
    diagramColors, diagramText, layoutDiagram, newDiagramBlock, parseDiagramProp, sanitizeDiagram, sceneToSvg,
    type DiagramScene, type SceneRect,
} from '../diagram';
import { translatePath } from '../diagram/scene';
import { textWidth, wrapText } from '../diagram/measure';

const node = (id: string, label: string, detail: string | null = null) => ({ id, label, detail, tone: 'NEUTRAL' as const });
const link = (from: string, to: string, label: string | null = null, dashed = false) => ({ from, to, label, dashed });
const spec = (kind: DiagramKind, nodes = 4, links: DiagramSpec['links'] = []): DiagramSpec => ({
    v: 1, kind, title: 'Teste',
    nodes: Array.from({ length: nodes }, (_, i) => node(`n${i + 1}`, `Etapa ${i + 1}`, i % 2 ? 'um detalhe curto' : null)),
    links,
});
const chain = (n: number) => Array.from({ length: n - 1 }, (_, i) => link(`n${i + 1}`, `n${i + 2}`));

const rects = (scene: DiagramScene) => scene.shapes.filter((s): s is SceneRect => s.type === 'rect');
const overlaps = (a: SceneRect, b: SceneRect) =>
    a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

describe('sanitizeDiagram', () => {
    it('keeps a clean spec as it is', () => {
        const clean = spec('FLOW', 3, chain(3));
        expect(sanitizeDiagram(clean)).toEqual(clean);
    });

    it('clips every text to its limit', () => {
        const out = sanitizeDiagram({
            kind: 'FLOW', title: 't'.repeat(200),
            nodes: [{ id: 'a', label: 'l'.repeat(100), detail: 'd'.repeat(300) }, { id: 'b', label: 'B' }],
            links: [{ from: 'a', to: 'b', label: 'x'.repeat(90) }],
        })!;
        expect(out.title).toHaveLength(80);
        expect(out.nodes[0].label).toHaveLength(60);
        expect(out.nodes[0].detail).toHaveLength(140);
        expect(out.links[0].label).toHaveLength(40);
    });

    it('drops blank labels, then gives missing or repeated ids n<position>, skipping taken ones', () => {
        const out = sanitizeDiagram({
            kind: 'FLOW',
            nodes: [{ label: '  ' }, { label: 'A' }, { id: 'n1', label: 'B' }, { id: 'n1', label: 'C' }, { id: 'x', label: 'D' }],
        })!;
        // After dropping the blank one: A (no id) at 1, B asks n1, C repeats n1 at 3, D keeps x.
        expect(out.nodes.map((n) => n.id)).toEqual(['n2', 'n1', 'n3', 'x']);
    });

    it('drops links to unknown nodes, self links, and exact duplicates', () => {
        const out = sanitizeDiagram({
            kind: 'FLOW',
            nodes: [node('a', 'A'), node('b', 'B')],
            links: [link('a', 'b', 'x'), link('a', 'b', 'x'), link('a', 'b', 'y'), link('a', 'a'), link('a', 'ghost')],
        })!;
        expect(out.links.map((l) => l.label)).toEqual(['x', 'y']);
    });

    it('keeps self links and repeats in a sequence, where they are messages', () => {
        const out = sanitizeDiagram({
            kind: 'SEQUENCE',
            nodes: [node('a', 'A'), node('b', 'B')],
            links: [link('a', 'b', 'ping'), link('a', 'b', 'ping'), link('a', 'a', 'pensa')],
        })!;
        expect(out.links).toHaveLength(3);
    });

    it('caps nodes per kind and refuses fewer than two', () => {
        expect(sanitizeDiagram(spec('CYCLE', 14))!.nodes).toHaveLength(10);
        expect(sanitizeDiagram(spec('SEQUENCE', 9))!.nodes).toHaveLength(6);
        expect(sanitizeDiagram({ kind: 'FLOW', nodes: [node('a', 'A')] })).toBeNull();
        expect(sanitizeDiagram(null)).toBeNull();
        expect(sanitizeDiagram('a string')).toBeNull();
    });

    it('falls back to FLOW and NEUTRAL for values it does not know', () => {
        const out = sanitizeDiagram({ kind: 'PIE', nodes: [{ id: 'a', label: 'A', tone: 'PURPLE' }, node('b', 'B')] })!;
        expect(out.kind).toBe('FLOW');
        expect(out.nodes[0].tone).toBe('NEUTRAL');
    });

    it('reads a block prop back, and nothing that does not parse', () => {
        const clean = spec('MAP', 3, [link('n1', 'n2'), link('n1', 'n3')]);
        expect(parseDiagramProp(newDiagramBlock(clean).props.spec)).toEqual(clean);
        expect(parseDiagramProp('{not json')).toBeNull();
        expect(parseDiagramProp('')).toBeNull();
    });
});

describe('measure', () => {
    it('measures wider text as wider and wraps to the width it is given', () => {
        expect(textWidth('Parcialmente confirmada', 13, 600)).toBeGreaterThan(textWidth('Ativa', 13, 600));
        const lines = wrapText('Abre uma conexão antes de enviar qualquer dado', 13, 500, 120, 2);
        expect(lines).toHaveLength(2);
        lines.forEach((line) => expect(textWidth(line, 13, 500)).toBeLessThanOrEqual(120));
        expect(lines[1].endsWith('…')).toBe(true);
    });
});

describe('layoutDiagram', () => {
    const cases: [DiagramKind, DiagramSpec][] = [
        ['FLOW', spec('FLOW', 6, [...chain(6), link('n2', 'n5', 'atalho'), link('n6', 'n1', 'de novo', true)])],
        ['MAP', spec('MAP', 7, [link('n1', 'n2'), link('n1', 'n3'), link('n2', 'n4'), link('n2', 'n5'), link('n3', 'n6'), link('n3', 'n7')])],
        ['CYCLE', spec('CYCLE', 5)],
        ['SEQUENCE', spec('SEQUENCE', 3, [link('n1', 'n2', 'pede'), link('n2', 'n3', 'repassa'), link('n3', 'n1', 'responde', true), link('n2', 'n2', 'pensa')])],
        ['LAYERS', spec('LAYERS', 5)],
        ['TIMELINE', spec('TIMELINE', 5)],
    ];

    for (const [kind, input] of cases) {
        for (const width of [700, 360]) {
            it(`${kind} at ${width}px: one box per node, none overlapping, all inside the scene`, () => {
                const scene = layoutDiagram(input, { maxWidth: width });
                expect(scene.width).toBeGreaterThan(0);
                expect(scene.height).toBeGreaterThan(0);
                const boxes = rects(scene);
                if (kind !== 'TIMELINE') expect(boxes).toHaveLength(input.nodes.length);
                for (let i = 0; i < boxes.length; i++) {
                    for (let j = i + 1; j < boxes.length; j++) expect(overlaps(boxes[i], boxes[j])).toBe(false);
                    expect(boxes[i].x).toBeGreaterThanOrEqual(0);
                    expect(boxes[i].y).toBeGreaterThanOrEqual(0);
                    expect(boxes[i].x + boxes[i].w).toBeLessThanOrEqual(scene.width);
                    expect(boxes[i].y + boxes[i].h).toBeLessThanOrEqual(scene.height);
                }
                for (const label of input.nodes.map((n) => n.label)) {
                    expect(scene.texts.some((t) => t.text === label)).toBe(true);
                }
                // Deterministic: the phone and the web must agree.
                expect(layoutDiagram(input, { maxWidth: width })).toEqual(scene);
            });
        }
    }

    it('draws a flow across when there is room and down on a phone', () => {
        const flow = spec('FLOW', 4, chain(4));
        const wide = rects(layoutDiagram(flow, { maxWidth: 900 }));
        const narrow = rects(layoutDiagram(flow, { maxWidth: 360 }));
        expect(wide[1].x).toBeGreaterThan(wide[0].x + wide[0].w);
        expect(narrow[1].y).toBeGreaterThan(narrow[0].y + narrow[0].h);
    });

    it('draws a map as an indented outline on a phone', () => {
        const map = cases[1][1];
        const boxes = rects(layoutDiagram(map, { maxWidth: 360 }));
        expect(boxes[0].x).toBeLessThan(boxes[1].x);
        expect(boxes[1].x).toBeLessThan(boxes[2].x);
    });

    it('survives a flow that is nothing but a cycle', () => {
        const loop = spec('FLOW', 3, [...chain(3), link('n3', 'n1')]);
        expect(rects(layoutDiagram(loop))).toHaveLength(3);
    });

    it('puts a label on every labelled link of a flow', () => {
        const scene = layoutDiagram(cases[0][1]);
        expect(scene.texts.filter((t) => t.role === 'edgeLabel').map((t) => t.text).sort()).toEqual(['atalho', 'de novo']);
    });
});

describe('sceneToSvg', () => {
    it('escapes text so a label can never become markup', () => {
        const evil = spec('LAYERS', 2);
        evil.nodes[0].label = '<script>alert(1)</script>';
        const svg = sceneToSvg(layoutDiagram(evil), diagramColors(defaultLight), { title: 'a "quoted" <title>' });
        expect(svg).not.toContain('<script>');
        expect(svg).toContain('&lt;script&gt;');
        expect(svg).toContain('aria-label="a &quot;quoted&quot; &lt;title&gt;"');
    });

    it('paints with concrete colors from either theme', () => {
        const scene = layoutDiagram(spec('FLOW', 3, chain(3)));
        const light = sceneToSvg(scene, diagramColors(defaultLight));
        const dark = sceneToSvg(scene, diagramColors(defaultDark));
        expect(light).not.toContain('var(');
        expect(light).not.toEqual(dark);
    });
});

describe('helpers', () => {
    it('moves a path, arc radii and flags included, without touching them', () => {
        expect(translatePath('M0 0 L10 5 A20 20 0 0 1 30 40 Z', 5, 7)).toBe('M 5 7 L 15 12 A 20 20 0 0 1 35 47 Z');
    });

    it('outlines a diagram in plain text', () => {
        const text = diagramText({ ...spec('FLOW', 2, [link('n1', 'n2', 'erro')]), title: 'Estados' });
        expect(text).toBe('Estados. Etapa 1; Etapa 2 (um detalhe curto). Etapa 1 → Etapa 2: erro.');
    });
});
