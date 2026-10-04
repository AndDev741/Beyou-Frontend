import dagre from "@dagrejs/dagre";
import type { Board } from "@beyou/types/notebook/notebook";

/** The size a page node is drawn at. Shared by the layout and the node component. */
export const NODE_WIDTH = 176;
export const NODE_HEIGHT = 64;

/**
 * "Tidy up": a left-to-right layout of the board's page nodes that follows its edges.
 *
 * Sections are left where they are, because they are where the person decided to put them. A
 * node with no edges is still placed (dagre gives it a rank of its own), so nothing ends up on
 * top of anything else. Returns only positions; the caller saves and draws them.
 */
export function tidyLayout(board: Board): { nodeId: string; x: number; y: number }[] {
    const pages = board.nodes.filter((n) => n.kind === "PAGE");
    if (pages.length === 0) return [];
    const graph = new dagre.graphlib.Graph();
    graph.setGraph({ rankdir: "LR", nodesep: 40, ranksep: 72, marginx: 40, marginy: 40 });
    graph.setDefaultEdgeLabel(() => ({}));
    for (const node of pages) {
        graph.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
    }
    const ids = new Set(pages.map((n) => n.id));
    for (const edge of board.edges) {
        if (ids.has(edge.source) && ids.has(edge.target)) graph.setEdge(edge.source, edge.target);
    }
    dagre.layout(graph);
    return pages.map((node) => {
        const placed = graph.node(node.id);
        // dagre answers centres; the board stores top-left corners.
        return {
            nodeId: node.id,
            x: Math.round(placed.x - NODE_WIDTH / 2),
            y: Math.round(placed.y - NODE_HEIGHT / 2),
        };
    });
}

/** Where a new node goes: to the right of everything already there, on the first row. */
export function nextNodePosition(board: Board | null | undefined): { x: number; y: number } {
    const pages = (board?.nodes ?? []).filter((n) => n.kind === "PAGE");
    if (pages.length === 0) return { x: 40, y: 80 };
    const right = Math.max(...pages.map((n) => n.x));
    const top = Math.min(...pages.map((n) => n.y));
    return { x: right + NODE_WIDTH + 64, y: top };
}
