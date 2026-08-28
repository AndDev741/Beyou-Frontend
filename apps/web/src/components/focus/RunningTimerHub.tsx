import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import { Pause, Timer } from "lucide-react";
import type { RootState } from "@beyou/state/rootReducer";
import { CYCLE_LABEL_KEY, formatRemaining, remainingMs, timerStatus } from "@beyou/state";

/**
 * The floating "a cycle is still running" hub.
 *
 * It closes a gap F3 deliberately left open. `focusExited` keeps the timer on purpose, so leaving
 * the focus screen mid-cycle does not kill a pomodoro somebody is 18 minutes into — but until now
 * nothing said so and nothing led back. A timer running invisibly is worse than no timer at all.
 *
 * Read-only, and that matters. It shows the clock and links back; it does NOT dispatch the
 * cycle-completion that `usePomodoro` owns, so the two never race and there is no second place
 * arming keep-awake or a notification.
 *
 * Mounted in the app shell, so it rides every authenticated route. Hidden on `/focus` itself,
 * where the real panel is already on screen, and renders nothing at all when no cycle is live.
 */
export default function RunningTimerHub() {
    const { t } = useTranslation();
    const { pathname } = useLocation();
    const timer = useSelector((state: RootState) => state.focus.timer);
    const [now, setNow] = useState(() => Date.now());

    const status = timerStatus(timer, now);
    const visible = pathname !== "/focus" && (status === "running" || status === "paused");

    // Only while it counts. A paused cycle needs no tick: its number is frozen by definition.
    useEffect(() => {
        if (status !== "running" || !visible) return;
        const id = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(id);
    }, [status, visible]);

    if (!visible || !timer) return null;

    const paused = status === "paused";

    return (
        <Link
            to="/focus"
            aria-label={t("FocusRunningHub")}
            title={t("FocusRunningHub")}
            /*
             * Bottom centre, above the bottom bar (z-40) and below the modal layer (110). Centred
             * horizontally rather than cornered, so it never sits under the assistant's bubble
             * (z-60); `bottom-24` clears the bar on phones.
             */
            className="fixed bottom-24 left-1/2 z-[65] flex -translate-x-1/2 items-center gap-2.5 rounded-full border border-border bg-surface px-4 py-2.5 shadow-lg transition-transform hover:scale-[1.03] lg:bottom-8"
            data-testid="focus-running-hub"
        >
            <span
                className={`flex h-7 w-7 items-center justify-center rounded-full ${
                    paused ? "bg-surface-2 text-text-2" : "bg-accent text-on-accent"
                }`}
            >
                {paused ? (
                    <Pause size={14} aria-hidden="true" />
                ) : (
                    <Timer size={14} aria-hidden="true" />
                )}
            </span>

            <span className="flex flex-col leading-tight">
                <span
                    className={`font-mono text-[15px] font-semibold tabular-nums ${
                        paused ? "text-text-3" : "text-text"
                    }`}
                    data-testid="focus-running-hub-remaining"
                >
                    {formatRemaining(remainingMs(timer, now))}
                </span>
                <span
                    className="text-[10.5px] font-medium uppercase tracking-[0.06em] text-text-3"
                    data-testid="focus-running-hub-kind"
                >
                    {paused ? t("FocusPause") : t(CYCLE_LABEL_KEY[timer.kind])}
                </span>
            </span>
        </Link>
    );
}
