/**
 * The policy behind "pick up what changed while you were away".
 *
 * Two clients write to the same account, so a page that loaded once and never looked
 * again is showing a guess. The worst version of it has nothing to do with two
 * devices: check off the day's tasks on the web, sleep, come back to the same tab, and
 * yesterday is still on screen — every box ticked, the new day nowhere in sight. The
 * page was right when it loaded and has been wrong ever since.
 *
 * What lives here is the part that is the same on both platforms. The events are not:
 * the browser has `visibilitychange`, a phone has `AppState`, and each app wires its
 * own. What they share is when a refresh is allowed to happen and what happens when it
 * fails, and that belongs in one place rather than copied twice.
 */

export type RefreshReason = "foreground" | "dayChange" | "interval";

/**
 * The calendar day as this device sees it, `YYYY-MM-DD`.
 *
 * Local, not UTC: the day that matters is the one the person believes it is, and for
 * anybody west of Greenwich a UTC day flips in the middle of their evening. The
 * backend derives its own today from the account's timezone — this only decides WHEN
 * to go and ask.
 */
export function localDayKey(now: Date = new Date()): string {
    const year = now.getFullYear();
    const month = `${now.getMonth() + 1}`.padStart(2, "0");
    const day = `${now.getDate()}`.padStart(2, "0");
    return `${year}-${month}-${day}`;
}

export type RefreshRunnerOptions = {
    /** Told about failures instead of the user. See below for why. */
    onError?: (error: unknown, reason: RefreshReason) => void;
    /** Asked before every run: a false answer skips it silently. */
    canRun?: () => boolean;
};

export type RefreshRunner = {
    /** Resolves true when the refresh actually ran and succeeded. */
    request: (reason: RefreshReason) => Promise<boolean>;
    isRunning: () => boolean;
};

/**
 * Runs a refresh, at most one at a time, and never in the user's face.
 *
 * Three rules, all of them about what NOT to do:
 *
 * Never two at once. Returning to a tab at midnight fires foreground and dayChange
 * within a frame of each other, and a page that answers both doubles its traffic to
 * arrive at the same state.
 *
 * Never against a page that is busy. A routine check-in is optimistic and carries an
 * XP animation and possibly a celebration over the top; a refresh landing in the
 * middle rewrites the state underneath all of it. `canRun` is how a caller says "not
 * right now".
 *
 * Never a visible failure. Nobody asked for this request. A toast for something the
 * user did not do is noise, and a spinner is worse — it takes a page that was showing
 * correct data and makes it look broken. A failed background refresh leaves the last
 * good data exactly where it was and tries again on the next trigger.
 */
export function createRefreshRunner(
    run: (reason: RefreshReason) => Promise<unknown>,
    options: RefreshRunnerOptions = {}
): RefreshRunner {
    let running = false;

    return {
        isRunning: () => running,
        async request(reason: RefreshReason): Promise<boolean> {
            if (running) return false;
            if (options.canRun && !options.canRun()) return false;

            running = true;
            try {
                await run(reason);
                return true;
            } catch (error) {
                options.onError?.(error, reason);
                return false;
            } finally {
                running = false;
            }
        }
    };
}

export type DayWatcher = {
    /** True exactly once per flip: asking again gives false until the next one. */
    hasFlipped: () => boolean;
    current: () => string;
};

/**
 * Watches for the calendar day changing under a page that never closed.
 *
 * This is the cheap half of staying current. A day flip is a local comparison with no
 * network in it, so it can be checked often, and it is the one moment when the whole
 * screen is guaranteed stale rather than merely possibly stale. Time-based polling
 * exists for everything else and can afford to be slow precisely because this covers
 * the case that actually bites.
 */
export function createDayWatcher(now: () => Date = () => new Date()): DayWatcher {
    let last = localDayKey(now());

    return {
        hasFlipped(): boolean {
            const current = localDayKey(now());
            if (current === last) return false;
            last = current;
            return true;
        },
        current: () => last
    };
}
