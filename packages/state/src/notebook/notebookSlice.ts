import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type {
    Board, BoardEdge, BoardNode, NotebookHome, NotebookPage, NotebookTree, PageStatus,
} from '@beyou/types/notebook/notebook';
import { applyStatuses } from './notebookStatus';
import { applyPageDetails, type PageDetails } from './notebookDetails';

/**
 * What the app has loaded of the study notebook.
 *
 * Indexed by id, because the same page shows up in four places at once: a node on its parent's
 * board, a row in the sidebar tree, the page screen, and a card on the home. A status change
 * answers with every page it moved (`StatusChange.changed`), and {@link applyStatuses} writes
 * them into all four, so a node turns green on the board the moment its page is marked done,
 * without a refetch.
 *
 * NOTE: pages carry the person's notes, like the mood journal. The slice is on the web persist
 * blacklist and mobile redux is in-memory, so none of it reaches disk.
 */
export type NotebookState = {
    home: NotebookHome | null;
    pages: Record<string, NotebookPage>;
    trees: Record<string, NotebookTree>;
    boards: Record<string, Board>;
};

const initialState: NotebookState = { home: null, pages: {}, trees: {}, boards: {} };

const notebookSlice = createSlice({
    name: 'notebook',
    initialState,
    reducers: {
        enterNotebookHome(state, action: PayloadAction<NotebookHome>) {
            return { ...state, home: action.payload };
        },
        enterNotebookPage(state, action: PayloadAction<NotebookPage>) {
            return { ...state, pages: { ...state.pages, [action.payload.id]: action.payload } };
        },
        removeNotebookPage(state, action: PayloadAction<string>) {
            const pages = { ...state.pages };
            delete pages[action.payload];
            const boards = { ...state.boards };
            delete boards[action.payload];
            // Drop it from every board it sat on; the server cascaded the same way.
            for (const [id, board] of Object.entries(boards)) {
                if (board.nodes.some((n) => n.pageId === action.payload)) {
                    const gone = new Set(board.nodes.filter((n) => n.pageId === action.payload).map((n) => n.id));
                    boards[id] = {
                        ...board,
                        nodes: board.nodes.filter((n) => !gone.has(n.id)),
                        edges: board.edges.filter((e) => !gone.has(e.source) && !gone.has(e.target)),
                    };
                }
            }
            return { ...state, pages, boards };
        },
        enterNotebookTree(state, action: PayloadAction<NotebookTree>) {
            return { ...state, trees: { ...state.trees, [action.payload.topic.id]: action.payload } };
        },
        enterBoard(state, action: PayloadAction<Board>) {
            return { ...state, boards: { ...state.boards, [action.payload.pageId]: action.payload } };
        },
        /** A node created or changed on a board, added or replaced in place. */
        upsertBoardNode(state, action: PayloadAction<{ pageId: string; node: BoardNode }>) {
            const board = state.boards[action.payload.pageId];
            if (!board) return state;
            const exists = board.nodes.some((n) => n.id === action.payload.node.id);
            const nodes = exists
                ? board.nodes.map((n) => (n.id === action.payload.node.id ? action.payload.node : n))
                : [...board.nodes, action.payload.node];
            return { ...state, boards: { ...state.boards, [board.pageId]: { ...board, nodes } } };
        },
        removeBoardNode(state, action: PayloadAction<{ pageId: string; nodeId: string }>) {
            const board = state.boards[action.payload.pageId];
            if (!board) return state;
            const { nodeId } = action.payload;
            return {
                ...state,
                boards: {
                    ...state.boards,
                    [board.pageId]: {
                        ...board,
                        nodes: board.nodes.filter((n) => n.id !== nodeId),
                        edges: board.edges.filter((e) => e.source !== nodeId && e.target !== nodeId),
                    },
                },
            };
        },
        /** Positions only, for a drag or "Tidy up": the server already has them. */
        moveBoardNodes(state, action: PayloadAction<{ pageId: string; positions: { nodeId: string; x: number; y: number }[] }>) {
            const board = state.boards[action.payload.pageId];
            if (!board) return state;
            const byId = new Map(action.payload.positions.map((p) => [p.nodeId, p]));
            const nodes = board.nodes.map((n) => {
                const p = byId.get(n.id);
                return p ? { ...n, x: p.x, y: p.y } : n;
            });
            return { ...state, boards: { ...state.boards, [board.pageId]: { ...board, nodes } } };
        },
        enterBoardEdge(state, action: PayloadAction<{ pageId: string; edge: BoardEdge }>) {
            const board = state.boards[action.payload.pageId];
            if (!board) return state;
            return {
                ...state,
                boards: { ...state.boards, [board.pageId]: { ...board, edges: [...board.edges, action.payload.edge] } },
            };
        },
        removeBoardEdge(state, action: PayloadAction<{ pageId: string; edgeId: string }>) {
            const board = state.boards[action.payload.pageId];
            if (!board) return state;
            return {
                ...state,
                boards: {
                    ...state.boards,
                    [board.pageId]: { ...board, edges: board.edges.filter((e) => e.id !== action.payload.edgeId) },
                },
            };
        },
        /** Every page a status change moved, written everywhere it is shown. */
        notebookStatusesChanged(state, action: PayloadAction<PageStatus[]>) {
            return applyStatuses(state, action.payload);
        },
        /** A page was renamed or given an icon, written everywhere it is shown. */
        notebookPageDetailsChanged(state, action: PayloadAction<PageDetails>) {
            return applyPageDetails(state, action.payload);
        },
        /** Logout on web, where the store survives the navigation. */
        clearNotebook() {
            return initialState;
        },
    },
});

export const {
    enterNotebookHome, enterNotebookPage, removeNotebookPage, enterNotebookTree, enterBoard,
    upsertBoardNode, removeBoardNode, moveBoardNodes, enterBoardEdge, removeBoardEdge,
    notebookStatusesChanged, notebookPageDetailsChanged, clearNotebook,
} = notebookSlice.actions;
export default notebookSlice.reducer;
