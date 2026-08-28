import { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import { Pin, PinOff, Plus, X } from "lucide-react";
import type { RootState } from "@beyou/state/rootReducer";
import {
    MAX_MICRO_TASKS,
    MICRO_TASK_MAX_LENGTH,
    isMicroTaskDone,
    microTaskAdded,
    microTaskPinToggled,
    microTaskRemoved,
    microTaskToggled,
    microTasksHydrated,
} from "@beyou/state";
import { loadMicroTasks, saveMicroTasks } from "../../lib/microTasks";

/**
 * The small things done between cycles, under the timer where the reference design puts them.
 *
 * Two kinds, from the backlog card: standing ones and one-off ones. Adding makes a ONE-OFF, and
 * pinning is a separate tap on the row. That way typing something in a break costs one field and
 * one Enter, and nothing silently accumulates forever — which is the worse of the two failures.
 *
 * A pinned task's tick is a DATE, not a boolean, so it comes back fresh tomorrow like every other
 * checkable thing in Beyou. Nothing has to reset it.
 */
export default function MicroTasks({ date }: { date: string }) {
    const { t } = useTranslation();
    const dispatch = useDispatch();
    /**
     * Falls back, for the same load-bearing reason the pomodoro settings do: this slice is
     * persisted, and redux-persist replaces a stored slice wholesale rather than merging it into
     * the reducer's initial state. A browser holding the shape from before micro-tasks existed
     * reads this as `undefined` on the first render. The store's migration repairs those browsers;
     * this is what stops the next added field white-screening the app in the meantime.
     *
     * Not hypothetical: the stale-shape test written for the reported `settings` crash caught this
     * exact omission the moment micro-tasks landed.
     */
    const tasks = useSelector((state: RootState) => state.focus.microTasks) ?? [];

    const [draft, setDraft] = useState("");
    const [adding, setAdding] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    // Read the standing ones once, on mount. Merged rather than replacing, so a one-off typed
    // before this resolved is not swallowed by it.
    useEffect(() => {
        dispatch(microTasksHydrated(loadMicroTasks()));
    }, [dispatch]);

    // Mirrored back on every change. Only the pinned ones are written; see the storage module.
    useEffect(() => {
        saveMicroTasks(tasks, date);
    }, [tasks, date]);

    useEffect(() => {
        if (adding) inputRef.current?.focus();
    }, [adding]);

    const full = tasks.length >= MAX_MICRO_TASKS;

    const submit = () => {
        const name = draft.trim();
        if (!name) {
            setAdding(false);
            return;
        }
        dispatch(microTaskAdded(name));
        setDraft("");
        // Left open: a break checklist is usually typed in a burst of two or three.
        inputRef.current?.focus();
    };

    return (
        <div data-testid="focus-micro-tasks">
            <h3 className="text-[12.5px] font-semibold uppercase tracking-[0.06em] text-text-3">
                {t("FocusTasks")}
            </h3>

            <ul className="mt-1.5 flex flex-col gap-1">
                {tasks.map((task) => {
                    const done = isMicroTaskDone(task, date);
                    return (
                        <li
                            key={task.id}
                            className="flex items-center gap-2 rounded-control border border-border bg-surface px-2.5 py-1.5"
                            data-testid={`focus-micro-task-${task.id}`}
                        >
                            <label className="flex min-w-0 flex-1 items-center gap-2.5">
                                <input
                                    type="checkbox"
                                    checked={done}
                                    onChange={() =>
                                        dispatch(microTaskToggled({ id: task.id, date }))
                                    }
                                    className="h-4 w-4 shrink-0 accent-accent"
                                    data-testid={`focus-micro-task-check-${task.id}`}
                                />
                                <span
                                    className={`min-w-0 flex-1 truncate text-[13px] ${
                                        done ? "text-text-3 line-through" : "text-text"
                                    }`}
                                >
                                    {task.name}
                                </span>
                            </label>

                            <button
                                type="button"
                                onClick={() => dispatch(microTaskPinToggled(task.id))}
                                aria-label={
                                    task.pinned ? t("FocusStopKeepingTask") : t("FocusKeepTask")
                                }
                                title={task.pinned ? t("FocusStopKeepingTask") : t("FocusKeepTask")}
                                aria-pressed={task.pinned}
                                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-control transition-colors hover:bg-surface-2 ${
                                    task.pinned ? "text-accent" : "text-text-3"
                                }`}
                                data-testid={`focus-micro-task-pin-${task.id}`}
                            >
                                {task.pinned ? (
                                    <Pin size={14} aria-hidden="true" />
                                ) : (
                                    <PinOff size={14} aria-hidden="true" />
                                )}
                            </button>

                            <button
                                type="button"
                                onClick={() => dispatch(microTaskRemoved(task.id))}
                                aria-label={t("FocusRemoveTask")}
                                title={t("FocusRemoveTask")}
                                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-control text-text-3 transition-colors hover:bg-surface-2 hover:text-text"
                                data-testid={`focus-micro-task-remove-${task.id}`}
                            >
                                <X size={14} aria-hidden="true" />
                            </button>
                        </li>
                    );
                })}
            </ul>

            {adding ? (
                <div className="mt-1.5 flex items-center gap-2">
                    <input
                        ref={inputRef}
                        value={draft}
                        maxLength={MICRO_TASK_MAX_LENGTH}
                        onChange={(event) => setDraft(event.target.value)}
                        onKeyDown={(event) => {
                            if (event.key === "Enter") submit();
                            if (event.key === "Escape") {
                                setDraft("");
                                setAdding(false);
                            }
                        }}
                        onBlur={submit}
                        placeholder={t("FocusTaskPlaceholder")}
                        className="h-10 flex-1 rounded-control border border-border bg-surface px-2.5 text-[13px] text-text"
                        data-testid="focus-micro-task-input"
                    />
                </div>
            ) : (
                <button
                    type="button"
                    onClick={() => setAdding(true)}
                    disabled={full}
                    className="mt-1.5 flex h-10 w-full items-center justify-center gap-2 rounded-control border border-dashed border-border text-[13px] font-medium text-text-2 transition-colors hover:bg-surface-2 hover:text-text disabled:cursor-not-allowed disabled:opacity-60"
                    data-testid="focus-micro-task-add"
                >
                    <Plus size={15} aria-hidden="true" />
                    {full ? t("FocusTasksFull") : t("FocusAddTask")}
                </button>
            )}

            {tasks.length === 0 && !adding && (
                <p className="mt-2 text-center text-[12px] text-text-3">{t("FocusTasksEmpty")}</p>
            )}
        </div>
    );
}
