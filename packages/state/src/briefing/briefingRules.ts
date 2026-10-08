/**
 * When the Daily Briefing opens, and what happens to it while it is open.
 *
 * Shared because there are two clients and they would drift. "Should this dialog appear" is
 * the kind of rule that gets a subtly different answer on each platform within a month of
 * shipping, and the difference is invisible until somebody complains that the phone nags
 * them and the web does not.
 *
 * Everything here is pure. The server owns the facts and owns `seenAt`; this owns the
 * judgement calls that sit between the response and the screen.
 */

import type {
    DailyBriefing,
    BriefingGoal,
    BriefingNarrative,
    BriefingOpenItem,
} from '@beyou/types/briefing/briefing';
import { briefingWorthShowing } from '@beyou/types/briefing/briefing';

/**
 * The right panel's two pages.
 *
 * There is no auto-advance, and that is a decision rather than an omission. A timed flip
 * competes with the one thing the panel is for: the prose arrives from an LLM whenever it
 * arrives, so a reader who has just started the page is exactly the person most likely to be
 * moved off it. The pager below is the only thing that changes the page, and it only moves
 * when somebody asks it to.
 */
export type BriefingPage = 'today' | 'yesterday';

export const BRIEFING_PAGES: BriefingPage[] = ['today', 'yesterday'];

export type BriefingGateInput = {
    briefing: DailyBriefing | null;
    /** True while the onboarding tutorial or the AI wizard owns the screen. */
    tutorialActive?: boolean;
    /** True once the user has closed it in this session, so it cannot reopen on a refetch. */
    dismissedThisSession?: boolean;
    /**
     * The user asked for it back, from the configuration screen.
     *
     * Overrides both "already seen" and "closed in this session", because those exist to stop
     * the dialog appearing UNASKED and this is the opposite. It does NOT override
     * {@link briefingWorthShowing}: asking to see a briefing that says nothing should show
     * nothing, not an empty modal.
     */
    forceOpen?: boolean;
};

/**
 * Whether to put the dialog on screen.
 *
 * Four ways to answer no, and each of them exists because of a specific way this feature
 * could become an annoyance:
 *
 * The server already knows it was seen. `seenAt` is a column and not local storage, so
 * closing the dialog on a phone closes it on the web. That is the whole reason the `seen`
 * route exists.
 *
 * There is nothing to say. A modal that greets somebody every morning with "nothing
 * happened" trains them to dismiss it unread, and then it is dead on the mornings it
 * matters. An account with no yesterday, no goals near due and nothing scheduled gets
 * silence.
 *
 * Something else owns the screen. The onboarding tutorial and the AI wizard both run full
 * overlays on the dashboard; a second dialog over the top is not a race worth winning. A
 * brand new account has no yesterday anyway.
 *
 * The user already closed it here. The dashboard refetches on focus and on the day turning,
 * and without this the dialog would reappear behind the user's own dismissal while the
 * `seen` write was still in flight.
 *
 * The tutorial is the only one of those that `forceOpen` cannot override. Someone who closed
 * the dialog by accident and asked for it back from the configuration screen is owed it, so
 * that request beats both "already seen" and "closed this session". It does not beat "there
 * is nothing to say", because the answer to asking for an empty briefing is an empty screen
 * and not an empty modal.
 */
export function shouldOpenBriefing({
    briefing,
    tutorialActive = false,
    dismissedThisSession = false,
    forceOpen = false,
}: BriefingGateInput): boolean {
    if (!briefing) return false;
    if (tutorialActive) return false;
    if (!forceOpen) {
        if (dismissedThisSession) return false;
        if (briefing.seenAt) return false;
    }
    return briefingWorthShowing(briefing);
}

/**
 * The briefing with one open item resolved, wherever it was.
 *
 * Applied optimistically the moment the user checks or skips something, so the row leaves
 * the list under their finger instead of after a round trip. The item may be in yesterday's
 * list or in the collapsed older-days list, and the caller does not have to know which.
 *
 * The counts move with it: a check becomes a done and a skip becomes a skip, so the
 * summary line above the list stays honest while the request is still out. Returns the same
 * object when nothing matched, so a caller can skip a re-render.
 */
export function resolveOpenItem(
    briefing: DailyBriefing,
    snapshotCheckId: string,
    outcome: 'checked' | 'skipped',
): DailyBriefing {
    const inYesterday = (briefing.yesterday?.openItems ?? []).some(
        (item) => item.snapshotCheckId === snapshotCheckId,
    );
    const inRecovery =
        briefing.today?.recovery?.openItems.some(
            (item) => item.snapshotCheckId === snapshotCheckId,
        ) ?? false;

    if (!inYesterday && !inRecovery) return briefing;

    const without = (items: BriefingOpenItem[]) =>
        items.filter((item) => item.snapshotCheckId !== snapshotCheckId);

    const recovery = briefing.today?.recovery ?? null;
    const remainingRecovery = recovery ? without(recovery.openItems) : [];

    return {
        ...briefing,
        yesterday: {
            ...briefing.yesterday,
            openItems: inYesterday
                ? without(briefing.yesterday.openItems)
                : briefing.yesterday.openItems,
            doneCount:
                inYesterday && outcome === 'checked'
                    ? briefing.yesterday.doneCount + 1
                    : briefing.yesterday.doneCount,
            skippedCount:
                inYesterday && outcome === 'skipped'
                    ? briefing.yesterday.skippedCount + 1
                    : briefing.yesterday.skippedCount,
        },
        today: {
            ...briefing.today,
            // An emptied window loses its affordance entirely rather than collapsing to an
            // empty accordion, which is the same rule the server applies when it builds one.
            recovery:
                !recovery || remainingRecovery.length === 0
                    ? null
                    : { ...recovery, openItems: remainingRecovery },
        },
    };
}

/**
 * Everything still open, yesterday first and older days after, oldest last.
 *
 * One list because the two panels render the same row component, and the ordering is the
 * one the user cares about: the day they are most likely to actually remember comes first.
 */
export function allOpenItems(briefing: DailyBriefing): BriefingOpenItem[] {
    return [
        ...(briefing.yesterday?.openItems ?? []),
        ...(briefing.today?.recovery?.openItems ?? []),
    ];
}

/** One past day's worth of still-open items. */
export type BriefingDayGroup = {
    /** `yyyy-MM-dd`. */
    date: string;
    items: BriefingOpenItem[];
};

/**
 * The older-days list, grouped by the day each item belongs to, oldest first.
 *
 * Yesterday's list needs none of this: every row in it is yesterday, and the panel heading
 * already says so. The recovery list is the opposite — it can span the whole backfill window,
 * and a row there reading only "Morning, worth 3 XP" cannot be answered. "Did I do this?" is a
 * question about a DAY. Someone remembers last Monday, not an isolated habit floating free of
 * one.
 *
 * Grouped rather than stamping the date on every row, because the list is long by nature (a
 * week of a full routine is dozens of items) and thirty-five repetitions of the same six dates
 * is noise you have to read past rather than structure you can scan.
 *
 * Oldest first, matching the order the server already sends and the deadline the panel is
 * warning about: the day nearest to falling out of the window is the one worth acting on.
 */
export function groupOpenItemsByDay(items: BriefingOpenItem[]): BriefingDayGroup[] {
    const byDate = new Map<string, BriefingOpenItem[]>();
    for (const item of items ?? []) {
        const existing = byDate.get(item.date);
        if (existing) existing.push(item);
        else byDate.set(item.date, [item]);
    }
    return [...byDate.entries()]
        .map(([date, group]) => ({ date, items: group }))
        .sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Whether the recovery hint should read as urgent.
 *
 * One day left means tonight is the last chance, which is the only genuinely time-critical
 * thing this dialog says. Anything longer is information, not a deadline, and styling it as
 * one would make the real deadline unrecognisable when it arrives.
 */
export function recoveryIsUrgent(briefing: DailyBriefing): boolean {
    const recovery = briefing.today?.recovery ?? null;
    return recovery !== null && recovery.daysUntilExpiry <= 1;
}

/**
 * The goals the dialog shows: `goalsAhead`, or the older two-week list from a server that
 * predates it.
 *
 * The fallback is for the gap between deploys, not for a design that keeps both. Mobile
 * builds ship on their own schedule, so for a while a new app can meet an old server.
 */
export function briefingGoals(briefing: DailyBriefing): BriefingGoal[] {
    return briefing.today?.goalsAhead ?? briefing.today?.goalsApproaching ?? [];
}

/**
 * How long to wait before each ask for the prose, in milliseconds.
 *
 * About seventy seconds in ten requests. The server stops holding the first request at eight
 * seconds and lets the call finish on its own, and in production that call lands somewhere
 * after that, almost always inside a minute. Spaced out rather than every two seconds because
 * every ask spends the same read budget the dashboard's lists use, and the panel reads fine
 * while it waits.
 */
export const NARRATIVE_POLL_DELAYS_MS: readonly number[] = [
    2000, 3000, 4000, 5000, 6000, 8000, 10000, 10000, 12000, 12000,
];

/** What the panel falls back to when the prose never came. */
export const NARRATIVE_GAVE_UP: BriefingNarrative = {
    status: 'UNAVAILABLE',
    todayLines: [],
    yesterdayLines: [],
};

/** The briefing with its prose replaced, everything the user changed meanwhile kept. */
export function withNarrative(briefing: DailyBriefing, narrative: BriefingNarrative): DailyBriefing {
    return { ...briefing, narrative };
}

/**
 * Asks for the prose until it is settled, then reports it once.
 *
 * This is what was missing. The first `GET /daily-briefing` answers PENDING when the model
 * takes longer than eight seconds, the server keeps the call running and stores the result,
 * and nothing ever asked again: every narration in production landed READY in its row and
 * none reached a screen. The dialog opens once a day, so "the next open" that was meant to
 * find it does not exist.
 *
 * A failed ask (network, a 429) counts as still pending and the schedule carries on. When the
 * schedule runs out the panel is told the prose is unavailable, so the skeleton always ends.
 * Returns a cancel function for the caller's effect cleanup; nothing is reported after it is
 * called.
 */
export function pollNarrative(
    fetchNarrative: () => Promise<BriefingNarrative | null>,
    onSettled: (narrative: BriefingNarrative) => void,
    delays: readonly number[] = NARRATIVE_POLL_DELAYS_MS,
): () => void {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const step = (index: number) => {
        if (cancelled) return;
        if (index >= delays.length) {
            onSettled(NARRATIVE_GAVE_UP);
            return;
        }
        timer = setTimeout(async () => {
            if (cancelled) return;
            const narrative = await fetchNarrative().catch(() => null);
            if (cancelled) return;
            if (narrative && narrative.status !== 'PENDING') {
                onSettled(narrative);
                return;
            }
            step(index + 1);
        }, delays[index]);
    };

    step(0);
    return () => {
        cancelled = true;
        if (timer !== undefined) clearTimeout(timer);
    };
}

/** How loud a goal's pace line should be. Each app maps it to its own theme tokens. */
export type GoalPaceTone = 'success' | 'danger' | 'flame' | 'muted';

export type GoalPaceMessage = {
    key: string;
    params?: Record<string, string | number>;
    tone: GoalPaceTone;
};

/**
 * The line under a goal's bar: which translation key, with what, in which tone.
 *
 * Shared because it is a judgement two apps would word differently within a month. The
 * verdict itself comes from the server; this only picks the sentence. Null when there is
 * nothing honest to say: a goal from a server older than the pace fields, or one "behind"
 * on a zero target, which has no daily amount to ask for.
 *
 * @param formatNumber the app's locale formatter for the per-day amount
 */
export function goalPaceMessage(
    goal: BriefingGoal,
    formatNumber: (value: number) => string,
): GoalPaceMessage | null {
    const perDay = goal.requiredPerDay;
    switch (goal.pace) {
        case 'REACHED':
            return { key: 'BriefingGoalPaceReached', tone: 'success' };
        case 'OVERDUE':
            return { key: 'BriefingGoalPaceOverdue', tone: 'danger' };
        case 'BEHIND':
            return perDay != null
                ? {
                      key: 'BriefingGoalPaceBehind',
                      params: { perDay: formatNumber(perDay), unit: goal.unit },
                      tone: 'flame',
                  }
                : null;
        case 'ON_TRACK':
            return perDay != null
                ? {
                      key: 'BriefingGoalPaceOnTrack',
                      params: { perDay: formatNumber(perDay), unit: goal.unit },
                      tone: 'muted',
                  }
                : { key: 'BriefingGoalPaceOnTrackPlain', tone: 'muted' };
        default:
            return null;
    }
}

/**
 * Whether the bar should carry a tick at `expectedPercent`. Only while there is still time
 * to be on or off the line: a met or lapsed goal has no pace left to compare.
 */
export function showsExpectedPace(goal: BriefingGoal): boolean {
    return (goal.pace === 'BEHIND' || goal.pace === 'ON_TRACK') && typeof goal.expectedPercent === 'number';
}
