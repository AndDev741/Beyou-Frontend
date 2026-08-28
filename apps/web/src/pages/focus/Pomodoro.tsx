import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Pause, Play, Square } from "lucide-react";
import {
    BREAK_DEFAULT_MINUTES,
    MAX_CYCLE_MINUTES,
    MIN_CYCLE_MINUTES,
    suggestedMinutes,
    type FocusItem,
} from "@beyou/state";
import { usePomodoro } from "./usePomodoro";

/**
 * The timer, under the item it belongs to.
 *
 * Two rules shape it, both from the epic:
 *
 * The duration is pre-filled from the item's own window and stays editable. Routine items
 * carry `startTime` and `endTime`, so a scheduled item already says how long its owner meant
 * it to take; a LIST item has no window and gets the classic 25. Either way it is a
 * suggestion in a field, never a constraint, and the timer runs on any item at any hour.
 *
 * There is no failure state. Nothing here says a cycle was missed, expired or lost. A finished
 * cycle hands over to a break the person has to start, stopping is a plain "Stop" with no
 * consequence, and only finished WORK cycles are counted.
 */
export default function Pomodoro({ item, date }: { item: FocusItem; date: string }) {
    const { t } = useTranslation();
    const {
        status,
        formatted,
        cycles,
        kind,
        start,
        pause,
        resume,
        stop,
    } = usePomodoro(item.groupId, date);

    // Pre-filled per item, and re-offered when the person moves to another one. Their own typed
    // value survives while they stay put, which is why this is keyed on the group id rather
    // than reset on every render.
    const [minutes, setMinutes] = useState(() => suggestedMinutes(item));
    useEffect(() => {
        setMinutes(suggestedMinutes(item));
    }, [item.groupId]); // eslint-disable-line react-hooks/exhaustive-deps

    /**
     * One timer at a time, shown wherever the person is in the focus session.
     *
     * It deliberately does NOT hide itself when the selected item is not the timer's own.
     * Hiding it meant the start control reappeared on the next item, and pressing it replaced
     * a cycle somebody was 18 minutes into, silently. Showing the running cycle everywhere
     * removes that whole hazard: to start another one you stop this one first, on purpose.
     */
    const idle = status === "idle";

    return (
        <div
            className="rounded-card border border-border bg-surface px-4 py-4"
            data-testid="focus-pomodoro"
        >
            {idle ? (
                <div className="flex flex-wrap items-center justify-center gap-2.5">
                    <label className="flex items-center gap-2 text-[12.5px] text-text-2">
                        {t("FocusCycleMinutes")}
                        <input
                            type="number"
                            min={MIN_CYCLE_MINUTES}
                            max={MAX_CYCLE_MINUTES}
                            value={minutes}
                            onChange={(event) => setMinutes(Number(event.target.value))}
                            className="h-10 w-20 rounded-control border border-border bg-bg px-2.5 text-center font-mono text-text"
                            data-testid="focus-pomodoro-minutes"
                        />
                    </label>
                    <button
                        type="button"
                        onClick={() => start(minutes)}
                        className="inline-flex h-10 items-center gap-2 rounded-control bg-accent px-4 text-sm font-semibold text-on-accent transition-opacity hover:opacity-90"
                        data-testid="focus-pomodoro-start"
                    >
                        <Play size={15} aria-hidden="true" />
                        {t("FocusStartCycle")}
                    </button>
                </div>
            ) : status === "elapsed" ? (
                <div className="flex flex-col items-center gap-3">
                    {/* Said neutrally. A cycle that ran out is a cycle that ran. */}
                    <p className="text-sm font-semibold text-text" data-testid="focus-pomodoro-done">
                        {t("FocusCycleDone")}
                    </p>
                    <div className="flex items-center gap-2.5">
                        <button
                            type="button"
                            onClick={() =>
                                start(
                                    kind === "break" ? BREAK_DEFAULT_MINUTES : minutes,
                                    kind
                                )
                            }
                            className="inline-flex h-10 items-center gap-2 rounded-control bg-accent px-4 text-sm font-semibold text-on-accent transition-opacity hover:opacity-90"
                            data-testid="focus-pomodoro-next"
                        >
                            <Play size={15} aria-hidden="true" />
                            {kind === "break" ? t("FocusStartBreak") : t("FocusStartWork")}
                        </button>
                        <StopButton onClick={stop} label={t("FocusStop")} />
                    </div>
                </div>
            ) : (
                <div className="flex flex-col items-center gap-3">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-text-3">
                        {kind === "break" ? t("FocusBreakCycle") : t("FocusWorkCycle")}
                    </span>
                    <span
                        className={`font-mono text-4xl font-semibold tabular-nums lg:text-5xl ${
                            status === "paused" ? "text-text-3" : "text-text"
                        }`}
                        data-testid="focus-pomodoro-remaining"
                    >
                        {formatted}
                    </span>
                    <div className="flex items-center gap-2.5">
                        {status === "paused" ? (
                            <button
                                type="button"
                                onClick={resume}
                                className="inline-flex h-10 items-center gap-2 rounded-control bg-accent px-4 text-sm font-semibold text-on-accent transition-opacity hover:opacity-90"
                                data-testid="focus-pomodoro-resume"
                            >
                                <Play size={15} aria-hidden="true" />
                                {t("FocusResume")}
                            </button>
                        ) : (
                            <button
                                type="button"
                                onClick={pause}
                                className="inline-flex h-10 items-center gap-2 rounded-control border border-border px-4 text-sm font-medium text-text-2 transition-colors hover:bg-surface-2 hover:text-text"
                                data-testid="focus-pomodoro-pause"
                            >
                                <Pause size={15} aria-hidden="true" />
                                {t("FocusPause")}
                            </button>
                        )}
                        <StopButton onClick={stop} label={t("FocusStop")} />
                    </div>
                </div>
            )}

            {cycles > 0 && (
                <p
                    className="mt-3 text-center text-[12px] text-text-3"
                    data-testid="focus-pomodoro-cycles"
                >
                    {t("FocusCyclesToday", { count: cycles })}
                </p>
            )}
        </div>
    );
}

/** Plain and quiet. Stopping has no consequence, so it does not get a danger colour. */
function StopButton({ onClick, label }: { onClick: () => void; label: string }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className="inline-flex h-10 items-center gap-2 rounded-control border border-border px-3.5 text-sm font-medium text-text-2 transition-colors hover:bg-surface-2 hover:text-text"
            data-testid="focus-pomodoro-stop"
        >
            <Square size={14} aria-hidden="true" />
            {label}
        </button>
    );
}
