import type { TFunction } from 'i18next';
import type { Dispatch } from '@reduxjs/toolkit';
import { getBoard, getNotebookHome, getPage, getTopicTree } from '@beyou/api/notebook';
import { enterBoard, enterNotebookHome, enterNotebookPage, enterNotebookTree, type NotebookState } from './notebookSlice';

const PAGE_ROUTE = /^\/notebook\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})(?:\/|$)/i;

/**
 * The notebook page a route shows, or null. "/notebook/{id}" and the board and study room under
 * it ("/notebook/{id}/board", "/notebook/{id}/study") all show that page; "/notebook/review" and
 * the home show none.
 */
export function notebookPageIdFromPath(path: string | null | undefined): string | null {
    return path?.match(PAGE_ROUTE)?.[1] ?? null;
}

/**
 * Re-reads what a write from outside the screen (the assistant) may have changed in the notebook:
 * the home, every board and tree already loaded, and the page on screen.
 *
 * Other pages the slice still holds are not fetched. Each page screen reads its page again when
 * it opens, so they catch up the moment anyone looks at them, and an assistant turn does not
 * cost a request per page visited this session.
 */
export async function refreshNotebook(
    dispatch: Dispatch,
    notebook: NotebookState,
    currentPage: string | null | undefined,
    t: TFunction,
): Promise<void> {
    const pageId = notebookPageIdFromPath(currentPage);
    const [home, page, boards, trees] = await Promise.all([
        getNotebookHome(t),
        pageId && notebook.pages[pageId] ? getPage(pageId, t) : Promise.resolve(null),
        Promise.all(Object.keys(notebook.boards).map((id) => getBoard(id, t))),
        Promise.all(Object.keys(notebook.trees).map((id) => getTopicTree(id, t))),
    ]);
    if (home.success) dispatch(enterNotebookHome(home.success));
    if (page?.success) dispatch(enterNotebookPage(page.success));
    for (const board of boards) {
        if (board.success) dispatch(enterBoard(board.success));
    }
    for (const tree of trees) {
        if (tree.success) dispatch(enterNotebookTree(tree.success));
    }
}
