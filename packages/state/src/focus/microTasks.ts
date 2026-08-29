import type { FocusMicroTask } from '@beyou/types/focus/focus';

/**
 * The small things done alongside one routine item.
 *
 * F6 moved these to the server and re-scoped them, on the user's specification: a micro-task
 * belongs to a routine ITEM, not to a sitting. Changing item does not carry the list over, unless
 * the micro-task is pinned, in which case the server CREATES a row for the new item too. The client
 * therefore holds nothing but a cache of what the server said for each item, and every mutation
 * goes through the API. The F4 localStorage / SecureStore layer is gone with it.
 *
 * What lives here is only what both platforms need to agree on: the shape of that cache and the
 * pure helpers that read it.
 */
export type { FocusMicroTask };

/** The cache: one list per item group, as last returned by the server. */
export type MicroTasksByItem = Record<string, FocusMicroTask[]>;

/** Bounded so one line cannot blow past the column (varchar(80)) and get refused server-side. */
export const MICRO_TASK_MAX_LENGTH = 80;

export const normalizeMicroTaskName = (name: string): string =>
    name.trim().slice(0, MICRO_TASK_MAX_LENGTH);

export const isMicroTaskDone = (task: FocusMicroTask): boolean => task.doneAt !== null;

/**
 * One to suggest during a break, or null: the first pinned one still open, then any open one.
 * Suggesting, never assigning — a break that hands out homework is not a break.
 */
export function suggestMicroTask(tasks: FocusMicroTask[]): FocusMicroTask | null {
    const open = tasks.filter((task) => !isMicroTaskDone(task));
    return open.find((task) => task.pinned) ?? open[0] ?? null;
}
