import { useEffect, useRef } from "react";
import {
    createDayWatcher,
    createRefreshRunner,
    type RefreshReason
} from "@beyou/state/sync/autoRefresh";
import { logger } from "../utils/logger";

/** How often the page looks up from what it is doing. Not how often it refetches. */
const TICK_MS = 60_000;

/** The slowest a visible page is allowed to be out of date without any other prompt. */
const DEFAULT_INTERVAL_MS = 5 * 60_000;

export type AutoRefreshOptions = {
    /** Time-based refresh while the tab is visible. Set to 0 to rely on the other two. */
    intervalMs?: number;
    /** False parks the whole thing: no timer, no listeners, no requests. */
    enabled?: boolean;
    /** Asked immediately before each run — say false while something is mid-flight. */
    canRun?: () => boolean;
};

/**
 * Keeps the open page current, without the user asking.
 *
 * Three prompts, and they are deliberately not the same one:
 *
 * Coming back. `visibilitychange` covers switching tabs and unlocking the machine;
 * `focus` covers the browsers that move focus without ever reporting the document
 * hidden. Both funnel into one request, and the runner drops the duplicate.
 *
 * The day turning over. The case that made this worth building: tick off today's
 * routine, go to sleep, come back to the same tab, and yesterday is still there with
 * every box checked. The check is a string comparison against the local calendar day
 * with no network in it, so it can run every minute; the backend derives its own today
 * from the account's timezone, so all this has to do is ask again.
 *
 * Time passing. The catch-all for a tab left open and in view while the phone writes
 * to the same account. Slow on purpose: reads are capped at 60/minute per user and one
 * dashboard load spends six of them, so five minutes leaves the budget alone even with
 * both clients open.
 *
 * Nothing runs while the tab is hidden. That is what keeps a forgotten tab from
 * costing anything at all.
 */
export function useAutoRefresh(
    refresh: (reason: RefreshReason) => Promise<unknown>,
    options: AutoRefreshOptions = {}
): void {
    const { intervalMs = DEFAULT_INTERVAL_MS, enabled = true, canRun } = options;

    // Through refs so a caller can pass an inline arrow without re-arming the timer
    // and the listeners on every render.
    const refreshRef = useRef(refresh);
    refreshRef.current = refresh;
    const canRunRef = useRef(canRun);
    canRunRef.current = canRun;

    useEffect(() => {
        if (!enabled) return;

        const runner = createRefreshRunner(
            (reason) => refreshRef.current(reason),
            {
                canRun: () => (canRunRef.current ? canRunRef.current() : true),
                onError: (error, reason) =>
                    logger.warn(`Background refresh (${reason}) failed`, error)
            }
        );
        const day = createDayWatcher();
        let lastRefreshAt = Date.now();

        const request = (reason: RefreshReason) => {
            void runner.request(reason).then((ran) => {
                if (ran) lastRefreshAt = Date.now();
            });
        };

        const onVisible = () => {
            if (document.visibilityState !== "visible") return;
            // The day may well have turned while the tab was hidden. Consuming the flip
            // here keeps the tick below from asking a second time for the same reason.
            request(day.hasFlipped() ? "dayChange" : "foreground");
        };

        const tick = () => {
            if (document.visibilityState !== "visible") return;
            if (day.hasFlipped()) {
                request("dayChange");
                return;
            }
            if (intervalMs > 0 && Date.now() - lastRefreshAt >= intervalMs) {
                request("interval");
            }
        };

        document.addEventListener("visibilitychange", onVisible);
        window.addEventListener("focus", onVisible);
        const timer = window.setInterval(tick, TICK_MS);

        return () => {
            document.removeEventListener("visibilitychange", onVisible);
            window.removeEventListener("focus", onVisible);
            window.clearInterval(timer);
        };
    }, [enabled, intervalMs]);
}
