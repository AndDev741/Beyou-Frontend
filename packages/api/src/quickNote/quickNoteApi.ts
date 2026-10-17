import { TFunction } from 'i18next';
import { getHttpClient, ApiError } from '../httpClient';
import { ApiErrorPayload, parseApiError } from '../apiError';
import { trackItemCreated } from '../analyticsEvents';
import { getLogger } from '../logger';
import { priorityOrNull } from '../tasks/priority';
import type {
    QuickNote,
    QuickNoteCreateInput,
    QuickNoteEditInput,
    QuickNotePosition,
    QuickNoteTaskConversion,
} from '@beyou/types/quickNote/quickNote';

type Result<T> = { success?: T; error?: ApiErrorPayload };

/**
 * The Ideas board: quick notes, where they sit, and turning one into a task.
 *
 * Every failure is caught here and returned as `{ error }`, matching the rest of `@beyou/api`, so
 * web and mobile handle it the same way and neither can throw out of a render.
 */

const fail = <T>(e: unknown, t: TFunction): Result<T> => {
    if (e instanceof ApiError) {
        getLogger().error(e);
        return { error: parseApiError(e) };
    }
    return { error: { message: t('UnexpectedError') } };
};

/** The task fields a conversion sends, the same ones the task form collects. */
export type QuickNoteTaskInput = {
    name: string;
    description: string;
    iconId: string;
    categoriesId: string[];
    importance?: number;
    difficulty?: number;
    oneTimeTask?: boolean;
};

/** The notes on the board, back to front. */
export async function getQuickNotes(t: TFunction): Promise<Result<QuickNote[]>> {
    try {
        const response = await getHttpClient().get<QuickNote[]>('/quick-notes');
        return { success: response.data };
    } catch (e) {
        return fail(e, t);
    }
}

/** Notes taken off the board, most recently archived first. */
export async function getArchivedQuickNotes(t: TFunction): Promise<Result<QuickNote[]>> {
    try {
        const response = await getHttpClient().get<QuickNote[]>('/quick-notes/archived');
        return { success: response.data };
    } catch (e) {
        return fail(e, t);
    }
}

/** Without `x` and `y` the server drops the note in the first free cell of the board. */
export async function createQuickNote(
    input: QuickNoteCreateInput,
    t: TFunction,
): Promise<Result<QuickNote>> {
    try {
        const response = await getHttpClient().post<QuickNote>('/quick-notes', input);
        return { success: response.data };
    } catch (e) {
        return fail(e, t);
    }
}

export async function editQuickNote(
    id: string,
    input: QuickNoteEditInput,
    t: TFunction,
): Promise<Result<QuickNote>> {
    try {
        const response = await getHttpClient().put<QuickNote>(`/quick-notes/${id}`, input);
        return { success: response.data };
    } catch (e) {
        return fail(e, t);
    }
}

/**
 * Saves where notes sit and how they stack. All or nothing: one id that is not an active note of
 * this account and the server saves none of them. Answers the whole board as it now is.
 */
export async function saveQuickNoteLayout(
    positions: QuickNotePosition[],
    t: TFunction,
): Promise<Result<QuickNote[]>> {
    try {
        const response = await getHttpClient().put<QuickNote[]>('/quick-notes/layout', { positions });
        return { success: response.data };
    } catch (e) {
        return fail(e, t);
    }
}

/** Lines every note up in the board's grid, grouped by colour. Answers the new board. */
export async function tidyQuickNotes(t: TFunction): Promise<Result<QuickNote[]>> {
    try {
        const response = await getHttpClient().post<QuickNote[]>('/quick-notes/tidy');
        return { success: response.data };
    } catch (e) {
        return fail(e, t);
    }
}

export async function archiveQuickNote(id: string, t: TFunction): Promise<Result<QuickNote>> {
    try {
        const response = await getHttpClient().post<QuickNote>(`/quick-notes/${id}/archive`);
        return { success: response.data };
    } catch (e) {
        return fail(e, t);
    }
}

/** Back on the board where it was, in front of the rest. Refused when the board is full. */
export async function restoreQuickNote(id: string, t: TFunction): Promise<Result<QuickNote>> {
    try {
        const response = await getHttpClient().post<QuickNote>(`/quick-notes/${id}/restore`);
        return { success: response.data };
    } catch (e) {
        return fail(e, t);
    }
}

export async function deleteQuickNote(id: string, t: TFunction): Promise<Result<true>> {
    try {
        await getHttpClient().delete(`/quick-notes/${id}`);
        return { success: true };
    } catch (e) {
        return fail(e, t);
    }
}

/**
 * Creates the task and archives the note in one go on the server, so a failed task never costs
 * the note and a double submit never makes two tasks (the second answers
 * `QUICK_NOTE_ALREADY_CONVERTED`).
 */
export async function convertQuickNoteToTask(
    id: string,
    input: QuickNoteTaskInput,
    t: TFunction,
): Promise<Result<QuickNoteTaskConversion>> {
    try {
        const response = await getHttpClient().post<QuickNoteTaskConversion>(`/quick-notes/${id}/task`, {
            name: input.name,
            description: input.description,
            iconId: input.iconId,
            categoriesId: input.categoriesId,
            importance: priorityOrNull(input.importance),
            difficulty: priorityOrNull(input.difficulty),
            oneTimeTask: input.oneTimeTask ?? false,
        });
        trackItemCreated('task', null);
        return { success: response.data };
    } catch (e) {
        return fail(e, t);
    }
}
