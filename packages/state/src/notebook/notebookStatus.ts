import type { NotebookStatus, PageStatus } from '@beyou/types/notebook/notebook';
import type { NotebookState } from './notebookSlice';

/**
 * Writes the statuses a change moved into every place the app shows them: the page itself,
 * every board node that opens it, every tree row, and the topic previews on the home.
 *
 * Pure, so the "a node turns green everywhere at once" promise is a unit test.
 */
export function applyStatuses(state: NotebookState, changed: PageStatus[]): NotebookState {
    if (changed.length === 0) return state;
    const byPage = new Map<string, NotebookStatus>(changed.map((c) => [c.pageId, c.status]));

    const pages = { ...state.pages };
    for (const [id, page] of Object.entries(pages)) {
        const status = byPage.get(id);
        if (status && page.status !== status) pages[id] = { ...page, status };
    }

    const boards = { ...state.boards };
    for (const [id, board] of Object.entries(boards)) {
        if (!board.nodes.some((n) => n.pageId && byPage.has(n.pageId))) continue;
        boards[id] = {
            ...board,
            nodes: board.nodes.map((n) => {
                const status = n.pageId ? byPage.get(n.pageId) : undefined;
                return status ? { ...n, status } : n;
            }),
        };
    }

    const trees = { ...state.trees };
    for (const [id, tree] of Object.entries(trees)) {
        if (!tree.items.some((i) => byPage.has(i.id))) continue;
        trees[id] = {
            ...tree,
            items: tree.items.map((i) => {
                const status = byPage.get(i.id);
                return status ? { ...i, status } : i;
            }),
        };
    }

    // The home's thumbnails show the topic boards' nodes by node id, not page id, so they are
    // refreshed by refetching the home rather than guessed at here.
    return { ...state, pages, boards, trees };
}
