import { TFunction } from 'i18next';
import { getHttpClient, ApiError } from '../httpClient';
import { ApiErrorPayload, parseApiError } from '../apiError';
import { getLogger } from '../logger';
import type { FocusCycle, FocusDay, FocusMicroTask, ServerCycleKind } from '@beyou/types/focus/focus';

type Result<T> = { success?: T; error?: ApiErrorPayload };

/**
 * The Focus Mode's history endpoints.
 *
 * Every failure is caught here and returned as `{ error }`, matching the rest of `@beyou/api`, so
 * the two apps handle it the same way and neither can throw out of a render.
 */

const fail = <T>(e: unknown, t: TFunction): Result<T> => {
    if (e instanceof ApiError) {
        getLogger().error(e);
        return { error: parseApiError(e) };
    }
    return { error: { message: t('UnexpectedError') } };
};

/** Report one completed cycle. Sent the moment it runs out; never for an abandoned one. */
export async function recordFocusCycle(
    input: { itemGroupId: string | null; kind: ServerCycleKind; startedAt: string; endedAt: string; minutes: number },
    t: TFunction,
): Promise<Result<FocusCycle>> {
    try {
        const response = await getHttpClient().post<FocusCycle>('/focus/cycles', input);
        return { success: response.data };
    } catch (e) {
        return fail(e, t);
    }
}

/** Today's list for one item. The server materialises pinned templates on this read. */
export async function listFocusMicroTasks(itemGroupId: string, t: TFunction): Promise<Result<FocusMicroTask[]>> {
    try {
        const response = await getHttpClient().get<FocusMicroTask[]>('/focus/micro-tasks', {
            params: { itemGroupId },
        });
        return { success: response.data };
    } catch (e) {
        return fail(e, t);
    }
}

export async function addFocusMicroTask(
    input: { itemGroupId: string; name: string; pinned: boolean },
    t: TFunction,
): Promise<Result<FocusMicroTask>> {
    try {
        const response = await getHttpClient().post<FocusMicroTask>('/focus/micro-tasks', input);
        return { success: response.data };
    } catch (e) {
        return fail(e, t);
    }
}

export async function toggleFocusMicroTask(id: string, t: TFunction): Promise<Result<FocusMicroTask>> {
    try {
        const response = await getHttpClient().patch<FocusMicroTask>(`/focus/micro-tasks/${id}/toggle`, {});
        return { success: response.data };
    } catch (e) {
        return fail(e, t);
    }
}

export async function pinFocusMicroTask(id: string, pinned: boolean, t: TFunction): Promise<Result<FocusMicroTask>> {
    try {
        const response = await getHttpClient().patch<FocusMicroTask>(`/focus/micro-tasks/${id}/pin`, {}, {
            params: { pinned },
        });
        return { success: response.data };
    } catch (e) {
        return fail(e, t);
    }
}

export async function deleteFocusMicroTask(id: string, t: TFunction): Promise<Result<void>> {
    try {
        await getHttpClient().delete(`/focus/micro-tasks/${id}`);
        return { success: undefined };
    } catch (e) {
        return fail(e, t);
    }
}

export async function getFocusDay(date: string, t: TFunction): Promise<Result<FocusDay>> {
    try {
        const response = await getHttpClient().get<FocusDay>('/focus/day', { params: { date } });
        return { success: response.data };
    } catch (e) {
        return fail(e, t);
    }
}
