import { describe, expect, it } from 'vitest';
import type { Board, BoardNode, NotebookPage } from '@beyou/types/notebook/notebook';
import reducer, { enterBoard, enterNotebookPage, notebookStatusesChanged, removeNotebookPage } from '../notebookSlice';
import { pathLevels, prerequisitesOf, progressShare } from '../notebookPath';

const node = (id: string, pageId: string, x: number, y = 0): BoardNode => ({
    id, kind: 'PAGE', pageId, title: id, icon: null, status: 'TO_STUDY', progress: null, hasBoard: false,
    x, y, width: null, height: null, linked: false, homeTopicTitle: null,
});

const page = (id: string): NotebookPage => ({
    id, kind: 'PAGE', topicId: 't', parentId: 't', title: id, icon: null, description: null, content: null,
    status: 'TO_STUDY', statusManual: false, hasBoard: false, progress: { done: 0, total: 1 }, breadcrumb: [],
    goal: null, category: null, habit: null, focusMinutes: 0, cardsTotal: 0, cardsDue: 0, sourcesCount: 0,
    updatedAt: '2026-10-04T00:00:00Z',
});

const board = (): Board => ({
    pageId: 't',
    nodes: [node('basics', 'p-basics', 0), node('ds', 'p-ds', 240, 0), node('os', 'p-os', 240, 200), node('sd', 'p-sd', 480)],
    edges: [
        { id: 'e1', source: 'basics', target: 'ds' },
        { id: 'e2', source: 'basics', target: 'os' },
        { id: 'e3', source: 'ds', target: 'sd' },
        { id: 'e4', source: 'os', target: 'sd' },
    ],
});

describe('notebook slice', () => {
    /** A page marked done turns green on its board, its page and its tree in one dispatch. */
    it('writes a status change everywhere the page is shown', () => {
        let state = reducer(undefined, enterBoard(board()));
        state = reducer(state, enterNotebookPage(page('p-ds')));

        state = reducer(state, notebookStatusesChanged([{ pageId: 'p-ds', status: 'DONE' }]));

        expect(state.pages['p-ds'].status).toBe('DONE');
        expect(state.boards.t.nodes.find((n) => n.id === 'ds')?.status).toBe('DONE');
        expect(state.boards.t.nodes.find((n) => n.id === 'os')?.status).toBe('TO_STUDY');
    });

    it('removing a page takes its node and the edges touching it off every board', () => {
        let state = reducer(undefined, enterBoard(board()));

        state = reducer(state, removeNotebookPage('p-ds'));

        expect(state.boards.t.nodes.map((n) => n.id)).toEqual(['basics', 'os', 'sd']);
        expect(state.boards.t.edges.map((e) => e.id)).toEqual(['e2', 'e4']);
    });
});

describe('pathLevels', () => {
    it('puts every node after the nodes that point to it', () => {
        expect(pathLevels(board()).map((l) => l.map((n) => n.id))).toEqual([['basics'], ['ds', 'os'], ['sd']]);
    });

    /** Edges only order, so a loop can exist; its nodes are still shown, not lost. */
    it('keeps nodes caught in a loop', () => {
        const looped: Board = {
            pageId: 't',
            nodes: [node('a', 'pa', 0), node('b', 'pb', 240)],
            edges: [{ id: '1', source: 'a', target: 'b' }, { id: '2', source: 'b', target: 'a' }],
        };
        expect(pathLevels(looped).flat().map((n) => n.id).sort()).toEqual(['a', 'b']);
    });

    it('names what comes before a node', () => {
        expect(prerequisitesOf(board(), 'sd').map((n) => n.id)).toEqual(['ds', 'os']);
    });

    it('shares are bounded and safe on an empty count', () => {
        expect(progressShare({ done: 3, total: 4 })).toBe(0.75);
        expect(progressShare({ done: 0, total: 0 })).toBe(0);
        expect(progressShare(null)).toBe(0);
    });
});
