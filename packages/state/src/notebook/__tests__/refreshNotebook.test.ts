import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { TFunction } from 'i18next';
import type { NotebookPage } from '@beyou/types/notebook/notebook';
import type { NotebookState } from '../notebookSlice';

const api = vi.hoisted(() => ({
    getNotebookHome: vi.fn(),
    getPage: vi.fn(),
    getBoard: vi.fn(),
    getTopicTree: vi.fn(),
}));
vi.mock('@beyou/api/notebook', () => api);

import { notebookPageIdFromPath, refreshNotebook } from '../refreshNotebook';

const ID = '3f1a6f1e-0000-4000-8000-000000000001';
const t = ((key: string) => key) as unknown as TFunction;

const state = (pages: string[]): NotebookState => ({
    home: null,
    pages: Object.fromEntries(pages.map((id) => [id, { id } as NotebookPage])),
    trees: { 'topic-1': {} as never },
    boards: { [ID]: {} as never, 'board-2': {} as never },
});

describe('notebookPageIdFromPath', () => {
    it('reads the page from the page, its board and its study room', () => {
        expect(notebookPageIdFromPath(`/notebook/${ID}`)).toBe(ID);
        expect(notebookPageIdFromPath(`/notebook/${ID}/board`)).toBe(ID);
        expect(notebookPageIdFromPath(`/notebook/${ID}/study`)).toBe(ID);
    });

    it('finds no page on the home, the review or anywhere else', () => {
        expect(notebookPageIdFromPath('/notebook')).toBeNull();
        expect(notebookPageIdFromPath('/notebook/review')).toBeNull();
        expect(notebookPageIdFromPath(`/goals/${ID}`)).toBeNull();
        expect(notebookPageIdFromPath(undefined)).toBeNull();
    });
});

describe('refreshNotebook', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        api.getNotebookHome.mockResolvedValue({ success: { topics: [] } });
        api.getPage.mockImplementation(async (id: string) => ({ success: { id, title: 'fresh' } }));
        api.getBoard.mockImplementation(async (id: string) => ({ success: { pageId: id, nodes: [], edges: [] } }));
        api.getTopicTree.mockImplementation(async (id: string) => ({ success: { topic: { id }, items: [] } }));
    });

    it('re-reads the home, every loaded board and tree, and the page on screen', async () => {
        const dispatch = vi.fn();

        await refreshNotebook(dispatch, state([ID, 'other-page']), `/notebook/${ID}/board`, t);

        expect(api.getBoard.mock.calls.map((c) => c[0]).sort()).toEqual(['board-2', ID].sort());
        expect(api.getTopicTree).toHaveBeenCalledWith('topic-1', t);
        // Only the page on screen: the others read themselves again when they open.
        expect(api.getPage.mock.calls.map((c) => c[0])).toEqual([ID]);
        expect(dispatch.mock.calls.map((c) => c[0].type)).toEqual(expect.arrayContaining([
            'notebook/enterNotebookHome', 'notebook/enterNotebookPage', 'notebook/enterBoard', 'notebook/enterNotebookTree',
        ]));
    });

    it('fetches no page when none is on screen, and skips a fetch that failed', async () => {
        const dispatch = vi.fn();
        api.getBoard.mockResolvedValue({ error: { errorKey: 'NOTEBOOK_PAGE_NOT_FOUND' } });

        await refreshNotebook(dispatch, state([ID]), '/dashboard', t);

        expect(api.getPage).not.toHaveBeenCalled();
        expect(dispatch.mock.calls.map((c) => c[0].type)).not.toContain('notebook/enterBoard');
    });
});
