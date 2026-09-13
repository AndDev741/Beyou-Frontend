import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { DailyBriefing, BriefingOpenItem } from "@beyou/types/briefing/briefing";
import { renderWithProviders } from "../../../test/test-utils";
import DailyBriefingDialog from "./DailyBriefingDialog";

/**
 * The dialog's rendering rules.
 *
 * Assertions read raw i18n keys, matching the rest of this suite: the test setup does not
 * load a translation bundle, so `t("X")` renders `X`. That is deliberate house convention —
 * it keeps the tests about which message was chosen rather than about how it was worded.
 *
 * These are the ones that would be wrong in a way nobody notices: a skipped item counted as
 * outstanding, a finished day that still shows a worklist, an XP value quietly rounded out
 * of existence. The interaction rules (auto-advance, optimistic removal) live in
 * `@beyou/state`'s own suite, where they are pure.
 */

const item = (over: Partial<BriefingOpenItem> = {}): BriefingOpenItem => ({
    snapshotId: "snap-1",
    snapshotCheckId: "check-1",
    date: "2026-09-12",
    routineId: "routine-1",
    routineName: "Morning",
    itemType: "HABIT",
    itemName: "Stretch",
    itemIconId: "lucide:activity",
    sectionName: "Warm-up",
    xpIfCheckedNow: 8.4,
    ...over,
});

const briefing = (over: Partial<DailyBriefing> = {}): DailyBriefing => ({
    date: "2026-09-13",
    yesterday: {
        date: "2026-09-12",
        hadRoutine: true,
        complete: false,
        doneCount: 2,
        skippedCount: 1,
        xpEarned: 34,
        openItems: [item()],
        focusCycles: 0,
        moodLevel: null,
    },
    today: {
        scheduledItemCount: 5,
        scheduledToday: true,
        currentStreak: 4,
        bestStreak: 9,
        goalsApproaching: [],
        recovery: null,
    },
    narrative: { status: "READY", todayLines: ["Two things need you before noon."], yesterdayLines: [] },
    seenAt: null,
    ...over,
});

const render = (value: DailyBriefing, onResolve = vi.fn()) =>
    renderWithProviders(
        <DailyBriefingDialog
            briefing={value}
            isOpen
            onClose={vi.fn()}
            onResolve={onResolve}
            pendingId={null}
            locale="en-US"
        />,
    );

test("lists the open items and states what a late check is worth", () => {
    render(briefing());

    const rows = screen.getAllByTestId("briefing-open-item");
    expect(rows).toHaveLength(1);
    expect(within(rows[0]).getByText("Stretch")).toBeInTheDocument();
    // Rounded for display, never floored away: 8.4 must not pick the "no XP left" message.
    expect(within(rows[0]).getByText("BriefingWorthNow")).toBeInTheDocument();
    expect(within(rows[0]).queryByText("BriefingWorthNothingNow")).not.toBeInTheDocument();
});

/** A skip is an answer the user already gave. It belongs in the summary, not in the list. */
test("counts skips in the summary rather than in the worklist", () => {
    render(briefing());

    expect(screen.getAllByTestId("briefing-open-item")).toHaveLength(1);
    expect(screen.getByText("BriefingYesterdaySummary")).toBeInTheDocument();
});

test("a finished yesterday shows the closed state and no worklist", () => {
    render(
        briefing({
            yesterday: {
                date: "2026-09-12",
                hadRoutine: true,
                complete: true,
                doneCount: 5,
                skippedCount: 0,
                xpEarned: 70,
                openItems: [],
                focusCycles: 1,
                moodLevel: 4,
            },
        }),
    );

    expect(screen.queryByTestId("briefing-open-item")).not.toBeInTheDocument();
    expect(screen.getByTestId("briefing-yesterday-empty")).toBeInTheDocument();
});

/**
 * A day nothing was scheduled on is not a day the user succeeded at, and not one they
 * failed. It gets its own message, and specifically not the congratulatory one.
 */
test("a day with no routine is not reported as a finished day", () => {
    render(
        briefing({
            yesterday: {
                date: "2026-09-12",
                hadRoutine: false,
                complete: false,
                doneCount: 0,
                skippedCount: 0,
                xpEarned: 0,
                openItems: [],
                focusCycles: 0,
                moodLevel: null,
            },
        }),
    );

    const empty = screen.getByTestId("briefing-yesterday-empty");
    expect(within(empty).getByText("BriefingNoRoutineTitle")).toBeInTheDocument();
    // Specifically NOT the congratulatory one.
    expect(within(empty).queryByText("BriefingYesterdayEmptyTitle")).not.toBeInTheDocument();
});

test("checking a row reports the item and the outcome", async () => {
    const onResolve = vi.fn();
    render(briefing(), onResolve);

    await userEvent.click(screen.getByTestId("briefing-check"));

    expect(onResolve).toHaveBeenCalledWith(
        expect.objectContaining({ snapshotCheckId: "check-1" }),
        "checked",
    );
});

test("skipping a row reports it as skipped", async () => {
    const onResolve = vi.fn();
    render(briefing(), onResolve);

    await userEvent.click(screen.getByTestId("briefing-skip"));

    expect(onResolve).toHaveBeenCalledWith(expect.anything(), "skipped");
});

/** An unscheduled day cannot break a streak, and the copy must not imply otherwise. */
test("says nothing is at risk when no routine covers today", () => {
    render(
        briefing({
            today: {
                scheduledItemCount: 0,
                scheduledToday: false,
                currentStreak: 4,
                bestStreak: 9,
                goalsApproaching: [],
                recovery: null,
            },
        }),
    );

    expect(screen.getByText("BriefingNothingScheduled")).toBeInTheDocument();
});

test("older recoverable days stay behind a disclosure", async () => {
    render(
        briefing({
            today: {
                ...briefing().today,
                recovery: {
                    oldestOpenDay: "2026-09-07",
                    daysUntilExpiry: 1,
                    remainingXpPercent: 20,
                    openItems: [item({ snapshotCheckId: "old-1", itemName: "Journal" })],
                },
            },
        }),
    );

    // Collapsed: only yesterday's row is on screen.
    expect(screen.getAllByTestId("briefing-open-item")).toHaveLength(1);

    await userEvent.click(screen.getByTestId("briefing-older-toggle"));

    expect(screen.getAllByTestId("briefing-open-item")).toHaveLength(2);
    expect(screen.getByText("Journal")).toBeInTheDocument();
});

/** One day left is the only genuinely time-critical thing this dialog says. */
test("the last night before a day expires reads as a last chance", () => {
    render(
        briefing({
            today: {
                ...briefing().today,
                recovery: {
                    oldestOpenDay: "2026-09-07",
                    daysUntilExpiry: 1,
                    remainingXpPercent: 20,
                    openItems: [item({ snapshotCheckId: "old-1" })],
                },
            },
        }),
    );

    expect(screen.getByText("BriefingOlderDaysLastChance")).toBeInTheDocument();
    expect(screen.queryByText("BriefingOlderDaysDeadline")).not.toBeInTheDocument();
});

test("a missing narrative renders the fallback line, not an empty panel", () => {
    render(
        briefing({
            narrative: { status: "UNAVAILABLE", todayLines: [], yesterdayLines: [] },
        }),
    );

    expect(screen.getByTestId("briefing-narrative-unavailable")).toBeInTheDocument();
    // And the facts are all still there.
    expect(screen.getByTestId("briefing-today-page")).toBeInTheDocument();
    expect(screen.getAllByTestId("briefing-open-item")).toHaveLength(1);
});

test("a pending narrative shows a skeleton rather than nothing", () => {
    render(
        briefing({
            narrative: { status: "PENDING", todayLines: [], yesterdayLines: [] },
        }),
    );

    expect(screen.getByTestId("briefing-narrative-pending")).toBeInTheDocument();
});

test("the second page can be reached from the bullets", async () => {
    render(briefing());

    expect(screen.getByTestId("briefing-today-page")).toBeInTheDocument();

    await userEvent.click(screen.getByTestId("briefing-bullet-yesterday"));

    expect(await screen.findByTestId("briefing-recap-page")).toBeInTheDocument();
});
