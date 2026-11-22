import { TFunction } from 'i18next';
import { getHttpClient, ApiError } from '../httpClient';
import { ApiErrorPayload, parseApiError } from '../apiError';
import { getLogger } from '../logger';
import type {
    SecondBrainAnswerResult,
    SecondBrainFact,
    SecondBrainFactInput,
    SecondBrainInsight,
    SecondBrainNote,
    SecondBrainOldNoteResult,
    SecondBrainOverview,
    SecondBrainQuestion,
    SecondBrainSource,
    SecondBrainSourceState,
} from '@beyou/types/secondBrain/secondBrain';

type Result<T> = { success?: T; error?: ApiErrorPayload };

/**
 * Second Brain: one read for the whole page, then small writes.
 *
 * Every failure is caught here and returned as `{ error }`, like the rest of `@beyou/api`, so
 * web and mobile handle it the same way and neither can throw out of a render.
 */

const fail = <T>(e: unknown, t: TFunction): Result<T> => {
    if (e instanceof ApiError) {
        getLogger().error(e);
        return { error: parseApiError(e) };
    }
    return { error: { message: t('UnexpectedError') } };
};

/** The whole page in one request, so opening it costs one read from the rate bucket. */
export async function getSecondBrain(t: TFunction): Promise<Result<SecondBrainOverview>> {
    try {
        const response = await getHttpClient().get<SecondBrainOverview>('/second-brain');
        return { success: response.data };
    } catch (e) {
        return fail(e, t);
    }
}

/** Turns one source on or off. Answers every source, so the list on screen stays whole. */
export async function setSecondBrainSource(
    source: SecondBrainSource,
    enabled: boolean,
    t: TFunction,
): Promise<Result<SecondBrainSourceState[]>> {
    try {
        const response = await getHttpClient().put<SecondBrainSourceState[]>(
            `/second-brain/sources/${source}`,
            { enabled },
        );
        return { success: response.data };
    } catch (e) {
        return fail(e, t);
    }
}

export async function createSecondBrainFact(
    input: SecondBrainFactInput,
    t: TFunction,
): Promise<Result<SecondBrainFact>> {
    try {
        const response = await getHttpClient().post<SecondBrainFact>('/second-brain/facts', input);
        return { success: response.data };
    } catch (e) {
        return fail(e, t);
    }
}

export async function editSecondBrainFact(
    id: string,
    input: SecondBrainFactInput,
    t: TFunction,
): Promise<Result<SecondBrainFact>> {
    try {
        const response = await getHttpClient().put<SecondBrainFact>(`/second-brain/facts/${id}`, input);
        return { success: response.data };
    } catch (e) {
        return fail(e, t);
    }
}

export async function deleteSecondBrainFact(id: string, t: TFunction): Promise<Result<true>> {
    try {
        await getHttpClient().delete(`/second-brain/facts/${id}`);
        return { success: true };
    } catch (e) {
        return fail(e, t);
    }
}

/**
 * Asks the server to top the question list up. It decides what is due (a starter question, the
 * daily check-in, a follow-up written by the model) and answers the open list either way.
 */
export async function refillSecondBrainQuestions(t: TFunction): Promise<Result<SecondBrainQuestion[]>> {
    try {
        const response = await getHttpClient().post<SecondBrainQuestion[]>('/second-brain/questions/refill');
        return { success: response.data };
    } catch (e) {
        return fail(e, t);
    }
}

export async function answerSecondBrainQuestion(
    id: string,
    answer: string,
    t: TFunction,
): Promise<Result<SecondBrainAnswerResult>> {
    try {
        const response = await getHttpClient().post<SecondBrainAnswerResult>(
            `/second-brain/questions/${id}/answer`,
            { answer },
        );
        return { success: response.data };
    } catch (e) {
        return fail(e, t);
    }
}

export async function skipSecondBrainQuestion(id: string, t: TFunction): Promise<Result<SecondBrainQuestion>> {
    try {
        const response = await getHttpClient().post<SecondBrainQuestion>(`/second-brain/questions/${id}/skip`);
        return { success: response.data };
    } catch (e) {
        return fail(e, t);
    }
}

/** Has the model write the overview again. Slow: it is a model call, so show a pending state. */
export async function refreshSecondBrainInsight(t: TFunction): Promise<Result<SecondBrainInsight>> {
    try {
        const response = await getHttpClient().post<SecondBrainInsight>('/second-brain/insight/refresh');
        return { success: response.data };
    } catch (e) {
        return fail(e, t);
    }
}

/** Rewrites one note about a thing. The note keeps its origin and its place in the timeline. */
export async function editSecondBrainNote(id: string, text: string, t: TFunction): Promise<Result<SecondBrainNote>> {
    try {
        const response = await getHttpClient().put<SecondBrainNote>(`/second-brain/notes/${id}`, { text });
        return { success: response.data };
    } catch (e) {
        return fail(e, t);
    }
}

export async function deleteSecondBrainNote(id: string, t: TFunction): Promise<Result<true>> {
    try {
        await getHttpClient().delete(`/second-brain/notes/${id}`);
        return { success: true };
    } catch (e) {
        return fail(e, t);
    }
}

/**
 * Moves one line of the old hidden note into the profile, as an "about you" line. `text` is a
 * line exactly as the overview sent it: the server finds the line by its text. A full profile
 * answers 409 `SECOND_BRAIN_FACT_LIMIT_REACHED` and nothing changes.
 */
export async function keepSecondBrainOldNoteLine(
    text: string,
    t: TFunction,
): Promise<Result<SecondBrainOldNoteResult>> {
    try {
        const response = await getHttpClient().post<SecondBrainOldNoteResult>('/second-brain/old-note/keep', { text });
        return { success: response.data };
    } catch (e) {
        return fail(e, t);
    }
}

/** Drops one line of the old hidden note. Answers the lines still left. */
export async function discardSecondBrainOldNoteLine(
    text: string,
    t: TFunction,
): Promise<Result<SecondBrainOldNoteResult>> {
    try {
        const response = await getHttpClient().post<SecondBrainOldNoteResult>('/second-brain/old-note/discard', {
            text,
        });
        return { success: response.data };
    } catch (e) {
        return fail(e, t);
    }
}

/** Deletes whatever is left of the old hidden note, every line at once. */
export async function deleteSecondBrainOldNote(t: TFunction): Promise<Result<true>> {
    try {
        await getHttpClient().delete('/second-brain/old-note');
        return { success: true };
    } catch (e) {
        return fail(e, t);
    }
}
