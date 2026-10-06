import { TFunction } from 'i18next';
import type { NotebookSource, Passage } from '@beyou/types/notebook/notebook';
import { call, http, Result } from './result';

/** Sources a page reads: its own and its ancestors'. */

export const getSources = (pageId: string, t: TFunction): Promise<Result<NotebookSource[]>> =>
    call(() => http().get<NotebookSource[]>(`/notebook/pages/${pageId}/sources`), t);

/** Web only: one multipart part named `file`. The server checks the bytes, not the type. */
export const addPdfSource = (pageId: string, file: Blob, name: string, t: TFunction): Promise<Result<NotebookSource>> =>
    call(() => {
        const form = new FormData();
        form.append('file', file, name);
        return http().post<NotebookSource>(`/notebook/pages/${pageId}/sources/pdf`, form);
    }, t);

export const addLinkSource = (pageId: string, url: string, t: TFunction): Promise<Result<NotebookSource>> =>
    call(() => http().post<NotebookSource>(`/notebook/pages/${pageId}/sources/link`, { url }), t);

export const addTextSource = (pageId: string, title: string, text: string, t: TFunction): Promise<Result<NotebookSource>> =>
    call(() => http().post<NotebookSource>(`/notebook/pages/${pageId}/sources/text`, { title, text }), t);

export const setSourceEnabled = (sourceId: string, enabled: boolean, t: TFunction): Promise<Result<NotebookSource>> =>
    call(() => http().patch<NotebookSource>(`/notebook/sources/${sourceId}`, { enabled }), t);

export const deleteSource = (sourceId: string, t: TFunction): Promise<Result<void>> =>
    call(() => http().delete<void>(`/notebook/sources/${sourceId}`), t);

/** A cited passage with the text either side of it. */
export const getPassage = (sourceId: string, chunkId: string, t: TFunction): Promise<Result<Passage>> =>
    call(() => http().get<Passage>(`/notebook/sources/${sourceId}/passages/${chunkId}`), t);
