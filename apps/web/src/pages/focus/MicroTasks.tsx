import { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import { Pin, PinOff, Plus, X } from "lucide-react";
import type { RootState } from "@beyou/state/rootReducer";
import {
    MICRO_TASK_MAX_LENGTH,
    isMicroTaskDone,
    microTaskRemoved,
    microTaskUpserted,
    microTasksLoaded,
    normalizeMicroTaskName,
} from "@beyou/state";
import {
    addFocusMicroTask,
    deleteFocusMicroTask,
    listFocusMicroTasks,
    pinFocusMicroTask,
    toggleFocusMicroTask,
} from "@beyou/api/focus/focusApi";
import { getFriendlyErrorMessage } from "@beyou/api/apiError";
import { notify } from "../../lib/notify";

/**
 * The small things done alongside ONE routine item, under the timer where the reference puts them.
 *
 * Server-owned since F6, and scoped to the item on the user's specification: switching items
 * switches lists. A pinned name shows up on the new item because the server materialised a row for
 * it there on the read — this component never copies anything across.
 *
 * Every mutation goes to the server and the response is what lands in the slice. There is no
 * optimistic write: a break checklist is not latency-critical, and a row the server refused should
 * not linger on screen looking saved.
 */
export default function MicroTasks({ itemGroupId }: { itemGroupId: string }) {
    const { t } = useTranslation();
    const dispatch = useDispatch();
    const tasks = useSelector((state: RootState) => state.focus.microTasks?.[itemGroupId]) ?? [];

    const [draft, setDraft] = useState("");
    const [adding, setAdding] = useState(false);
    const [busy, setBusy] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    // Read whenever the item changes. This is the read that also materialises the pinned ones.
    useEffect(() => {
        let active = true;
        listFocusMicroTasks(itemGroupId, t).then((result) => {
            if (!active) return;
            if (result.success) dispatch(microTasksLoaded({ itemGroupId, tasks: result.success }));
            else if (result.error) notify.error(getFriendlyErrorMessage(t, result.error));
        });
        return () => {
            active = false;
        };
    }, [itemGroupId, dispatch, t]);

    useEffect(() => {
        if (adding) inputRef.current?.focus();
    }, [adding]);

    const submit = async () => {
        const name = normalizeMicroTaskName(draft);
        if (!name) {
            setAdding(false);
            return;
        }
        setBusy(true);
        const result = await addFocusMicroTask({ itemGroupId, name, pinned: false }, t);
        setBusy(false);
        if (result.success) {
            dispatch(microTaskUpserted(result.success));
            setDraft("");
            // Left open: a break checklist is usually typed in a burst of two or three.
            inputRef.current?.focus();
        } else if (result.error) {
            notify.error(getFriendlyErrorMessage(t, result.error));
        }
    };

    const toggle = async (id: string) => {
        const result = await toggleFocusMicroTask(id, t);
        if (result.success) dispatch(microTaskUpserted(result.success));
        else if (result.error) notify.error(getFriendlyErrorMessage(t, result.error));
    };

    const pin = async (id: string, pinned: boolean) => {
        const result = await pinFocusMicroTask(id, pinned, t);
        if (result.success) dispatch(microTaskUpserted(result.success));
        else if (result.error) notify.error(getFriendlyErrorMessage(t, result.error));
    };

    const remove = async (id: string) => {
        const result = await deleteFocusMicroTask(id, t);
        if (result.error) notify.error(getFriendlyErrorMessage(t, result.error));
        else dispatch(microTaskRemoved({ itemGroupId, id }));
    };

    return (
        <div data-testid="focus-micro-tasks">
            <h3 className="text-[12.5px] font-semibold uppercase tracking-[0.06em] text-text-3">
                {t("FocusTasks")}
            </h3>

            <ul className="mt-1.5 flex flex-col gap-1">
                {tasks.map((task) => {
                    const done = isMicroTaskDone(task);
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
                                    onChange={() => toggle(task.id)}
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
                                onClick={() => pin(task.id, !task.pinned)}
                                aria-label={task.pinned ? t("FocusStopKeepingTask") : t("FocusKeepTask")}
                                title={task.pinned ? t("FocusKeepTaskHint") : t("FocusKeepTask")}
                                aria-pressed={task.pinned}
                                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-control transition-colors hover:bg-surface-2 ${
                                    task.pinned ? "text-accent" : "text-text-3"
                                }`}
                                data-testid={`focus-micro-task-pin-${task.id}`}
                            >
                                {task.pinned ? <Pin size={14} aria-hidden="true" /> : <PinOff size={14} aria-hidden="true" />}
                            </button>

                            <button
                                type="button"
                                onClick={() => remove(task.id)}
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
                <input
                    ref={inputRef}
                    value={draft}
                    maxLength={MICRO_TASK_MAX_LENGTH}
                    disabled={busy}
                    onChange={(event) => setDraft(event.target.value)}
                    onKeyDown={(event) => {
                        if (event.key === "Enter") void submit();
                        if (event.key === "Escape") {
                            setDraft("");
                            setAdding(false);
                        }
                    }}
                    onBlur={() => void submit()}
                    placeholder={t("FocusTaskPlaceholder")}
                    className="mt-1.5 h-10 w-full rounded-control border border-border bg-surface px-2.5 text-[13px] text-text"
                    data-testid="focus-micro-task-input"
                />
            ) : (
                <button
                    type="button"
                    onClick={() => setAdding(true)}
                    className="mt-1.5 flex h-10 w-full items-center justify-center gap-2 rounded-control border border-dashed border-border text-[13px] font-medium text-text-2 transition-colors hover:bg-surface-2 hover:text-text"
                    data-testid="focus-micro-task-add"
                >
                    <Plus size={15} aria-hidden="true" />
                    {t("FocusAddTask")}
                </button>
            )}

            {tasks.length === 0 && !adding && (
                <p className="mt-2 text-center text-[12px] text-text-3">{t("FocusTasksEmpty")}</p>
            )}
        </div>
    );
}
