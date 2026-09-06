import { TFunction } from 'i18next';
import { getHttpClient, ApiError } from '../httpClient';
import { ApiErrorPayload, parseApiError } from '../apiError';
import { getLogger } from '../logger';
import type { MoodEntry, MoodLevel } from '@beyou/types/mood/mood';

type Result<T> = { success?: T; error?: ApiErrorPayload };

/**
 * Daily mood and journaling.
 *
 * Every failure is caught here and returned as `{ error }`, matching the rest of `@beyou/api`, so
 * the two apps handle it the same way and neither can throw out of a render.
 *
 * Note the two write functions. `setMoodLevel` (PATCH) changes the level and cannot touch the
 * note; `saveMoodEntry` (PUT) replaces the whole day, so a call with no note clears one. Anything
 * that has not loaded the day's writing — the dashboard widget, the agent — must use the first.
 */

const fail = <T>(e: unknown, t: TFunction): Result<T> => {
    if (e instanceof ApiError) {
        getLogger().error(e);
        return { error: parseApiError(e) };
    }
    return { error: { message: t('UnexpectedError') } };
};

/**
 * The entries between two days, newest first.
 *
 * Both bounds are optional; with neither, the server answers the week ending on the user's own
 * today. The window may not exceed 92 days.
 */
export async function getMoodEntries(
    range: { from?: string; to?: string },
    t: TFunction,
): Promise<Result<MoodEntry[]>> {
    try {
        const response = await getHttpClient().get<MoodEntry[]>('/mood', { params: range });
        return { success: response.data };
    } catch (e) {
        return fail(e, t);
    }
}

/**
 * Sets one day's level, leaving any journal entry exactly as it was.
 *
 * This is what a tap on a face sends. It is a separate call from `saveMoodEntry` so that a
 * client which never loaded the day's note has no way to erase it.
 */
export async function setMoodLevel(
    date: string,
    mood: MoodLevel,
    t: TFunction,
): Promise<Result<MoodEntry>> {
    try {
        const response = await getHttpClient().patch<MoodEntry>(`/mood/${date}`, { mood });
        return { success: response.data };
    } catch (e) {
        return fail(e, t);
    }
}

/**
 * Replaces one day's entry, note included.
 *
 * Sending `note: null` clears the note, which is correct for a Save button whose textarea is
 * the day's final text and wrong for anything else.
 */
export async function saveMoodEntry(
    date: string,
    entry: { mood: MoodLevel; note: string | null },
    t: TFunction,
): Promise<Result<MoodEntry>> {
    try {
        const response = await getHttpClient().put<MoodEntry>(`/mood/${date}`, entry);
        return { success: response.data };
    } catch (e) {
        return fail(e, t);
    }
}

export async function deleteMoodEntry(date: string, t: TFunction): Promise<Result<void>> {
    try {
        await getHttpClient().delete(`/mood/${date}`);
        return { success: undefined };
    } catch (e) {
        return fail(e, t);
    }
}
