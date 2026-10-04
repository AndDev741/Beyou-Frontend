import { useCallback, useEffect, useState } from "react";
import { useDispatch, useSelector, useStore } from "react-redux";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import type { RootState } from "@beyou/state/rootReducer";
import {
    enterBoard,
    enterBoardEdge,
    enterNotebookTree,
    moveBoardNodes,
    notebookStatusesChanged,
    removeBoardEdge,
    removeBoardNode,
    upsertBoardNode,
} from "@beyou/state";
import type { ApiErrorPayload } from "@beyou/api/apiError";
import { getFriendlyErrorMessage } from "@beyou/api/apiError";
import {
    addBoardEdge,
    addBoardNode,
    deleteBoardEdge,
    deleteBoardNode,
    getBoard,
    getTopicTree,
    saveBoardLayout,
    updateBoardNode,
} from "@beyou/api/notebook";
import type { BoardChange, BoardNode } from "@beyou/types/notebook/notebook";
import type { RefreshUI } from "@beyou/types/refreshUi/refreshUi.type";
import { nextNodePosition, tidyLayout } from "./boardLayout";

/**
 * Everything a board can do, in one place, for the inline board and the focus board alike.
 *
 * Every write lands in the store from the server's answer, never from a guess: a new node comes
 * back with its page id, and a node added to a finished page comes back with that page reopened
 * (`changed`), which is written everywhere the page is shown. Positions are the one exception,
 * written first and saved after, so a drag does not wait on the network.
 */
export function useBoard(pageId: string | undefined) {
    const { t } = useTranslation();
    const dispatch = useDispatch();
    const store = useStore();
    const board = useSelector((state: RootState) => (pageId ? state.notebook.boards[pageId] : undefined));
    const [error, setError] = useState<ApiErrorPayload | null>(null);
    const [refreshUi, setRefreshUi] = useState<RefreshUI>({});

    const reload = useCallback(async () => {
        if (!pageId) return;
        const response = await getBoard(pageId, t);
        if (response.success) dispatch(enterBoard(response.success));
        else setError(response.error ?? null);
    }, [pageId, t, dispatch]);

    useEffect(() => {
        void reload();
    }, [reload]);

    const fail = useCallback(
        (e?: ApiErrorPayload) => {
            setError(e ?? null);
            toast.error(getFriendlyErrorMessage(t, e));
        },
        [t]
    );

    /**
     * A node added or removed is a page added to or taken from the topic's tree, so the sidebar
     * re-reads it. The tree is keyed by topic, which the board's page knows.
     */
    const refreshTree = useCallback(async () => {
        if (!pageId) return;
        const page = (store.getState() as RootState).notebook.pages[pageId];
        const topicId = page ? (page.kind === "TOPIC" ? page.id : page.topicId) : null;
        if (!topicId) return;
        const response = await getTopicTree(topicId, t);
        if (response.success) dispatch(enterNotebookTree(response.success));
    }, [pageId, store, t, dispatch]);

    const settle = useCallback(
        (change: BoardChange) => {
            if (!pageId) return;
            if (change.node) dispatch(upsertBoardNode({ pageId, node: change.node }));
            if (change.changed.length) dispatch(notebookStatusesChanged(change.changed));
            if (change.refreshUi) setRefreshUi(change.refreshUi);
            if (change.node?.kind === "PAGE") void refreshTree();
        },
        [dispatch, pageId, refreshTree]
    );

    const addNode = useCallback(
        async (title: string, at?: { x: number; y: number }) => {
            if (!pageId || !title.trim()) return null;
            const position = at ?? nextNodePosition(board);
            const response = await addBoardNode(pageId, { kind: "PAGE", title: title.trim(), ...position }, t);
            if (!response.success) {
                fail(response.error);
                return null;
            }
            settle(response.success);
            return response.success.node;
        },
        [pageId, board, t, fail, settle]
    );

    const linkPage = useCallback(
        async (linkPageId: string) => {
            if (!pageId) return null;
            const response = await addBoardNode(pageId, { kind: "PAGE", linkPageId, ...nextNodePosition(board) }, t);
            if (!response.success) {
                fail(response.error);
                return null;
            }
            settle(response.success);
            return response.success.node;
        },
        [pageId, board, t, fail, settle]
    );

    const addSection = useCallback(
        async (label: string) => {
            if (!pageId || !label.trim()) return;
            const below = Math.max(0, ...(board?.nodes ?? []).map((n) => n.y + (n.height ?? 64)));
            const response = await addBoardNode(
                pageId,
                { kind: "SECTION", label: label.trim(), x: 20, y: below + 40, width: 420, height: 260 },
                t
            );
            if (response.success) settle(response.success);
            else fail(response.error);
        },
        [pageId, board, t, fail, settle]
    );

    const move = useCallback(
        async (positions: { nodeId: string; x: number; y: number }[]) => {
            if (!pageId || positions.length === 0) return;
            dispatch(moveBoardNodes({ pageId, positions }));
            const response = await saveBoardLayout(pageId, positions, t);
            if (response.error) fail(response.error);
        },
        [pageId, dispatch, t, fail]
    );

    const resizeSection = useCallback(
        async (nodeId: string, width: number, height: number) => {
            const response = await updateBoardNode(nodeId, { width: Math.round(width), height: Math.round(height) }, t);
            if (response.success) settle(response.success);
        },
        [t, settle]
    );

    const renameSection = useCallback(
        async (nodeId: string, label: string) => {
            const response = await updateBoardNode(nodeId, { label }, t);
            if (response.success) settle(response.success);
            else fail(response.error);
        },
        [t, settle, fail]
    );

    const connect = useCallback(
        async (source: string, target: string) => {
            if (!pageId) return;
            if (board?.edges.some((e) => e.source === source && e.target === target)) return;
            const response = await addBoardEdge(pageId, source, target, t);
            if (response.success) dispatch(enterBoardEdge({ pageId, edge: response.success }));
            else fail(response.error);
        },
        [pageId, board, t, dispatch, fail]
    );

    const removeEdge = useCallback(
        async (edgeId: string) => {
            if (!pageId) return;
            dispatch(removeBoardEdge({ pageId, edgeId }));
            const response = await deleteBoardEdge(edgeId, t);
            if (response.error) {
                fail(response.error);
                void reload();
            }
        },
        [pageId, dispatch, t, fail, reload]
    );

    /**
     * Removes a node. `deletePage` deletes its page and everything under it too; the server only
     * honours it for a page that lives under this board, so a linked page is never deleted here.
     */
    const removeNode = useCallback(
        async (node: BoardNode, deletePage: boolean) => {
            if (!pageId) return;
            const response = await deleteBoardNode(node.id, deletePage, t);
            if (!response.success) {
                fail(response.error);
                return;
            }
            dispatch(removeBoardNode({ pageId, nodeId: node.id }));
            if (response.success.changed.length) dispatch(notebookStatusesChanged(response.success.changed));
            if (response.success.refreshUi) setRefreshUi(response.success.refreshUi);
            if (node.kind === "PAGE") void refreshTree();
        },
        [pageId, t, dispatch, fail, refreshTree]
    );

    const tidy = useCallback(async () => {
        if (!board) return;
        await move(tidyLayout(board));
    }, [board, move]);

    return {
        board,
        error,
        refreshUi,
        reload,
        addNode,
        linkPage,
        addSection,
        move,
        resizeSection,
        renameSection,
        connect,
        removeEdge,
        removeNode,
        tidy,
    };
}
