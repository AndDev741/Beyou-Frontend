import { TFunction } from 'i18next';
import { getHttpClient, ApiError } from '../httpClient';
import { ApiErrorPayload, parseApiError } from '../apiError';
import { getLogger } from '../logger';
import type {
    CalendarOverview,
    CalendarTask,
    CalendarTaskInput,
} from '@beyou/types/calendar/calendar';
import type { RefreshUI } from '@beyou/types/refreshUi/refreshUi.type';

type Result<T> = { success?: T; error?: ApiErrorPayload };

/**
 * The Calendar page: dated tasks, their reminders and the joined per-day overview.
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

/** What completing or un-completing a task answers: the task as it now is and the XP to apply. */
export type CalendarTaskCompletion = {
    task: CalendarTask;
    refreshUi: RefreshUI;
};

/**
 * Every day between `from` and `to`, both inclusive, with its tasks, routine, goal deadlines and
 * mood. The server refuses a range longer than `CALENDAR_MAX_RANGE_DAYS`.
 */
export async function getCalendarOverview(
    range: { from: string; to: string },
    t: TFunction,
): Promise<Result<CalendarOverview>> {
    try {
        const response = await getHttpClient().get<CalendarOverview>('/calendar', { params: range });
        return { success: response.data };
    } catch (e) {
        return fail(e, t);
    }
}

export async function createCalendarTask(
    input: CalendarTaskInput,
    t: TFunction,
): Promise<Result<CalendarTask>> {
    try {
        const response = await getHttpClient().post<CalendarTask>('/calendar/tasks', input);
        return { success: response.data };
    } catch (e) {
        return fail(e, t);
    }
}

/**
 * Replaces the task's fields. Moving the date, time or advance re-arms the reminder on the server,
 * so a task edited after its email went out reminds again at its new time.
 */
export async function editCalendarTask(
    id: string,
    input: CalendarTaskInput,
    t: TFunction,
): Promise<Result<CalendarTask>> {
    try {
        const response = await getHttpClient().put<CalendarTask>(`/calendar/tasks/${id}`, input);
        return { success: response.data };
    } catch (e) {
        return fail(e, t);
    }
}

export async function deleteCalendarTask(id: string, t: TFunction): Promise<Result<true>> {
    try {
        await getHttpClient().delete(`/calendar/tasks/${id}`);
        return { success: true };
    } catch (e) {
        return fail(e, t);
    }
}

/** Completes the task, or un-completes a completed one. The XP moves either way. */
export async function toggleCalendarTask(
    id: string,
    t: TFunction,
): Promise<Result<CalendarTaskCompletion>> {
    try {
        const response = await getHttpClient().put<CalendarTaskCompletion>(
            `/calendar/tasks/${id}/complete`,
        );
        return { success: response.data };
    } catch (e) {
        return fail(e, t);
    }
}

/**
 * Tells the server the person saw the reminder (they clicked the notification), which is what
 * stops the email fallback. Idempotent.
 */
export async function acknowledgeCalendarTask(id: string, t: TFunction): Promise<Result<true>> {
    try {
        await getHttpClient().post(`/calendar/tasks/${id}/ack`);
        return { success: true };
    } catch (e) {
        return fail(e, t);
    }
}

/**
 * The reminders the browser should show: uncompleted, unacknowledged tasks whose `notifyAt` lies
 * between an hour ago and a day from now, soonest first.
 */
export async function getUpcomingCalendarTasks(t: TFunction): Promise<Result<CalendarTask[]>> {
    try {
        const response = await getHttpClient().get<CalendarTask[]>('/calendar/tasks/upcoming');
        return { success: response.data };
    } catch (e) {
        return fail(e, t);
    }
}
