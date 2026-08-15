import { describe, expect, test, vi } from "vitest";
import { createDayWatcher, createRefreshRunner, localDayKey } from "./autoRefresh";

describe("localDayKey", () => {
    test("reads the device's own calendar day", () => {
        expect(localDayKey(new Date(2026, 7, 15, 23, 59))).toBe("2026-08-15");
    });

    test("pads single-digit months and days", () => {
        expect(localDayKey(new Date(2026, 0, 5, 12, 0))).toBe("2026-01-05");
    });

    /**
     * Local rather than UTC, and this is the case that decides it: late evening in São
     * Paulo is already tomorrow in UTC, so a UTC key would call the day over while the
     * person is still living it. The day is theirs, not Greenwich's.
     *
     * Asserted through the local getters instead of against a real timezone, because a
     * test that only fails when the machine running it happens to sit west of Greenwich
     * is a test that passes in CI for the wrong reason.
     */
    test("reads the local calendar, not the UTC one", () => {
        const lateEveningInSaoPaulo = {
            getFullYear: () => 2026,
            getMonth: () => 7,
            getDate: () => 15,
            // The same instant, already past midnight in UTC.
            toISOString: () => "2026-08-16T01:00:00.000Z"
        } as Date;

        expect(localDayKey(lateEveningInSaoPaulo)).toBe("2026-08-15");
    });
});

describe("createRefreshRunner", () => {
    test("runs the refresh and reports that it did", async () => {
        const run = vi.fn().mockResolvedValue(undefined);
        const runner = createRefreshRunner(run);

        await expect(runner.request("foreground")).resolves.toBe(true);
        expect(run).toHaveBeenCalledWith("foreground");
    });

    /**
     * Coming back to a tab after midnight fires foreground and dayChange within a frame
     * of each other. Answering both means two rounds of requests to arrive at exactly
     * the same screen.
     */
    test("ignores a second request while the first is still in flight", async () => {
        let release: () => void = () => {};
        const run = vi.fn(() => new Promise<void>((resolve) => { release = resolve; }));
        const runner = createRefreshRunner(run);

        const first = runner.request("foreground");
        const second = runner.request("dayChange");

        await expect(second).resolves.toBe(false);
        expect(run).toHaveBeenCalledTimes(1);
        expect(runner.isRunning()).toBe(true);

        release();
        await first;
        expect(runner.isRunning()).toBe(false);
    });

    test("accepts the next request once the previous one finished", async () => {
        const run = vi.fn().mockResolvedValue(undefined);
        const runner = createRefreshRunner(run);

        await runner.request("foreground");
        await runner.request("interval");

        expect(run).toHaveBeenCalledTimes(2);
    });

    /**
     * A check-in is optimistic and carries an XP animation over the top of it. A
     * refresh landing mid-flight rewrites the state the animation is describing.
     */
    test("skips entirely while the caller says it is busy", async () => {
        const run = vi.fn().mockResolvedValue(undefined);
        const runner = createRefreshRunner(run, { canRun: () => false });

        await expect(runner.request("interval")).resolves.toBe(false);
        expect(run).not.toHaveBeenCalled();
    });

    /**
     * Nobody asked for this request, so nobody should hear about it failing. A toast
     * for an action the user did not take is noise, and the page keeps showing the last
     * data it had rather than an error.
     */
    test("swallows a failure and lives to try again", async () => {
        const onError = vi.fn();
        const run = vi.fn()
            .mockRejectedValueOnce(new Error("offline"))
            .mockResolvedValueOnce(undefined);
        const runner = createRefreshRunner(run, { onError });

        await expect(runner.request("foreground")).resolves.toBe(false);
        expect(onError).toHaveBeenCalledWith(expect.any(Error), "foreground");
        expect(runner.isRunning()).toBe(false);

        // The failure did not wedge it.
        await expect(runner.request("interval")).resolves.toBe(true);
    });
});

describe("createDayWatcher", () => {
    test("says nothing while the day stands still", () => {
        let clock = new Date(2026, 7, 15, 9, 0);
        const watcher = createDayWatcher(() => clock);

        expect(watcher.hasFlipped()).toBe(false);
        clock = new Date(2026, 7, 15, 23, 59);
        expect(watcher.hasFlipped()).toBe(false);
    });

    /** The tab left open overnight: same page, same session, different day. */
    test("reports the flip exactly once", () => {
        let clock = new Date(2026, 7, 15, 23, 59);
        const watcher = createDayWatcher(() => clock);

        clock = new Date(2026, 7, 16, 0, 1);
        expect(watcher.hasFlipped()).toBe(true);
        // Asking again is not a second day.
        expect(watcher.hasFlipped()).toBe(false);
        expect(watcher.current()).toBe("2026-08-16");
    });

    test("catches a flip that skipped days, as a sleeping laptop does", () => {
        let clock = new Date(2026, 7, 15, 22, 0);
        const watcher = createDayWatcher(() => clock);

        clock = new Date(2026, 7, 18, 8, 0);
        expect(watcher.hasFlipped()).toBe(true);
        expect(watcher.current()).toBe("2026-08-18");
    });
});
