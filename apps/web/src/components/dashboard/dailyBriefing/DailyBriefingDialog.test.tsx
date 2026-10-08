import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { DailyBriefing, BriefingGoal, BriefingOpenItem } from "@beyou/types/briefing/briefing";
import type { MoodEntry } from "@beyou/types/mood/mood";
import { getMoodEntries, saveMoodEntry, setMoodLevel } from "@beyou/api/mood/moodApi";
import { clearMoodEntries } from "@beyou/state";
import store from "../../../redux/store";
import { renderWithProviders } from "../../../test/test-utils";
import DailyBriefingDialog from "./DailyBriefingDialog";

// The carousel reads yesterday's and today's mood itself. Mocked at the module so each case
// says which days exist, and so a write can be asserted by the day it lands on.
vi.mock("@beyou/api/mood/moodApi", () => ({
    getMoodEntries: vi.fn(),
    setMoodLevel: vi.fn(),
    saveMoodEntry: vi.fn(),
}));

const mood = (over: Partial<MoodEntry> = {}): MoodEntry => ({
    id: "mood-1",
    date: "2026-09-12",
    mood: 4,
    note: null,
    updatedAt: "2026-09-12T21:00:00Z",
    ...over,
});

beforeEach(() => {
    // renderWithProviders shares the app's store, so a day picked in one case would
    // otherwise already be "today's entry" in the next.
    store.dispatch(clearMoodEntries());
    vi.mocked(getMoodEntries).mockReset().mockResolvedValue({ success: [] });
    vi.mocked(setMoodLevel).mockReset();
    vi.mocked(saveMoodEntry).mockReset();
});

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
        goalsAhead: [],
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
                goalsAhead: [],
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

/**
 * The reason the older list is grouped at all: a row there says only its section name and what
 * it is worth, and neither answers "did I do this?". The day is what somebody remembers.
 */
test("the older list heads each day with its date", async () => {
    render(
        briefing({
            today: {
                ...briefing().today,
                recovery: {
                    oldestOpenDay: "2026-09-07",
                    daysUntilExpiry: 3,
                    remainingXpPercent: 40,
                    openItems: [
                        item({ snapshotCheckId: "old-1", itemName: "Journal", date: "2026-09-07" }),
                        item({ snapshotCheckId: "old-2", itemName: "Walk", date: "2026-09-09" }),
                    ],
                },
            },
        }),
    );

    await userEvent.click(screen.getByTestId("briefing-older-toggle"));

    // By testId, because the deadline line above the list names the oldest day too — that
    // duplication is correct, so the assertion has to be precise rather than the UI quieter.
    const oldest = screen.getByTestId("briefing-day-2026-09-07");
    const later = screen.getByTestId("briefing-day-2026-09-09");
    expect(oldest).toHaveTextContent(/Sep 7/);
    expect(later).toHaveTextContent(/Sep 9/);
});

/** Only the day about to fall out of the window is flagged. */
test("marks the expiring day and no other", async () => {
    render(
        briefing({
            today: {
                ...briefing().today,
                recovery: {
                    oldestOpenDay: "2026-09-07",
                    daysUntilExpiry: 1,
                    remainingXpPercent: 20,
                    openItems: [
                        item({ snapshotCheckId: "old-1", date: "2026-09-07" }),
                        item({ snapshotCheckId: "old-2", date: "2026-09-09" }),
                    ],
                },
            },
        }),
    );

    await userEvent.click(screen.getByTestId("briefing-older-toggle"));

    expect(screen.getAllByText("BriefingDayExpiring")).toHaveLength(1);
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

/**
 * Nothing advances this on its own any more, so the tabs are the only way through. That makes
 * this the case that matters most about the right panel.
 */
test("the recap page is reached from the tabs, and only from the tabs", async () => {
    render(briefing());

    expect(screen.getByTestId("briefing-today-page")).toBeInTheDocument();

    await userEvent.click(screen.getByTestId("briefing-bullet-yesterday"));

    expect(await screen.findByTestId("briefing-recap-page")).toBeInTheDocument();
});

const goal = (over: Partial<BriefingGoal> = {}): BriefingGoal => ({
    id: "goal-1",
    name: "Read 12 books",
    iconId: "lucide:book",
    currentValue: 3,
    targetValue: 12,
    unit: "books",
    endDate: "2026-10-01",
    daysRemaining: 18,
    percentComplete: 25,
    remainingValue: 9,
    requiredPerDay: 0.5,
    expectedPercent: 70,
    pace: "BEHIND",
    ...over,
});

/** The future half: goals from goalsAhead, each with the pace the server decided. */
test("shows the goals ahead with their pace and where a steady pace would be", () => {
    const value = briefing();
    value.today = { ...value.today, goalsAhead: [goal()] };
    render(value);

    expect(screen.getByText("BriefingGoalsAheadHeading")).toBeInTheDocument();
    expect(screen.getByText("Read 12 books")).toBeInTheDocument();
    expect(screen.getByTestId("briefing-goal-pace")).toHaveTextContent("BriefingGoalPaceBehind");
    expect(screen.getByTestId("briefing-goal-expected")).toHaveStyle({ left: "70%" });
});

/** A goal reached but not marked done is XP waiting; a lapsed one has no pace to tick. */
test("a met target points at completion and draws no pace tick", () => {
    const value = briefing();
    value.today = {
        ...value.today,
        goalsAhead: [goal({ pace: "REACHED", requiredPerDay: null, percentComplete: 100 })],
    };
    render(value);

    expect(screen.getByTestId("briefing-goal-pace")).toHaveTextContent("BriefingGoalPaceReached");
    expect(screen.queryByTestId("briefing-goal-expected")).not.toBeInTheDocument();
});

/** Yesterday's journal comes from the mood API, with the privacy line under it. */
test("the recap page shows yesterday's mood and journal", async () => {
    vi.mocked(getMoodEntries).mockResolvedValue({
        success: [mood({ note: "Long day, good talk with my sister." })],
    });
    render(briefing());

    await userEvent.click(screen.getByTestId("briefing-bullet-yesterday"));

    expect(await screen.findByTestId("briefing-mood-yesterday")).toBeInTheDocument();
    expect(screen.getByText("Long day, good talk with my sister.")).toBeInTheDocument();
    expect(screen.getByText("BriefingJournalPrivate")).toBeInTheDocument();
    expect(getMoodEntries).toHaveBeenCalledWith({ from: "2026-09-12", to: "2026-09-13" }, expect.anything());
});

/** A face lands on the briefing's own day, through the PATCH that cannot touch a note. */
test("picking a face records today's mood without touching the journal", async () => {
    vi.mocked(setMoodLevel).mockResolvedValue({ success: mood({ date: "2026-09-13", mood: 5 }) });
    render(briefing());

    const face = await screen.findByTestId("briefing-mood-face-5");
    await vi.waitFor(() => expect(face).toBeEnabled());
    await userEvent.click(face);

    expect(setMoodLevel).toHaveBeenCalledWith("2026-09-13", 5, expect.anything());
    expect(saveMoodEntry).not.toHaveBeenCalled();
});

/**
 * The note editor only exists once today's entry has been read, and it opens on the text
 * already there. Otherwise a quick line here would PUT over a longer entry written elsewhere.
 */
test("the note opens on what is already written and saves it with the mood", async () => {
    vi.mocked(getMoodEntries).mockResolvedValue({
        success: [mood({ id: "today", date: "2026-09-13", mood: 3, note: "Written on the phone" })],
    });
    vi.mocked(saveMoodEntry).mockResolvedValue({
        success: mood({ id: "today", date: "2026-09-13", mood: 3, note: "Written on the phone, and more" }),
    });
    render(briefing());

    await userEvent.click(await screen.findByTestId("briefing-mood-note-toggle"));
    const note = screen.getByTestId("briefing-mood-note");
    expect(note).toHaveValue("Written on the phone");

    await userEvent.type(note, ", and more");
    await userEvent.click(screen.getByTestId("briefing-mood-note-save"));

    expect(saveMoodEntry).toHaveBeenCalledWith(
        "2026-09-13",
        { mood: 3, note: "Written on the phone, and more" },
        expect.anything(),
    );
});

test("there is no note to write before a mood exists for today", async () => {
    render(briefing());

    expect(await screen.findByTestId("briefing-mood-face-1")).toBeInTheDocument();
    expect(screen.queryByTestId("briefing-mood-note-toggle")).not.toBeInTheDocument();
});
