import { TFunction } from 'i18next';
import type {
    NotebookHome, NotebookPage, NotebookTree, PageSearchHit, StatusChange, StatusChoice,
} from '@beyou/types/notebook/notebook';
import { call, http, Result } from './result';

/** Topics and pages. */

export const getNotebookHome = (t: TFunction): Promise<Result<NotebookHome>> =>
    call(() => http().get<NotebookHome>('/notebook/home'), t);

export const createTopic = (
    topic: { title: string; description?: string | null; icon?: string | null;
        goalId?: string | null; categoryId?: string | null; habitId?: string | null },
    t: TFunction,
): Promise<Result<NotebookPage>> => call(() => http().post<NotebookPage>('/notebook/topics', topic), t);

export const getTopicTree = (topicId: string, t: TFunction): Promise<Result<NotebookTree>> =>
    call(() => http().get<NotebookTree>(`/notebook/topics/${topicId}/tree`), t);

/** Replaces the topic's goal, category and habit links as a set; null removes one. */
export const setTopicLinks = (
    topicId: string,
    links: { goalId: string | null; categoryId: string | null; habitId: string | null },
    t: TFunction,
): Promise<Result<NotebookPage>> =>
    call(() => http().put<NotebookPage>(`/notebook/topics/${topicId}/links`, links), t);

/** Opening a page also makes it the one the home's "Continue" card offers. */
export const getPage = (pageId: string, t: TFunction): Promise<Result<NotebookPage>> =>
    call(() => http().get<NotebookPage>(`/notebook/pages/${pageId}`), t);

/** A page under `parentId` that is not on its board. */
export const createPage = (
    page: { parentId: string; title: string; icon?: string | null },
    t: TFunction,
): Promise<Result<NotebookPage>> => call(() => http().post<NotebookPage>('/notebook/pages', page), t);

/** PATCH: omitted fields stay as they are; a blank icon or description clears it. */
export const updatePage = (
    pageId: string,
    patch: { title?: string; icon?: string; description?: string },
    t: TFunction,
): Promise<Result<NotebookPage>> => call(() => http().patch<NotebookPage>(`/notebook/pages/${pageId}`, patch), t);

/**
 * The editor's autosave: the whole BlockNote document as JSON, written only if the page is still
 * at `baseRevision`. A stale one answers NOTEBOOK_CONTENT_CONFLICT; read the page and merge.
 */
export const savePageContent = (
    pageId: string,
    content: string,
    baseRevision: number,
    t: TFunction,
): Promise<Result<{ id: string; updatedAt: string; contentRevision: number }>> =>
    call(() => http().put<{ id: string; updatedAt: string; contentRevision: number }>(
        `/notebook/pages/${pageId}/content`, { content, baseRevision }), t);

export const setPageStatus = (pageId: string, status: StatusChoice, t: TFunction): Promise<Result<StatusChange>> =>
    call(() => http().put<StatusChange>(`/notebook/pages/${pageId}/status`, { status }), t);

/** "Save to page": markdown appended to the document as blocks. */
export const appendToPage = (pageId: string, markdown: string, t: TFunction): Promise<Result<NotebookPage>> =>
    call(() => http().post<NotebookPage>(`/notebook/pages/${pageId}/append`, { markdown }), t);

/** Deletes the page and everything under it. */
export const deletePage = (pageId: string, t: TFunction): Promise<Result<void>> =>
    call(() => http().delete<void>(`/notebook/pages/${pageId}`), t);

export const searchPages = (query: string, t: TFunction): Promise<Result<PageSearchHit[]>> =>
    call(() => http().get<PageSearchHit[]>('/notebook/pages/search', { params: { q: query } }), t);
