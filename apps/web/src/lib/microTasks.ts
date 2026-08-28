import type { MicroTask } from "@beyou/state";
import { MAX_MICRO_TASKS, persistableMicroTasks } from "@beyou/state";

/**
 * The standing micro-tasks, on this browser.
 *
 * localStorage rather than the server, which is the divergence from decision 5 in the plan: a
 * break filler like "stretch" is not worth a Beyou `Task` (whose DTO demands an icon, an
 * importance and a difficulty, and which would then live on the Tasks page carrying XP). This is
 * the same class of data as `beyou-routine-collapsed`, and it is kept the same way. F6 is where it
 * reaches the server, alongside the focus sessions the user asked that phase to persist.
 *
 * Per-device until then, and every call fails soft: with no storage the list simply lasts for the
 * session, which is exactly what an unpinned micro-task does anyway.
 */
const KEY = "beyou-focus-micro-tasks";

export function loadMicroTasks(): MicroTask[] {
    try {
        const raw = localStorage.getItem(KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return [];
        // Validated field by field: this is user-editable storage, and a half-written entry must
        // not reach the reducer and crash a render.
        return parsed
            .filter(
                (entry): entry is MicroTask =>
                    Boolean(entry) &&
                    typeof entry.id === "string" &&
                    typeof entry.name === "string" &&
                    entry.name.length > 0
            )
            .map((entry) => ({
                id: entry.id,
                name: entry.name,
                pinned: true,
                doneOn: typeof entry.doneOn === "string" ? entry.doneOn : null,
            }))
            .slice(0, MAX_MICRO_TASKS);
    } catch {
        return [];
    }
}

/** Best-effort. Writes only the standing ones, without a tick from another day. */
export function saveMicroTasks(tasks: MicroTask[], date: string): void {
    try {
        localStorage.setItem(KEY, JSON.stringify(persistableMicroTasks(tasks, date)));
    } catch {
        /* storage unavailable or full: the list lasts for this session */
    }
}
