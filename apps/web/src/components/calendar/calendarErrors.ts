import type { ApiErrorPayload } from "@beyou/api/apiError";

/**
 * The server answers 404 `CALENDAR_TASK_NOT_FOUND` for a task that no longer exists, typically
 * because it was deleted on another device while this screen still showed it. That is not a
 * failure to repeat on every click: the screen drops the task and says why in a short toast.
 */
export function isCalendarTaskGone(error?: ApiErrorPayload | null): boolean {
    return error?.errorKey === "CALENDAR_TASK_NOT_FOUND";
}
