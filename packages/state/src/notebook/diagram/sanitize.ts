import {
    DIAGRAM_KINDS, DIAGRAM_LIMITS, DIAGRAM_TONES,
    type DiagramKind, type DiagramLink, type DiagramNode, type DiagramSpec, type DiagramTone,
} from '@beyou/types/notebook/diagram';

/**
 * The client's copy of the server's DiagramSanitizer. The server cleans every diagram it
 * stores or sends, so this exists for what the server never saw: a block whose prop was edited
 * by hand in the editor, a document from an older client, and the edit form's own output.
 * Same rules, same order, so a diagram that passed one passes the other unchanged.
 */

const asText = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');

const clip = (value: string, max: number): string => (value.length > max ? value.slice(0, max).trimEnd() : value);

const kindOf = (value: unknown): DiagramKind =>
    (DIAGRAM_KINDS as readonly string[]).includes(value as string) ? (value as DiagramKind) : 'FLOW';

const toneOf = (value: unknown): DiagramTone =>
    (DIAGRAM_TONES as readonly string[]).includes(value as string) ? (value as DiagramTone) : 'NEUTRAL';

const record = (value: unknown): Record<string, unknown> | null =>
    value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : null;

/** A clean spec, or null when fewer than two nodes survive. */
export function sanitizeDiagram(raw: unknown): DiagramSpec | null {
    const source = record(raw);
    if (!source) return null;
    const kind = kindOf(source.kind);
    const title = clip(asText(source.title), DIAGRAM_LIMITS.title);

    // Nodes: blank labels go, the rest are clipped. Ids are resolved after, so a node that lost
    // its id never takes one a later node asks for by name.
    const rawNodes = Array.isArray(source.nodes) ? source.nodes : [];
    const kept: { askedId: string; node: Omit<DiagramNode, 'id'> }[] = [];
    for (const item of rawNodes) {
        const node = record(item);
        if (!node) continue;
        const label = clip(asText(node.label), DIAGRAM_LIMITS.label);
        if (!label) continue;
        const detail = clip(asText(node.detail), DIAGRAM_LIMITS.detail);
        kept.push({
            askedId: clip(asText(node.id), DIAGRAM_LIMITS.id),
            node: { label, detail: detail || null, tone: toneOf(node.tone) },
        });
    }
    const capped = kept.slice(0, Math.min(DIAGRAM_LIMITS.maxNodes, DIAGRAM_LIMITS.kindNodes[kind]));

    const taken = new Set<string>();
    const ids: (string | null)[] = capped.map(({ askedId }) => {
        if (!askedId || taken.has(askedId)) return null;
        taken.add(askedId);
        return askedId;
    });
    // A missing or repeated id becomes n<position>, counting from 1, moving on while taken.
    const nodes: DiagramNode[] = capped.map(({ node }, index) => {
        let id = ids[index];
        if (id === null) {
            let candidate = index + 1;
            while (taken.has(`n${candidate}`)) candidate++;
            id = `n${candidate}`;
            taken.add(id);
        }
        return { id, ...node };
    });
    if (nodes.length < DIAGRAM_LIMITS.minNodes) return null;

    const known = new Set(nodes.map((node) => node.id));
    const rawLinks = Array.isArray(source.links) ? source.links : [];
    const links: DiagramLink[] = [];
    const seen = new Set<string>();
    for (const item of rawLinks) {
        if (links.length >= DIAGRAM_LIMITS.maxLinks) break;
        const link = record(item);
        if (!link) continue;
        const from = asText(link.from);
        const to = asText(link.to);
        if (!known.has(from) || !known.has(to)) continue;
        if (from === to && kind !== 'SEQUENCE') continue;
        const label = clip(asText(link.label), DIAGRAM_LIMITS.linkLabel);
        const key = `${from}\u0000${to}\u0000${label}`;
        if (kind !== 'SEQUENCE') {
            if (seen.has(key)) continue;
            seen.add(key);
        }
        links.push({ from, to, label: label || null, dashed: link.dashed === true });
    }

    return { v: 1, kind, title, nodes, links };
}

/** The block's `spec` prop, read back. Null for anything that does not draw. */
export function parseDiagramProp(prop: string | null | undefined): DiagramSpec | null {
    if (!prop) return null;
    try {
        return sanitizeDiagram(JSON.parse(prop));
    } catch {
        return null;
    }
}

export const serializeDiagram = (spec: DiagramSpec): string => JSON.stringify(spec);

/** "Ativa → Parcialmente confirmada", a plain outline for screen readers and summaries. */
export function diagramText(spec: DiagramSpec): string {
    const byId = new Map(spec.nodes.map((node) => [node.id, node.label]));
    const nodes = spec.nodes.map((node) => (node.detail ? `${node.label} (${node.detail})` : node.label)).join('; ');
    const links = spec.kind === 'FLOW' || spec.kind === 'MAP' || spec.kind === 'SEQUENCE'
        ? spec.links.map((link) => {
            const arrow = `${byId.get(link.from)} → ${byId.get(link.to)}`;
            return link.label ? `${arrow}: ${link.label}` : arrow;
        }).join('; ')
        : '';
    const head = spec.title ? `${spec.title}. ` : '';
    return links ? `${head}${nodes}. ${links}.` : `${head}${nodes}.`;
}

/** A partial editor block for `editor.insertBlocks`, the same shape the server appends. */
export const newDiagramBlock = (spec: DiagramSpec) => ({
    type: 'diagram' as const,
    props: { spec: serializeDiagram(spec) },
});
