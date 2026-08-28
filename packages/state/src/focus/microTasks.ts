/**
 * The small things done between cycles.
 *
 * From the backlog card this phase came from: "pequenas tasks durante os breaks do pomodoro e
 * durante o tempo normal", in two kinds — standing ones and one-off ones.
 *
 * Deliberately NOT Beyou `Task` entities, which reverses decision 5 in the plan. That decision was
 * mine to propose and I framed it as a binary (new entity vs reuse `Task`), missing the option the
 * app already uses for this class of data. Reusing `Task` costs more than it saves:
 * `CreateTaskRequestDTO` requires `iconId`, `importance` and `difficulty` (1 to 5, both
 * `@NotNull`), so "stretch" would need an invented icon and two invented numbers; and it would
 * then be a first-class task on the Tasks page, pickable into routines and carrying XP. A break
 * filler is not that.
 *
 * So they live where the app already keeps per-person, per-device focus state: the slice, with the
 * standing ones mirrored to localStorage on web and SecureStore on native, exactly as
 * `beyou-routine-collapsed` and `beyou.tutorial.phase` do. F6 is where they reach the server,
 * which is what the user asked F6 to persist alongside the sessions themselves.
 */

export type MicroTask = {
    /** Assigned by the reducer from a counter, so nothing here needs crypto or a uuid package. */
    id: string;
    name: string;
    /**
     * Standing, rather than for this visit only.
     *
     * Pinned ones survive leaving the screen and restarting the app; the rest are gone when the
     * visit ends. Adding defaults to NOT pinned: a list that silently accumulates forever is the
     * worse failure of the two, and pinning is one tap away on the row.
     */
    pinned: boolean;
    /**
     * The user's local day this was ticked, or null.
     *
     * A date rather than a boolean so a pinned task comes back fresh tomorrow, which is how every
     * other checkable thing in Beyou behaves. Nothing has to reset it: "done" is a comparison.
     */
    doneOn: string | null;
};

/**
 * How many the list holds.
 *
 * Not arbitrary: the native side keeps the pinned ones in ONE SecureStore value, which caps at
 * around 2048 bytes — the routine-collapsed map already had to be pruned for exactly this reason.
 * Twenty short names fit with room to spare, and a break checklist longer than twenty is not a
 * break checklist.
 */
export const MAX_MICRO_TASKS = 20;

/** Trimmed, and bounded so one line cannot fill the storage value on its own. */
export const MICRO_TASK_MAX_LENGTH = 80;

export const normalizeMicroTaskName = (name: string): string =>
    name.trim().slice(0, MICRO_TASK_MAX_LENGTH);

/** Done for the day in question. A pinned task from yesterday reads as not done. */
export const isMicroTaskDone = (task: MicroTask, date: string): boolean => task.doneOn === date;

/** What gets written to storage: the standing ones, without a stale tick from another day. */
export function persistableMicroTasks(tasks: MicroTask[], date: string): MicroTask[] {
    return tasks
        .filter((task) => task.pinned)
        .map((task) => ({ ...task, doneOn: task.doneOn === date ? date : null }));
}

/**
 * One to suggest during a break, or null.
 *
 * The first standing one still open, falling back to any open one. Suggesting, never assigning:
 * the epic's rule about the clock applies here too, and a break that hands out homework is not a
 * break.
 */
export function suggestMicroTask(tasks: MicroTask[], date: string): MicroTask | null {
    const open = tasks.filter((task) => !isMicroTaskDone(task, date));
    return open.find((task) => task.pinned) ?? open[0] ?? null;
}
