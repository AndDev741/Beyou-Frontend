import { useCallback, useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import type { RootState } from "@beyou/state/rootReducer";
import {
    formatTime,
    getFocusItems,
    minutesOfDay,
    resolveFocusStart,
} from "@beyou/state";

/** How long without a pointer or a key before the screen fades itself down. */
const DIM_AFTER_MS = 25_000;
/** What it fades to. Low enough to stop being a light source, high enough to still read. */
const DIM_OPACITY = 0.32;

/**
 * Rest mode: a screen worth leaving on the desk.
 *
 * Reached by its own button rather than automatically. The plan had it entering on its own when
 * nothing was scheduled; the user asked for a button instead, available whether or not there is a
 * routine today, which is also the honest arrangement — deciding somebody is idle and taking their
 * screen is not a decision an app should make.
 *
 * Nothing here is new art. The blooms are `--accent-rgb` and `--xp-rgb` at low alpha, drifting on
 * three long offset paths, so it follows all nine themes and follows a theme change live. The
 * whole motion layer is CSS, which means the app's global `prefers-reduced-motion` block already
 * stills it — the blooms simply sit where they are, and the screen stays perfectly usable.
 *
 * The clock ticks on the MINUTE, not the second. A second hand is something to watch, and this is
 * the one screen in the app whose job is to be ignorable.
 */
export default function Descanso() {
    const { t } = useTranslation();
    const routine = useSelector((state: RootState) => state.todayRoutine.routine);
    const allHabits = useSelector((state: RootState) => state.habits.habits);
    const allTasks = useSelector((state: RootState) => state.tasks.tasks);

    const [now, setNow] = useState(() => new Date());
    const [dimmed, setDimmed] = useState(false);

    // Aligned to the next minute boundary, so the digits change when the clock does rather than up
    // to 59 seconds late.
    useEffect(() => {
        let timeout: ReturnType<typeof setTimeout>;
        const schedule = () => {
            const current = new Date();
            setNow(current);
            const msToNextMinute = 60_000 - (current.getSeconds() * 1000 + current.getMilliseconds());
            timeout = setTimeout(schedule, msToNextMinute);
        };
        schedule();
        return () => clearTimeout(timeout);
    }, []);

    const wake = useCallback(() => setDimmed(false), []);

    // Dim on quiet, wake on anything. `pointerdown` rather than `click` so the screen is already
    // bright by the time a tap lands on whatever is under it.
    useEffect(() => {
        let timer: ReturnType<typeof setTimeout>;
        const arm = () => {
            clearTimeout(timer);
            setDimmed(false);
            timer = setTimeout(() => setDimmed(true), DIM_AFTER_MS);
        };
        const events: (keyof WindowEventMap)[] = ["pointermove", "pointerdown", "keydown", "wheel"];
        events.forEach((name) => window.addEventListener(name, arm, { passive: true }));
        arm();
        return () => {
            clearTimeout(timer);
            events.forEach((name) => window.removeEventListener(name, arm));
        };
    }, []);

    /**
     * Ask the browser to keep the display on, and shrug if it says no.
     *
     * Chrome-only, needs a secure context, and refuses on a hidden tab. Every failure path is a
     * screen that dims on its own schedule, which is the pre-existing behaviour and not a bug.
     */
    useEffect(() => {
        type Sentinel = { release: () => Promise<void> };
        type WakeLock = { request: (kind: "screen") => Promise<Sentinel> };
        const lock = (navigator as Navigator & { wakeLock?: WakeLock }).wakeLock;
        if (!lock) return;

        let sentinel: Sentinel | null = null;
        let released = false;
        lock.request("screen")
            .then((granted) => {
                if (released) {
                    void granted.release();
                    return;
                }
                sentinel = granted;
            })
            .catch(() => {
                /* refused, or the tab is not visible: nothing to do */
            });

        return () => {
            released = true;
            void sentinel?.release().catch(() => {});
        };
    }, []);

    /** The next thing with a time, when there is one. Read-only: rest never checks anything. */
    const next = useMemo(() => {
        const items = getFocusItems(routine);
        if (items.length === 0) return null;
        const today = new Date().toJSON().slice(0, 10);
        const resolved = resolveFocusStart(items, minutesOfDay(now), today);
        if (resolved.index < 0) return null;
        const item = items[resolved.index];
        const found =
            item.type === "habit"
                ? allHabits?.find((habit) => habit.id === item.itemId)
                : allTasks?.find((task) => task.id === item.itemId);
        return { name: found?.name ?? item.itemId, startTime: item.startTime, reason: resolved.reason };
    }, [routine, allHabits, allTasks, now]);

    const clock = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

    return (
        <div
            onPointerDown={wake}
            className="relative flex min-h-[60vh] flex-1 items-center justify-center overflow-hidden rounded-card"
            style={{ opacity: dimmed ? DIM_OPACITY : 1, transition: "opacity 1.4s ease-in-out" }}
            data-testid="focus-descanso"
            data-dimmed={dimmed}
        >
            {/* Behind everything and inert: the blooms are decoration and must never eat a tap. */}
            <div className="pointer-events-none absolute inset-0" aria-hidden="true">
                <div className="rest-bloom rest-bloom-a left-[-10%] top-[-15%] h-[55%] w-[70%]" />
                <div className="rest-bloom rest-bloom-b bottom-[-20%] right-[-10%] h-[60%] w-[65%]" />
                <div className="rest-bloom rest-bloom-c left-[25%] top-[30%] h-[45%] w-[50%]" />
            </div>

            <div className="relative flex flex-col items-center px-4 text-center">
                <p
                    className="animate-rest-breathe font-mono text-[76px] font-bold leading-none tabular-nums text-text lg:text-[112px]"
                    data-testid="focus-descanso-clock"
                >
                    {clock}
                </p>

                {next ? (
                    <div className="mt-4" data-testid="focus-descanso-next">
                        <p className="text-sm font-medium text-text-2">{next.name}</p>
                        {next.startTime && next.reason !== "order" && (
                            <p className="mt-0.5 font-mono text-[12.5px] text-text-3">
                                {t("FocusNextAt", { time: formatTime(next.startTime) })}
                            </p>
                        )}
                    </div>
                ) : (
                    <p className="mt-4 text-sm text-text-3" data-testid="focus-descanso-empty">
                        {t("FocusRestNothingScheduled")}
                    </p>
                )}

                {dimmed && (
                    <p className="mt-6 text-[12px] text-text-3" data-testid="focus-descanso-hint">
                        {t("FocusRestHint")}
                    </p>
                )}
            </div>
        </div>
    );
}
