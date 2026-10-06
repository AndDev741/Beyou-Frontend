import type { NotebookState } from './notebookSlice';

/** What a page is called and drawn as. */
export type PageDetails = { pageId: string; title: string; icon: string | null };

/**
 * Writes a page's title and icon everywhere the app shows the page: the page itself and the
 * breadcrumbs of the pages under it, every board node that opens it, every tree row, the tree's
 * topic header, and the home's topic card and "continue" card.
 *
 * The same promise as {@link applyStatuses}: rename a page or give it an icon and the sidebar
 * and the board say so at once, without a refetch. Pure, so that is a unit test.
 */
export function applyPageDetails(state: NotebookState, details: PageDetails): NotebookState {
    const { pageId, title, icon } = details;

    const pages = { ...state.pages };
    for (const [id, page] of Object.entries(pages)) {
        const own = id === pageId ? { title, icon } : {};
        const inCrumbs = page.breadcrumb.some((crumb) => crumb.id === pageId);
        if (id !== pageId && !inCrumbs) continue;
        pages[id] = {
            ...page,
            ...own,
            breadcrumb: inCrumbs
                ? page.breadcrumb.map((crumb) => (crumb.id === pageId ? { ...crumb, title, icon } : crumb))
                : page.breadcrumb,
        };
    }

    const boards = { ...state.boards };
    for (const [id, board] of Object.entries(boards)) {
        if (!board.nodes.some((n) => n.pageId === pageId)) continue;
        boards[id] = { ...board, nodes: board.nodes.map((n) => (n.pageId === pageId ? { ...n, title, icon } : n)) };
    }

    const trees = { ...state.trees };
    for (const [id, tree] of Object.entries(trees)) {
        const isTopic = tree.topic.id === pageId;
        if (!isTopic && !tree.items.some((i) => i.id === pageId)) continue;
        trees[id] = {
            ...tree,
            topic: isTopic ? { ...tree.topic, title, icon } : tree.topic,
            items: tree.items.map((i) => (i.id === pageId ? { ...i, title, icon } : i)),
        };
    }

    const home = state.home && {
        ...state.home,
        topics: state.home.topics.map((topic) => (topic.id === pageId ? { ...topic, title, icon } : topic)),
        continueStudying: state.home.continueStudying?.pageId === pageId
            ? { ...state.home.continueStudying, title, icon }
            : state.home.continueStudying,
    };

    return { ...state, home, pages, boards, trees };
}
