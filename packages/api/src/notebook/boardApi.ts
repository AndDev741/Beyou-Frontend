import { TFunction } from 'i18next';
import type { Board, BoardChange, BoardEdge, CreateNodeInput } from '@beyou/types/notebook/notebook';
import { call, http, Result } from './result';

/** A page's roadmap board. */

export const getBoard = (pageId: string, t: TFunction): Promise<Result<Board>> =>
    call(() => http().get<Board>(`/notebook/pages/${pageId}/board`), t);

/**
 * A new child page as a node (`title`), a linked page (`linkPageId`), or a section (`label`).
 * Without `x` and `y` it goes on the next free cell; `after` links it from that node.
 */
export const addBoardNode = (pageId: string, node: CreateNodeInput, t: TFunction): Promise<Result<BoardChange>> =>
    call(() => http().post<BoardChange>(`/notebook/pages/${pageId}/board/nodes`, node), t);

export const updateBoardNode = (
    nodeId: string,
    patch: { x?: number; y?: number; width?: number; height?: number; label?: string },
    t: TFunction,
): Promise<Result<BoardChange>> => call(() => http().patch<BoardChange>(`/notebook/board/nodes/${nodeId}`, patch), t);

/**
 * Makes the board one path through every page node, in this order: the phone's reorder. The
 * edges drawn on the board are replaced by the chain. Answers the board as it is now.
 */
export const reorderBoard = (pageId: string, order: string[], t: TFunction): Promise<Result<Board>> =>
    call(() => http().put<Board>(`/notebook/pages/${pageId}/board/order`, { order }), t);

/** Many positions at once: "Tidy up", or a multi-node drag. */
export const saveBoardLayout = (
    pageId: string,
    positions: { nodeId: string; x: number; y: number }[],
    t: TFunction,
): Promise<Result<void>> =>
    call(() => http().put<void>(`/notebook/pages/${pageId}/board/layout`, { positions }), t);

/**
 * Removes a node. With `deletePage`, its page goes too, when the page lives under this board;
 * a linked page is only unlinked.
 */
export const deleteBoardNode = (nodeId: string, deletePage: boolean, t: TFunction): Promise<Result<BoardChange>> =>
    call(() => http().delete<BoardChange>(`/notebook/board/nodes/${nodeId}`, { params: { deletePage } }), t);

export const addBoardEdge = (pageId: string, source: string, target: string, t: TFunction): Promise<Result<BoardEdge>> =>
    call(() => http().post<BoardEdge>(`/notebook/pages/${pageId}/board/edges`, { source, target }), t);

export const deleteBoardEdge = (edgeId: string, t: TFunction): Promise<Result<void>> =>
    call(() => http().delete<void>(`/notebook/board/edges/${edgeId}`), t);
