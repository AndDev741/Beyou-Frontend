import type { Board, BoardNode } from '@beyou/types/notebook/notebook';

/**
 * A board read as a path: its page nodes in levels, where every node comes after the nodes that
 * point to it. This is how the phone shows a roadmap ("Then, in any order"), since a canvas you
 * pan with one thumb is not a way to read one.
 *
 * Longest-path layering on the edges. Nodes in a loop (edges only order, so a loop is possible
 * even though nothing creates one on purpose) are placed after everything else rather than
 * dropped. Within a level, left to right as the board has them.
 */
export function pathLevels(board: Board): BoardNode[][] {
    const nodes = board.nodes.filter((n) => n.kind === 'PAGE');
    const ids = new Set(nodes.map((n) => n.id));
    const incoming = new Map<string, string[]>();
    for (const n of nodes) incoming.set(n.id, []);
    for (const e of board.edges) {
        if (ids.has(e.source) && ids.has(e.target)) incoming.get(e.target)!.push(e.source);
    }

    const level = new Map<string, number>();
    const visiting = new Set<string>();
    const depth = (id: string): number => {
        const known = level.get(id);
        if (known !== undefined) return known;
        if (visiting.has(id)) return -1;
        visiting.add(id);
        let d = 0;
        for (const from of incoming.get(id) ?? []) {
            const parent = depth(from);
            if (parent >= 0) d = Math.max(d, parent + 1);
        }
        visiting.delete(id);
        level.set(id, d);
        return d;
    };
    nodes.forEach((n) => depth(n.id));

    const levels: BoardNode[][] = [];
    const sorted = [...nodes].sort((a, b) => a.x - b.x || a.y - b.y);
    for (const n of sorted) {
        const d = level.get(n.id) ?? 0;
        (levels[d] ??= []).push(n);
    }
    return levels.filter((l) => l && l.length > 0);
}

/** Ids of the nodes that must come before `nodeId`, for "After Data Structures". */
export function prerequisitesOf(board: Board, nodeId: string): BoardNode[] {
    const before = new Set(board.edges.filter((e) => e.target === nodeId).map((e) => e.source));
    return board.nodes.filter((n) => before.has(n.id));
}

/** A share, 0 to 1, for progress bars. Zero when there is nothing to count. */
export function progressShare(progress: { done: number; total: number } | null | undefined): number {
    if (!progress || progress.total <= 0) return 0;
    return Math.min(1, progress.done / progress.total);
}
