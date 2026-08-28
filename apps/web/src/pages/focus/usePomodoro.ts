import { useCallback, useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import type { RootState } from "@beyou/state/rootReducer";
import {
    cycleSelected,
    formatRemaining,
    pomodoroAbandoned,
    pomodoroCycleCompleted,
    pomodoroNumber,
    pomodoroPaused,
    pomodoroResumed,
    pomodoroSettingsChanged,
    pomodoroStarted,
    remainingMs,
    timerStatus,
    type CycleKind,
    type PomodoroSettings,
} from "@beyou/state";

/**
 * The pomodoro, ticking.
 *
 * The native twin is `apps/mobile/src/focus/usePomodoro.ts`, per-app for the same reason as
 * `useFocusSelection`: `@beyou/state` holds no React. Everything that decides anything is
 * shared — the reducer, `remainingMs`, `timerStatus`, `formatRemaining`, `nextCycleKind` — and
 * what is written twice is the interval and the platform's own side effects.
 *
 * Nothing counts down in a variable. The tick exists only to re-render; the number it displays
 * is always `endsAt` minus the wall clock. That is what survives a throttled background tab,
 * a sleeping laptop, and a reload.
 */
export function usePomodoro(groupId: string | null, date: string) {
    const dispatch = useDispatch();
    const { t } = useTranslation();
    const timer = useSelector((state: RootState) => state.focus.timer);
    const selectedCycle = useSelector((state: RootState) => state.focus.selectedCycle);
    const settings = useSelector((state: RootState) => state.focus.settings);
    const [now, setNow] = useState(() => Date.now());

    const status = timerStatus(timer, now);
    const remaining = remainingMs(timer, now);

    // One second while it runs, and nothing at all otherwise: an idle or paused screen has no
    // reason to wake up 60 times a minute.
    useEffect(() => {
        if (status !== "running") return;
        const id = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(id);
    }, [status]);

    // Crossing zero is noticed here rather than by a setTimeout armed at start time. A timeout
    // would not survive the reload that `endsAt` exists to survive, and it fires late or never
    // in a throttled tab; deriving the state from the clock cannot miss.
    useEffect(() => {
        if (status === "elapsed" && timer && !timer.finished) {
            dispatch(pomodoroCycleCompleted());
        }
    }, [status, timer, dispatch]);

    // The tab title carries the countdown, so the cycle is readable from another tab. Restored
    // on cleanup, including when the component unmounts mid-cycle.
    useEffect(() => {
        if (status !== "running") return;
        const original = document.title;
        document.title = `${formatRemaining(remaining)} · ${t("FocusTitle")}`;
        return () => {
            document.title = original;
        };
    }, [status, remaining, t]);

    // Closing the tab on a running cycle asks first. Browsers show their own wording and ignore
    // ours, which is why the string is not translated here.
    useEffect(() => {
        if (status !== "running") return;
        const onBeforeUnload = (event: BeforeUnloadEvent) => {
            event.preventDefault();
            event.returnValue = "";
        };
        window.addEventListener("beforeunload", onBeforeUnload);
        return () => window.removeEventListener("beforeunload", onBeforeUnload);
    }, [status]);

    const start = useCallback(
        (kind: CycleKind, minutes: number) => {
            if (!groupId) return;
            dispatch(pomodoroStarted({ groupId, kind, minutes, now: Date.now(), date }));
            setNow(Date.now());
        },
        [dispatch, groupId, date]
    );

    return {
        timer,
        status,
        remaining,
        formatted: formatRemaining(remaining),
        /** The tab showing, which is a different question from what is running. */
        selectedCycle,
        settings,
        /** Pomodoros finished on this item. A break never counts, and neither does a stop. */
        cycles: timer?.completedCycles ?? 0,
        /** Which pomodoro the person is on, counting from one. What the `#N` line shows. */
        number: pomodoroNumber(timer?.completedCycles ?? 0),
        /** What is actually running, or the tab's cycle when nothing is. */
        runningCycle: timer?.kind ?? selectedCycle,
        selectCycle: useCallback((kind: CycleKind) => dispatch(cycleSelected(kind)), [dispatch]),
        changeSettings: useCallback(
            (patch: Partial<PomodoroSettings>) => dispatch(pomodoroSettingsChanged(patch)),
            [dispatch]
        ),
        start,
        pause: useCallback(() => dispatch(pomodoroPaused({ now: Date.now() })), [dispatch]),
        /**
         * Refreshes `now` alongside the dispatch, exactly as `start` does.
         *
         * Without it the display was briefly wrong and wrong in the alarming direction: resume
         * recomputes `endsAt` from the current clock while the hook's `now` was still whatever
         * the interval last wrote before the pause, so a 24:00 cycle resumed after twenty minutes
         * away rendered 44:00 until the next tick.
         */
        resume: useCallback(() => {
            dispatch(pomodoroResumed({ now: Date.now() }));
            setNow(Date.now());
        }, [dispatch]),
        stop: useCallback(() => dispatch(pomodoroAbandoned()), [dispatch]),
    };
}
