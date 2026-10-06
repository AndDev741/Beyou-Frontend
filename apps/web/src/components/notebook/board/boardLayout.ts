import type { Board, BoardNode } from "@beyou/types/notebook/notebook";

/** The size a page node is drawn at. Shared by the layout and the node component. */
export const NODE_WIDTH = 176;
export const NODE_HEIGHT = 64;

/**
 * The board grid: three nodes to a row, read left to right and top to bottom, each row going on
 * where the last one ended. The server lays a drafted roadmap out on the same grid
 * (NotebookBoardService: NODES_PER_ROW, COLUMN_STEP, ROW_STEP, from x 40 and y 0), so "Tidy up"
 * on a fresh draft moves nothing. Change one and change the other.
 */
export const NODES_PER_ROW = 3;
export const COLUMN_STEP = 240;
export const ROW_STEP = 140;
const ORIGIN = { x: 40, y: 0 };

/** The position of the grid cell at `index`, in reading order. */
export const gridCell = (index: number) => ({
    x: ORIGIN.x + (index % NODES_PER_ROW) * COLUMN_STEP,
    y: ORIGIN.y + Math.floor(index / NODES_PER_ROW) * ROW_STEP,
});

/**
 * Where a node sits now, in reading order: row first, then left to right. Rows are bucketed by
 * the grid's row height, so a node nudged a few pixels up still reads as part of its row.
 */
const readingOrder = (a: BoardNode, b: BoardNode) =>
    Math.round((a.y - ORIGIN.y) / ROW_STEP) - Math.round((b.y - ORIGIN.y) / ROW_STEP) || a.x - b.x;

/**
 * The page nodes in path order: every node after the nodes that point to it. Where the edges
 * leave a choice (two branches, or nodes with no edges), the node that comes first where the
 * person put it goes first. A loop of edges is broken at its first node in reading order, so
 * every node still gets a place.
 */
export function pathOrder(board: Board): BoardNode[] {
    const pages = board.nodes.filter((n) => n.kind === "PAGE").sort(readingOrder);
    const ids = new Set(pages.map((n) => n.id));
    const incoming = new Map(pages.map((n) => [n.id, 0]));
    const targets = new Map<string, string[]>();
    for (const edge of board.edges) {
        if (!ids.has(edge.source) || !ids.has(edge.target) || edge.source === edge.target) continue;
        incoming.set(edge.target, (incoming.get(edge.target) ?? 0) + 1);
        targets.set(edge.source, [...(targets.get(edge.source) ?? []), edge.target]);
    }
    const ordered: BoardNode[] = [];
    const placed = new Set<string>();
    while (ordered.length < pages.length) {
        const next = pages.find((n) => !placed.has(n.id) && incoming.get(n.id) === 0)
            ?? pages.find((n) => !placed.has(n.id))!;
        placed.add(next.id);
        ordered.push(next);
        for (const target of targets.get(next.id) ?? []) incoming.set(target, (incoming.get(target) ?? 0) - 1);
    }
    return ordered;
}

/**
 * "Tidy up": the page nodes in path order on the grid, three to a row.
 *
 * Sections are left where they are, because they are where the person decided to put them.
 * Returns only positions; the caller saves and draws them.
 */
export function tidyLayout(board: Board): { nodeId: string; x: number; y: number }[] {
    return pathOrder(board).map((node, index) => ({ nodeId: node.id, ...gridCell(index) }));
}

/**
 * Where a new node goes: the next grid cell after the ones already used, skipping any cell a
 * node has been dragged onto, so a new node never lands on top of another.
 */
export function nextNodePosition(board: Board | null | undefined): { x: number; y: number } {
    const pages = (board?.nodes ?? []).filter((n) => n.kind === "PAGE");
    const taken = (cell: { x: number; y: number }) =>
        pages.some((n) => Math.abs(n.x - cell.x) < NODE_WIDTH && Math.abs(n.y - cell.y) < NODE_HEIGHT);
    let index = pages.length;
    while (taken(gridCell(index))) index++;
    return gridCell(index);
}
