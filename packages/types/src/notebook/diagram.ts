/**
 * A diagram the notebook's AI draws, as data. The model fills this spec, the server cleans it
 * (DiagramSanitizer) and Beyou lays it out and draws it, the same on the web and the phone. No
 * SVG or HTML from a model ever reaches the screen.
 *
 * The shape is the wire format, the LLM's output and the `spec` prop of the editor block, so it
 * must match the backend's `DiagramSpec` record field for field.
 */

/** Must match `MarkdownBlocks.DIAGRAM_BLOCK_TYPE` on the server. */
export const DIAGRAM_BLOCK_TYPE = 'diagram';

export const DIAGRAM_KINDS = ['FLOW', 'MAP', 'CYCLE', 'SEQUENCE', 'LAYERS', 'TIMELINE'] as const;
export type DiagramKind = (typeof DIAGRAM_KINDS)[number];

export const DIAGRAM_TONES = ['NEUTRAL', 'ACCENT', 'SUCCESS', 'WARNING', 'DANGER'] as const;
export type DiagramTone = (typeof DIAGRAM_TONES)[number];

export type DiagramNode = {
    id: string;
    label: string;
    detail: string | null;
    tone: DiagramTone;
};

export type DiagramLink = {
    from: string;
    to: string;
    label: string | null;
    dashed: boolean;
};

export type DiagramSpec = {
    v: 1;
    kind: DiagramKind;
    title: string;
    nodes: DiagramNode[];
    links: DiagramLink[];
};

/** `POST /notebook/ai/pages/{id}/diagram`. `kind: null` lets the AI pick; `base` is an adjustment. */
export type DiagramRequest = {
    prompt: string;
    kind: DiagramKind | null;
    grounded: boolean;
    base: DiagramSpec | null;
};

export type DiagramResult = {
    diagram: DiagramSpec;
    /** Grounded and the page had notes or sources to read. */
    fromNotes: boolean;
};

/** The sanitizer's limits, mirrored from the server. */
export const DIAGRAM_LIMITS = {
    title: 80,
    label: 60,
    detail: 140,
    linkLabel: 40,
    id: 40,
    minNodes: 2,
    maxNodes: 24,
    maxLinks: 40,
    kindNodes: { FLOW: 24, MAP: 24, CYCLE: 10, SEQUENCE: 6, LAYERS: 10, TIMELINE: 12 } as Record<DiagramKind, number>,
} as const;
