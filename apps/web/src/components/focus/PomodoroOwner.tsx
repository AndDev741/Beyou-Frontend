import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import type { RootState } from "@beyou/state/rootReducer";
import { recordFocusCycle } from "@beyou/api/focus/focusApi";
import { pomodoroCycleCompleted, timerStatus, toServerCycleKind } from "@beyou/state";

/**
 * The one place a cycle is allowed to finish.
 *
 * `focusExited` keeps a running timer on purpose, so somebody can leave the focus screen mid-cycle
 * and come back to it. Until this existed, the effect that notices the clock crossing zero lived in
 * `usePomodoro`, which mounts only inside the Ultrafoco panel. Two consequences, both found in
 * review: a cycle that ran out while the person was on the dashboard, or had merely toggled the
 * "whole routine" pill, was never reported and never handed over — and if the day turned before
 * they came back, `focusEntered` dropped it as yesterday's and the server never heard of it.
 *
 * So the completion moved here, into the app shell, where it is mounted on every authenticated
 * route. It renders nothing. It owns exactly two things: noticing the crossing, and reporting it
 * once. `usePomodoro` keeps the display, the controls and the tab title; it no longer dispatches
 * `pomodoroCycleCompleted`, because two mounts that both did would POST the cycle twice.
 *
 * Crossing zero is derived from the clock rather than armed with a setTimeout. A timeout would not
 * survive the reload `endsAt` exists to survive, and it fires late or never in a throttled tab;
 * comparing against the wall clock cannot miss.
 */
export default function PomodoroOwner() {
    const dispatch = useDispatch();
    const { t } = useTranslation();
    const timer = useSelector((state: RootState) => state.focus.timer);
    const [now, setNow] = useState(() => Date.now());

    const status = timerStatus(timer, now);

    // One second while it runs, nothing otherwise. Cheap: it is one interval for the whole app,
    // and the panel's own tick, when the panel is mounted, is what paints the digits.
    useEffect(() => {
        if (status !== "running") return;
        const id = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(id);
    }, [status]);

    // Reported from the timer's own fields BEFORE the reducer hands over — after the dispatch,
    // `kind` is already the break. Fire-and-forget: a lost report must not stop the handover, and
    // the server never hears about a cycle that was abandoned or skipped, because `finished` is
    // set by then and this branch does not run.
    useEffect(() => {
        if (status === "elapsed" && timer && !timer.finished) {
            void recordFocusCycle(
                {
                    itemGroupId: timer.groupId || null,
                    kind: toServerCycleKind(timer.kind),
                    startedAt: new Date(timer.startedAt).toISOString(),
                    endedAt: new Date(timer.endsAt).toISOString(),
                    minutes: timer.durationMinutes,
                },
                t
            );
            dispatch(pomodoroCycleCompleted());
        }
    }, [status, timer, dispatch, t]);

    return null;
}
