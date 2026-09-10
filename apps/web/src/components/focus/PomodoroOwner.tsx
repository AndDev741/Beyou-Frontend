import { useCallback, useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import type { RootState } from "@beyou/state/rootReducer";
import { recordFocusCycle } from "@beyou/api/focus/focusApi";
import {
    CYCLE_LABEL_KEY,
    DEFAULT_POMODORO_SETTINGS,
    pomodoroCycleCompleted,
    timerStatus,
    toServerCycleKind,
    type FocusTimer,
} from "@beyou/state";
import { notifyCycleEnd, playCycleEndSound } from "./notifyCycleEnd";

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
 *
 * The alert (beep and browser notification) is the one thing here that DOES get a timeout, in
 * addition to the clock. The last effect in the component says why.
 */

/** Past this, an ending is reported and handed over in silence. */
const STALE_ALERT_MS = 5 * 60_000;

export default function PomodoroOwner() {
    const dispatch = useDispatch();
    const { t } = useTranslation();
    const timer = useSelector((state: RootState) => state.focus.timer);
    // Falls back for the same reason `usePomodoro` does: a persisted slice from before these
    // fields existed rehydrates them as undefined, and the first render reads them before the
    // migration is proven to have run.
    const settings =
        useSelector((state: RootState) => state.focus.settings) ?? DEFAULT_POMODORO_SETTINGS;
    const [now, setNow] = useState(() => Date.now());

    const status = timerStatus(timer, now);

    // One second while it runs, nothing otherwise. Cheap: it is one interval for the whole app,
    // and the panel's own tick, when the panel is mounted, is what paints the digits.
    useEffect(() => {
        if (status !== "running") return;
        const id = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(id);
    }, [status]);

    /**
     * `startedAt` of the last cycle alerted. Two paths can notice the same ending (the interval
     * reading the clock, and the timeout armed below), and the person must hear one beep. The
     * reducer's `finished` flag cannot serve as the guard here because the timeout can land before
     * the tick that sets it. `startedAt` is frozen across pause and resume, so a resumed cycle is
     * still the same cycle.
     */
    const alertedStartedAt = useRef<number | null>(null);

    const alertCycleEnd = useCallback(
        (ended: FocusTimer) => {
            if (alertedStartedAt.current === ended.startedAt) return;
            alertedStartedAt.current = ended.startedAt;
            // A cycle noticed long after it ran out (the tab was closed, the laptop slept) is old
            // news. The handover still happens; a beep about it would only confuse.
            if (Date.now() - ended.endsAt > STALE_ALERT_MS) return;
            if (settings.soundEnabled) playCycleEndSound(ended.kind);
            if (settings.notifyEnabled) {
                notifyCycleEnd({
                    title: t(CYCLE_LABEL_KEY[ended.kind]),
                    body: t(ended.kind === "pomodoro" ? "FocusPomodoroEnded" : "FocusBreakEnded"),
                });
            }
        },
        [settings.soundEnabled, settings.notifyEnabled, t]
    );

    // Reported from the timer's own fields BEFORE the reducer hands over — after the dispatch,
    // `kind` is already the break. Fire-and-forget: a lost report must not stop the handover, and
    // the server never hears about a cycle that was abandoned or skipped, because `finished` is
    // set by then and this branch does not run. The alert rides the same guard, so a skip never
    // beeps either.
    useEffect(() => {
        if (status === "elapsed" && timer && !timer.finished) {
            alertCycleEnd(timer);
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
    }, [status, timer, dispatch, t, alertCycleEnd]);

    /**
     * A timeout to `endsAt`, for the ALERT only.
     *
     * Browsers throttle a background tab's timers to about once a minute, and the beep exists for
     * the background tab. Left to the interval, it lands up to a minute late, which for a five
     * minute break is a quarter of the break. A single timeout aimed at the exact moment fires on
     * time in Chrome and Firefox (the intensive throttling exempts a timer that has not chained),
     * and where it does not, the interval still catches the crossing a little later and the
     * guard above keeps it to one beep.
     *
     * Only the alert lives here. The handover stays derived from the clock in the effect above;
     * the timeout only nudges `now` so that effect runs promptly instead of waiting for the next
     * throttled tick. Re-armed when `endsAt` moves (a resume), taken back on pause, stop, skip and
     * unmount by the cleanup.
     */
    const endsAt = timer?.endsAt;
    useEffect(() => {
        if (status !== "running" || !timer || endsAt === undefined) return;
        const delay = Math.max(0, endsAt - Date.now());
        const id = setTimeout(() => {
            alertCycleEnd(timer);
            setNow(Date.now());
        }, delay);
        return () => clearTimeout(id);
    }, [status, timer, endsAt, alertCycleEnd]);

    return null;
}
